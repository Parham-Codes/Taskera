/**
 * Telegram Notification Service
 * Fully modular, serialized, and rate-limited asynchronous service to dispatch Telegram alerts.
 */

// Escape HTML characters for safe Telegram HTML parse mode
const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Sanitize error messages and reason strings to prevent any bot token leak
 */
export const sanitizeTelegramErrorMessage = (text, token) => {
  if (!text) return '';
  let clean = String(text);
  if (token && typeof token === 'string' && token.trim().length > 0) {
    clean = clean.split(token.trim()).join('[REDACTED]');
  }
  return clean.replace(/bot\d+:[A-Za-z0-9_-]+/gi, 'bot[REDACTED]');
};

const DEFAULT_QUEUE_CONFIG = {
  chatIntervalMs: 1100, // Minimum delay between messages sent to the same destination chat (~1.1s)
  globalIntervalMs: 35, // Minimum delay between requests per bot token (~28 req/s)
  requestTimeoutMs: 10000, // Outbound fetch timeout (10 seconds)
  maxRetries429: 2, // Maximum number of 429 retries
  maxRetryAfterSec: 30, // Capped maximum retry_after duration
};

let currentQueueConfig = { ...DEFAULT_QUEUE_CONFIG };

// Map of chatKey -> Promise<void>
const chatQueues = new Map();
// Map of chatKey -> number (timestamp when last message completed)
const chatLastSendTimes = new Map();
// Map of token -> Promise<void> for pacing requests per bot token
const botSendQueues = new Map();
// Map of token -> number (timestamp when last request was initiated)
const botLastSendTimes = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Test & inspection helpers
 */
export const _getTelegramQueueConfig = () => ({ ...currentQueueConfig });

export const _getDefaultTelegramQueueConfig = () => ({ ...DEFAULT_QUEUE_CONFIG });

export const _setTelegramQueueConfig = (overrides = {}) => {
  currentQueueConfig = { ...currentQueueConfig, ...overrides };
};

export const _resetTelegramQueueConfig = () => {
  currentQueueConfig = { ...DEFAULT_QUEUE_CONFIG };
};

export const _clearTelegramQueueState = () => {
  chatQueues.clear();
  chatLastSendTimes.clear();
  botSendQueues.clear();
  botLastSendTimes.clear();
};

/**
 * Coordinate with global rate limiter per bot token
 */
const scheduleBotSend = async (token, fn) => {
  const prevBotPromise = botSendQueues.get(token) || Promise.resolve();

  let releaseTurn;
  const currentTurnPromise = new Promise((resolve) => {
    releaseTurn = resolve;
  });

  botSendQueues.set(token, currentTurnPromise);

  try {
    try {
      await prevBotPromise;
    } catch {
      // Prior failures in bot queue do not block subsequent messages
    }

    const lastBotTime = botLastSendTimes.get(token) || 0;
    const nowBot = Date.now();
    const botElapsed = nowBot - lastBotTime;
    if (botElapsed < currentQueueConfig.globalIntervalMs) {
      await sleep(currentQueueConfig.globalIntervalMs - botElapsed);
    }
    botLastSendTimes.set(token, Date.now());

    return await fn();
  } finally {
    releaseTurn();
    if (botSendQueues.get(token) === currentTurnPromise) {
      botSendQueues.delete(token);
    }
  }
};

/**
 * Perform single HTTP dispatch with timeout, 429 retry policy, and sanitized error logging
 */
const sendTelegramHttpRequest = async ({ token, targetChatId, message }) => {
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, currentQueueConfig.requestTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // Handle Telegram HTTP 429 (Too Many Requests)
      if (response.status === 429) {
        const retryAfterSec = Math.max(
          1,
          (data && data.parameters && Number(data.parameters.retry_after)) || 1
        );
        const cleanDesc = sanitizeTelegramErrorMessage(
          data?.description || 'Too Many Requests (429)',
          token
        );

        // If retry_after exceeds configured automatic wait limit, never retry early
        if (retryAfterSec > currentQueueConfig.maxRetryAfterSec) {
          const reason = sanitizeTelegramErrorMessage(
            `Rate limit retry_after (${retryAfterSec}s) exceeds maximum automatic wait limit (${currentQueueConfig.maxRetryAfterSec}s)`,
            token
          );
          console.warn(
            sanitizeTelegramErrorMessage(
              `[TelegramService] ${reason}. Not retrying early to respect Telegram rate limit.`,
              token
            )
          );
          return {
            success: false,
            reason,
            isConfirmedFailure: true,
            rateLimited: true,
            retryAfterSec,
          };
        }

        if (attempt < currentQueueConfig.maxRetries429) {
          attempt += 1;
          console.warn(
            sanitizeTelegramErrorMessage(
              `[TelegramService] Rate limited (HTTP 429). Retrying after ${retryAfterSec}s (attempt ${attempt}/${currentQueueConfig.maxRetries429})...`,
              token
            )
          );
          await sleep(retryAfterSec * 1000);

          // Pacing before the retry request
          const lastBot = botLastSendTimes.get(token) || 0;
          const elapsedBot = Date.now() - lastBot;
          if (elapsedBot < currentQueueConfig.globalIntervalMs) {
            await sleep(currentQueueConfig.globalIntervalMs - elapsedBot);
          }
          botLastSendTimes.set(token, Date.now());
          continue;
        }

        console.error(
          sanitizeTelegramErrorMessage(
            `[TelegramService] Telegram rate limit (HTTP 429) retries exhausted (${attempt}/${currentQueueConfig.maxRetries429}): ${cleanDesc}`,
            token
          )
        );
        return {
          success: false,
          reason: cleanDesc,
          isConfirmedFailure: true,
          rateLimited: true,
          retryAfterSec,
        };
      }

      // Handle Telegram API failure (HTTP error or !data.ok)
      if (!response.ok || (data && !data.ok)) {
        const description =
          data?.description ||
          `HTTP ${response.status} ${response.statusText || ''}`.trim();
        const cleanDesc = sanitizeTelegramErrorMessage(description, token);

        // 5xx indicates Telegram server issue - delivery outcome unknown, do not auto-retry
        if (response.status >= 500) {
          console.error(
            sanitizeTelegramErrorMessage(
              `[TelegramService] Telegram server error (${response.status}): ${cleanDesc}`,
              token
            )
          );
          return {
            success: false,
            reason: cleanDesc,
            isConfirmedFailure: false,
            isUnknown: true,
          };
        }

        // 4xx errors are confirmed client/bot rejections (invalid chat ID, bot blocked, etc.)
        console.error(
          sanitizeTelegramErrorMessage(
            `[TelegramService] Telegram API error: ${cleanDesc}`,
            token
          )
        );
        return { success: false, reason: cleanDesc, isConfirmedFailure: true };
      }

      return { success: true, result: data.result };
    } catch (error) {
      const isTimeout =
        error.name === 'AbortError' || error.name === 'TimeoutError';
      const isDns =
        error.code === 'ENOTFOUND' || /getaddrinfo/i.test(error.message || '');
      const isConn =
        error.code === 'ECONNRESET' ||
        error.code === 'ECONNREFUSED' ||
        /fetch failed/i.test(error.message || '');

      let rawReason = error.message || 'Unknown network error';
      if (isTimeout) {
        rawReason = `Request timed out after ${currentQueueConfig.requestTimeoutMs}ms`;
        console.error(
          sanitizeTelegramErrorMessage(
            `[TelegramService] Request timeout (outcome unknown): ${rawReason}`,
            token
          )
        );
      } else if (isDns) {
        rawReason = `DNS resolution failure: ${rawReason}`;
        console.error(
          sanitizeTelegramErrorMessage(
            `[TelegramService] DNS resolution error: ${rawReason}`,
            token
          )
        );
      } else if (isConn) {
        rawReason = `Network transport failure: ${rawReason}`;
        console.error(
          sanitizeTelegramErrorMessage(
            `[TelegramService] Connection/transport error (outcome unknown): ${rawReason}`,
            token
          )
        );
      } else {
        console.error(
          sanitizeTelegramErrorMessage(
            `[TelegramService] Network/Transport exception: ${rawReason}`,
            token
          )
        );
      }

      const cleanReason = sanitizeTelegramErrorMessage(rawReason, token);
      return {
        success: false,
        reason: cleanReason,
        isConfirmedFailure: false,
        isUnknown: true,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }
};

/**
 * Enqueue a message per destination chat with strict serialization and interval pacing
 */
const enqueueChatMessage = async (token, targetChatId, chatKey, sendFn) => {
  const prevChatPromise = chatQueues.get(chatKey) || Promise.resolve();

  let releaseTurn;
  const currentTurnPromise = new Promise((resolve) => {
    releaseTurn = resolve;
  });

  chatQueues.set(chatKey, currentTurnPromise);

  try {
    // 1. Wait for prior message in this chat queue (regardless of success or failure)
    try {
      await prevChatPromise;
    } catch {
      // Prior failure never blocks the next message
    }

    // 2. Enforce minimum per-chat interval
    const lastChatTime = chatLastSendTimes.get(chatKey) || 0;
    const nowChat = Date.now();
    const chatElapsed = nowChat - lastChatTime;
    if (chatElapsed < currentQueueConfig.chatIntervalMs) {
      await sleep(currentQueueConfig.chatIntervalMs - chatElapsed);
    }

    // 3. Coordinate with global bot rate limit before issuing request
    const result = await scheduleBotSend(token, async () => {
      try {
        return await sendFn();
      } finally {
        chatLastSendTimes.set(chatKey, Date.now());
      }
    });

    return result;
  } finally {
    releaseTurn();
    if (chatQueues.get(chatKey) === currentTurnPromise) {
      chatQueues.delete(chatKey);
    }
  }
};

/**
 * Dispatch a message using the Telegram Bot API through the per-chat queue
 * @param {Object} params
 * @param {string} params.botToken - User-specific bot token or fallback default
 * @param {string} params.chatId - Telegram user/group chat ID
 * @param {string} params.message - HTML formatted message body
 */
export const sendTelegramMessage = async ({ botToken, chatId, message }) => {
  const token = (botToken && botToken.trim()) || process.env.TELEGRAM_BOT_TOKEN;
  const targetChatId = chatId && chatId.trim();

  if (!token) {
    console.warn('[TelegramService] Skipped sending: No bot token provided.');
    return { success: false, reason: 'NO_BOT_TOKEN', isConfirmedFailure: true };
  }

  if (!targetChatId) {
    console.warn('[TelegramService] Skipped sending: No chat ID provided.');
    return { success: false, reason: 'NO_CHAT_ID', isConfirmedFailure: true };
  }

  const chatKey = `${token}:${targetChatId}`;
  return enqueueChatMessage(token, targetChatId, chatKey, () =>
    sendTelegramHttpRequest({ token, targetChatId, message })
  );
};

/**
 * Send a verification/test message to confirm telegram credentials
 */
export const sendTelegramTestMessage = async ({ botToken, chatId, userName }) => {
  const message = [
    `🚀 <b>اتصال با موفقیت برقرار شد!</b>`,
    `سلام ${escapeHtml(userName || 'کاربر گرامی')} 👋`,
    ``,
    `تنظیمات ربات تلگرام تسکرا شما با موفقیت ثبت شد. از این پس اعلان‌های مربوط به تسک‌های شما فوراً از این طریق برای شما ارسال خواهد شد.`,
    ``,
    `📅 زمان تست: ${new Date().toLocaleString('fa-IR')}`,
  ].join('\n');

  return sendTelegramMessage({ botToken, chatId, message });
};

/**
 * Formats and dispatches a task creation/assignment notification
 */
export const notifyTaskEventOnTelegram = async ({
  recipientUser,
  task,
  eventType = 'created', // 'created' | 'assigned' | 'status_changed'
  actorName,
  oldStatus,
  newStatus,
}) => {
  if (!recipientUser?.telegramSettings?.enabled) {
    return { skipped: true, reason: 'NOT_ENABLED' };
  }

  const { botToken, chatId, notifyOnCreated, notifyOnAssigned, notifyOnStatusChange } =
    recipientUser.telegramSettings;

  if (!chatId) {
    return { skipped: true, reason: 'NO_CHAT_ID' };
  }

  // Check user event preference
  if (eventType === 'created' && notifyOnCreated === false) {
    return { skipped: true, reason: 'EVENT_MUTED' };
  }
  if (eventType === 'assigned' && notifyOnAssigned === false) {
    return { skipped: true, reason: 'EVENT_MUTED' };
  }
  if (eventType === 'status_changed' && notifyOnStatusChange === false) {
    return { skipped: true, reason: 'EVENT_MUTED' };
  }

  let headerTitle = '📝 <b>تسک جدید ایجاد شد</b>';
  let eventDetail = '';

  if (eventType === 'assigned') {
    headerTitle = '🎯 <b>تسک جدید به شما محول شد!</b>';
    eventDetail = `👤 <b>محول‌کننده:</b> ${escapeHtml(actorName || 'همکار')}\n`;
  } else if (eventType === 'status_changed') {
    headerTitle = '🔄 <b>تغییر وضعیت تسک</b>';
    eventDetail = `👤 <b>توسط:</b> ${escapeHtml(actorName || 'کاربر')}\n📊 <b>از:</b> <code>${escapeHtml(oldStatus || '')}</code> ⬅️ <b>به:</b> <code>${escapeHtml(newStatus || '')}</code>\n`;
  } else {
    eventDetail = actorName ? `👤 <b>سازنده:</b> ${escapeHtml(actorName)}\n` : '';
  }

  const priorityBadge =
    task.priority === 'urgent'
      ? '🔴 فوری (Urgent)'
      : task.priority === 'high'
      ? '🟠 بالا (High)'
      : task.priority === 'low'
      ? '🟢 پایین (Low)'
      : '🔵 متوسط (Medium)';

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('fa-IR')
    : 'بدون موعد مشخص';

  const messageLines = [
    headerTitle,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📌 <b>عنوان تسک:</b> ${escapeHtml(task.title)}`,
    eventDetail.trim(),
    `⚡ <b>اولویت:</b> ${priorityBadge}`,
    `📅 <b>موعد انجام:</b> ${formattedDueDate}`,
  ];

  if (task.description && task.description.trim()) {
    const previewDesc =
      task.description.length > 140
        ? task.description.substring(0, 137) + '...'
        : task.description;
    messageLines.push(`📋 <b>توضیحات:</b> ${escapeHtml(previewDesc)}`);
  }

  messageLines.push(`━━━━━━━━━━━━━━━━━━━━`);
  messageLines.push(`⏰ ${new Date().toLocaleString('fa-IR')}`);

  const fullMessage = messageLines.filter(Boolean).join('\n');

  return sendTelegramMessage({
    botToken,
    chatId,
    message: fullMessage,
  });
};

/**
 * Checks whether Telegram notifications are fully configured and enabled for a user
 * @param {Object} recipientUser
 * @returns {boolean}
 */
export const isTelegramConfigured = (recipientUser) => {
  if (!recipientUser?.telegramSettings?.enabled) return false;
  if (recipientUser.telegramSettings.notifyOnReminders === false) return false;
  const chatId = recipientUser.telegramSettings?.chatId?.trim();
  if (!chatId) return false;
  const token =
    (recipientUser.telegramSettings?.botToken &&
      recipientUser.telegramSettings.botToken.trim()) ||
    process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !token.trim()) return false;
  return true;
};

/**
 * Dedicated dispatch function for task due date reminders via Telegram.
 * Reuses sendTelegramMessage and HTML escaping while isolating failure cases.
 *
 * @param {Object} params
 * @param {Object} params.recipientUser - Populated user model with telegramSettings
 * @param {Object} params.task - Populated task document
 * @param {string} params.reminderStage - 'day_before' | 'due_today'
 * @param {string} params.dueDateKey - 'YYYY-MM-DD'
 * @returns {Promise<{ success: boolean, reason?: string, skipped?: boolean }>}
 */
export const sendTaskReminderTelegram = async ({
  recipientUser,
  task,
  reminderStage,
  dueDateKey,
}) => {
  if (!isTelegramConfigured(recipientUser)) {
    return {
      success: false,
      skipped: true,
      isConfirmedFailure: true,
      reason: 'TELEGRAM_NOT_CONFIGURED_OR_DISABLED',
    };
  }

  const { botToken, chatId } = recipientUser.telegramSettings;
  const isDueToday = reminderStage === 'due_today';

  const headerTitle = isDueToday
    ? '🚨 <b>یادآوری: سررسید تسک امروز است!</b>'
    : '⏰ <b>یادآوری: سررسید تسک فردا است</b>';

  const stageNotice = isDueToday
    ? 'امروز آخرین مهلت تعیین‌شده برای انجام این تسک می‌باشد.'
    : 'فردا موعد مقرر برای تحویل و انجام این تسک است.';

  const priorityBadge =
    task.priority === 'urgent'
      ? '🔴 فوری (Urgent)'
      : task.priority === 'high'
      ? '🟠 بالا (High)'
      : task.priority === 'low'
      ? '🟢 پایین (Low)'
      : '🔵 متوسط (Medium)';

  const messageLines = [
    headerTitle,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📌 <b>عنوان تسک:</b> ${escapeHtml(task.title)}`,
    `⚡ <b>اولویت:</b> ${priorityBadge}`,
    `📅 <b>تاریخ سررسید:</b> <code>${escapeHtml(dueDateKey)}</code>`,
    `ℹ️ ${stageNotice}`,
  ];

  if (task.description && task.description.trim()) {
    const previewDesc =
      task.description.length > 140
        ? task.description.substring(0, 137) + '...'
        : task.description;
    messageLines.push(`📋 <b>توضیحات:</b> ${escapeHtml(previewDesc)}`);
  }

  messageLines.push(`━━━━━━━━━━━━━━━━━━━━`);
  messageLines.push(`⏱️ ارسال خودکار توسط سیستم هوشمند Taskera`);

  try {
    return await sendTelegramMessage({
      botToken,
      chatId,
      message: messageLines.filter(Boolean).join('\n'),
    });
  } catch (error) {
    const cleanReason = sanitizeTelegramErrorMessage(error.message, botToken);
    return { success: false, reason: cleanReason, isConfirmedFailure: false, isUnknown: true };
  }
};
