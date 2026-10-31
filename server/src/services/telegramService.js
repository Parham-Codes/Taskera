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
const sendTelegramHttpRequest = async ({ token, targetChatId, message, replyMarkup }) => {
  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, currentQueueConfig.requestTimeoutMs);

    try {
      const requestPayload = {
        chat_id: targetChatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      };

      if (replyMarkup) {
        requestPayload.reply_markup = replyMarkup;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload),
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
export const sendTelegramMessage = async ({ botToken, chatId, message, replyMarkup }) => {
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
    sendTelegramHttpRequest({ token, targetChatId, message, replyMarkup })
  );
};

/**
 * Persian translations for task statuses and priorities
 */
const STATUS_LABELS_FA = {
  todo: 'در انتظار انجام',
  'in-progress': 'در حال انجام',
  review: 'در حال بررسی',
  completed: 'تکمیل شده',
};

const formatStatusFA = (status) => {
  if (!status) return '';
  return STATUS_LABELS_FA[status] || status;
};

const PRIORITY_BADGES_FA = {
  urgent: '🔴 فوری (Urgent)',
  high: '🟠 بالا (High)',
  low: '🟢 پایین (Low)',
  medium: '🔵 متوسط (Medium)',
};

/**
 * Send a verification/test message to confirm telegram credentials
 */
export const sendTelegramTestMessage = async ({ botToken, chatId, userName }) => {
  const dateStr = new Date().toLocaleString('fa-IR');
  const message = [
    `🚀 <b>اتصال با موفقیت برقرار شد!</b>`,
    ``,
    `<blockquote>سلام ${escapeHtml(userName || 'کاربر')} گرامی 👋`,
    `ربات تلگرام Taskera به حساب کاربری شما متصل شد. از این پس اعلان‌های ایجاد تسک، تخصیص وظایف، تغییر وضعیت و نظرات را فوراً در این صفحه دریافت خواهید کرد.</blockquote>`,
    ``,
    `───────────────`,
    `🕒 ${dateStr} • <b>Taskera</b>`,
  ].join('\n');

  return sendTelegramMessage({ botToken, chatId, message });
};

/**
 * Helper to determine workspace display information and target URL
 */
export const resolveWorkspaceDetails = ({ task, organizationName, clientUrl: customClientUrl } = {}) => {
  let baseClientUrl =
    (customClientUrl && customClientUrl.trim()) ||
    (process.env.APP_URL && process.env.APP_URL.trim()) ||
    (process.env.CLIENT_URL && process.env.CLIENT_URL.trim()) ||
    'https://parham-codes.github.io/Taskera';

  // Normalize trailing slash
  baseClientUrl = baseClientUrl.replace(/\/+$/, '');

  // If pointing to github.io without /Taskera subpath, append /Taskera
  if (baseClientUrl.includes('github.io') && !baseClientUrl.endsWith('/Taskera')) {
    baseClientUrl = `${baseClientUrl}/Taskera`;
  }

  const orgId = task?.organizationId?._id || task?.organizationId;
  const orgName =
    organizationName ||
    (task?.organizationId && typeof task.organizationId === 'object' ? task.organizationId.name : null);

  if (orgId) {
    const displayName = orgName ? `تیم ${orgName}` : 'تیم (فضای تیمی)';
    const targetUrl = `${baseClientUrl}/teams/${orgId}`;
    const linkText = orgName
      ? `ورود به فضای تیم (${orgName}) در تسکرا`
      : 'ورود به فضای تیم در تسکرا';

    return {
      isTeam: true,
      workspaceLabel: displayName,
      targetUrl,
      linkText,
    };
  }

  return {
    isTeam: false,
    workspaceLabel: 'فضای شخصی (Personal Space)',
    targetUrl: `${baseClientUrl}/personal`,
    linkText: 'ورود به فضای شخصی در تسکرا',
  };
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
  organizationName,
  clientUrl,
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

  const priorityBadge = PRIORITY_BADGES_FA[task.priority] || '🔵 متوسط (Medium)';
  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('fa-IR')
    : 'بدون موعد مشخص';

  const workspaceInfo = resolveWorkspaceDetails({ task, organizationName, clientUrl });
  const dateStr = new Date().toLocaleString('fa-IR');

  let messageLines = [];

  if (eventType === 'assigned') {
    messageLines = [
      `🎯 <b>تسک جدید به شما محول شد!</b>`,
      ``,
      `<blockquote>📌 <b>عنوان تسک:</b> ${escapeHtml(task.title)}`,
      `🏢 <b>فضای کاری:</b> ${escapeHtml(workspaceInfo.workspaceLabel)}`,
      `⚡ <b>اولویت:</b> ${priorityBadge}`,
      `📅 <b>موعد انجام:</b> <code>${formattedDueDate}</code>`,
      `👤 <b>محول‌کننده:</b> ${escapeHtml(actorName || 'همکار')}</blockquote>`,
    ];
  } else if (eventType === 'status_changed') {
    const oldLabel = formatStatusFA(oldStatus);
    const newLabel = formatStatusFA(newStatus);
    messageLines = [
      `🔄 <b>تغییر وضعیت تسک</b>`,
      ``,
      `<blockquote>📌 <b>عنوان تسک:</b> ${escapeHtml(task.title)}`,
      `🏢 <b>فضای کاری:</b> ${escapeHtml(workspaceInfo.workspaceLabel)}`,
      `📊 <b>وضعیت:</b> <code>${escapeHtml(oldLabel)}</code> ➔ <code>${escapeHtml(newLabel)}</code>`,
      `👤 <b>تغییردهنده:</b> ${escapeHtml(actorName || 'کاربر')}</blockquote>`,
    ];
  } else {
    // Created
    messageLines = [
      `✨ <b>تسک جدید در تسکرا</b>`,
      ``,
      `<blockquote>📌 <b>عنوان تسک:</b> ${escapeHtml(task.title)}`,
      `🏢 <b>فضای کاری:</b> ${escapeHtml(workspaceInfo.workspaceLabel)}`,
      `⚡ <b>اولویت:</b> ${priorityBadge}`,
      `📅 <b>موعد انجام:</b> <code>${formattedDueDate}</code>`,
      actorName ? `👤 <b>ایجادکننده:</b> ${escapeHtml(actorName)}` : null,
      `</blockquote>`,
    ].filter(Boolean);
  }

  if (task.description && task.description.trim()) {
    const previewDesc =
      task.description.length > 220
        ? task.description.substring(0, 217) + '...'
        : task.description;
    messageLines.push(``, `📝 <b>توضیحات:</b>`, `<blockquote>${escapeHtml(previewDesc)}</blockquote>`);
  }

  messageLines.push(
    ``,
    `🚀 <a href="${escapeHtml(workspaceInfo.targetUrl)}"><b>${escapeHtml(workspaceInfo.linkText)} ↗</b></a>`,
    `───────────────`,
    `🕒 ${dateStr} • <b>Taskera</b>`
  );

  const fullMessage = messageLines.filter((l) => l !== null && l !== undefined).join('\n');

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
 * @param {string} [params.organizationName]
 * @param {string} [params.clientUrl]
 * @returns {Promise<{ success: boolean, reason?: string, skipped?: boolean }>}
 */
export const sendTaskReminderTelegram = async ({
  recipientUser,
  task,
  reminderStage,
  dueDateKey,
  organizationName,
  clientUrl,
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

  const priorityBadge = PRIORITY_BADGES_FA[task.priority] || '🔵 متوسط (Medium)';
  const workspaceInfo = resolveWorkspaceDetails({ task, organizationName, clientUrl });
  const dateStr = new Date().toLocaleString('fa-IR');

  const messageLines = [
    headerTitle,
    ``,
    `<blockquote>📌 <b>عنوان تسک:</b> ${escapeHtml(task.title)}`,
    `🏢 <b>فضای کاری:</b> ${escapeHtml(workspaceInfo.workspaceLabel)}`,
    `⚡ <b>اولویت:</b> ${priorityBadge}`,
    `📅 <b>تاریخ سررسید:</b> <code>${escapeHtml(dueDateKey)}</code>`,
    `ℹ️ <i>${stageNotice}</i></blockquote>`,
  ];

  if (task.description && task.description.trim()) {
    const previewDesc =
      task.description.length > 220
        ? task.description.substring(0, 217) + '...'
        : task.description;
    messageLines.push(``, `📋 <b>توضیحات:</b>`, `<blockquote>${escapeHtml(previewDesc)}</blockquote>`);
  }

  messageLines.push(
    ``,
    `🚀 <a href="${escapeHtml(workspaceInfo.targetUrl)}"><b>${escapeHtml(workspaceInfo.linkText)} ↗</b></a>`,
    `───────────────`,
    `⏱️ ارسال خودکار توسط سیستم هوشمند Taskera`
  );

  try {
    return await sendTelegramMessage({
      botToken,
      chatId,
      message: messageLines.filter((l) => l !== null && l !== undefined).join('\n'),
    });
  } catch (error) {
    const cleanReason = sanitizeTelegramErrorMessage(error.message, botToken);
    return { success: false, reason: cleanReason, isConfirmedFailure: false, isUnknown: true };
  }
};

/**
 * Dispatch Telegram notification when a comment is added to a task.
 * Includes commenter name, task title, comment preview, workspace info, and link to the space.
 *
 * @param {Object} params
 * @param {Object} params.recipientUser
 * @param {Object} params.task
 * @param {string} params.commenterName
 * @param {string} params.commentContent
 * @param {string} [params.organizationName]
 * @param {string} [params.clientUrl]
 */
export const notifyTaskCommentOnTelegram = async ({
  recipientUser,
  task,
  commenterName,
  commentContent,
  organizationName,
  clientUrl,
}) => {
  if (!recipientUser?.telegramSettings?.enabled) {
    return { skipped: true, reason: 'NOT_ENABLED' };
  }

  const { botToken, chatId, notifyOnComments } = recipientUser.telegramSettings;

  if (!chatId) {
    return { skipped: true, reason: 'NO_CHAT_ID' };
  }

  if (notifyOnComments === false) {
    return { skipped: true, reason: 'EVENT_MUTED' };
  }

  const cleanComment =
    commentContent && commentContent.length > 300
      ? commentContent.substring(0, 297) + '...'
      : commentContent || '';

  const workspaceInfo = resolveWorkspaceDetails({ task, organizationName, clientUrl });
  const dateStr = new Date().toLocaleString('fa-IR');

  const messageLines = [
    `💬 <b>نظر جدید روی تسک</b>`,
    ``,
    `<blockquote>📌 <b>عنوان تسک:</b> ${escapeHtml(task.title)}`,
    `🏢 <b>فضای کاری:</b> ${escapeHtml(workspaceInfo.workspaceLabel)}`,
    `👤 <b>ارسال‌کننده نظر:</b> ${escapeHtml(commenterName || 'کاربر')}</blockquote>`,
    ``,
    `💬 <b>متن نظر:</b>`,
    `<blockquote>${escapeHtml(cleanComment)}</blockquote>`,
    ``,
    `🚀 <a href="${escapeHtml(workspaceInfo.targetUrl)}"><b>${escapeHtml(workspaceInfo.linkText)} ↗</b></a>`,
    `───────────────`,
    `🕒 ${dateStr} • <b>Taskera</b>`,
  ];

  const fullMessage = messageLines.filter((l) => l !== null && l !== undefined).join('\n');

  try {
    return await sendTelegramMessage({
      botToken,
      chatId,
      message: fullMessage,
    });
  } catch (error) {
    const cleanReason = sanitizeTelegramErrorMessage(error.message, botToken);
    return { success: false, reason: cleanReason, isConfirmedFailure: false, isUnknown: true };
  }
};

/**
 * Retrieve the designated shared bot token for Taskera removal approvals
 */
export const getApprovalBotToken = () => {
  return (
    (process.env.TASKERA_APPROVAL_BOT_TOKEN && process.env.TASKERA_APPROVAL_BOT_TOKEN.trim()) ||
    (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim()) ||
    ''
  );
};

/**
 * Answer an incoming Telegram callback query (acknowledge button click)
 */
export const answerTelegramCallbackQuery = async ({
  botToken,
  callbackQueryId,
  text = '',
  showAlert = false,
}) => {
  const token = (botToken && botToken.trim()) || getApprovalBotToken();
  if (!token || !callbackQueryId) {
    return { success: false, reason: 'MISSING_PARAM', isConfirmedFailure: true };
  }

  const endpoint = `https://api.telegram.org/bot${token}/answerCallbackQuery`;

  return scheduleBotSend(token, async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, currentQueueConfig.requestTimeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: text ? String(text) : undefined,
          show_alert: Boolean(showAlert),
        }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || (data && !data.ok)) {
        const cleanDesc = sanitizeTelegramErrorMessage(data?.description || `HTTP ${response.status}`, token);
        return { success: false, reason: cleanDesc };
      }
      return { success: true, result: data.result };
    } catch (err) {
      const cleanReason = sanitizeTelegramErrorMessage(err.message, token);
      return { success: false, reason: cleanReason };
    } finally {
      clearTimeout(timeoutId);
    }
  });
};

/**
 * Edit message text and inline keyboard in Telegram (e.g. after approval to prevent re-click)
 */
export const editTelegramMessageText = async ({
  botToken,
  chatId,
  messageId,
  text,
  replyMarkup = null,
}) => {
  const token = (botToken && botToken.trim()) || getApprovalBotToken();
  if (!token || !chatId || !messageId || !text) {
    return { success: false, reason: 'MISSING_PARAM', isConfirmedFailure: true };
  }

  const endpoint = `https://api.telegram.org/bot${token}/editMessageText`;

  return scheduleBotSend(token, async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, currentQueueConfig.requestTimeoutMs);

    try {
      const body = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      };
      if (replyMarkup !== null) {
        body.reply_markup = replyMarkup;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || (data && !data.ok)) {
        const cleanDesc = sanitizeTelegramErrorMessage(data?.description || `HTTP ${response.status}`, token);
        return { success: false, reason: cleanDesc };
      }
      return { success: true, result: data.result };
    } catch (err) {
      const cleanReason = sanitizeTelegramErrorMessage(err.message, token);
      return { success: false, reason: cleanReason };
    } finally {
      clearTimeout(timeoutId);
    }
  });
};

/**
 * Dispatch an interactive member removal approval request to the organization Owner
 */
export const sendTelegramRemovalApprovalRequest = async ({
  ownerChatId,
  orgName,
  orgId,
  requesterName,
  memberName,
  memberRole,
  requestId,
  clientUrl: customClientUrl,
}) => {
  const token = getApprovalBotToken();
  if (!token) {
    return { success: false, reason: 'NO_APPROVAL_BOT_TOKEN', isConfirmedFailure: true };
  }
  if (!ownerChatId) {
    return { success: false, reason: 'NO_OWNER_CHAT_ID', isConfirmedFailure: true };
  }

  let baseClientUrl =
    (customClientUrl && customClientUrl.trim()) ||
    (process.env.APP_URL && process.env.APP_URL.trim()) ||
    (process.env.CLIENT_URL && process.env.CLIENT_URL.trim()) ||
    'https://parham-codes.github.io/Taskera';

  baseClientUrl = baseClientUrl.replace(/\/+$/, '');
  if (baseClientUrl.includes('github.io') && !baseClientUrl.endsWith('/Taskera')) {
    baseClientUrl = `${baseClientUrl}/Taskera`;
  }

  const detailUrl = `${baseClientUrl}/teams/${orgId}?memberRemovalRequest=${requestId}`;
  const dateStr = new Date().toLocaleString('fa-IR');
  const roleLabel = memberRole === 'manager' ? 'مدیر (Manager)' : 'عضو عادی (Member)';

  const message = [
    `⚠️ <b>درخواست حذف عضو از سازمان</b>`,
    ``,
    `مدیر سازمان درخواستی برای حذف یک عضو ثبت کرده است:`,
    ``,
    `🏢 <b>سازمان:</b> ${escapeHtml(orgName)}`,
    `👤 <b>درخواست‌دهنده:</b> ${escapeHtml(requesterName)}`,
    `🎯 <b>عضو موردنظر:</b> ${escapeHtml(memberName)} (${roleLabel})`,
    `🕒 <b>زمان ثبت:</b> ${dateStr}`,
    `🆔 <b>شناسه درخواست:</b> <code>${escapeHtml(requestId)}</code>`,
    ``,
    `شما می‌توانید این درخواست را مستقیماً از طریق دکمه زیر تأیید کنید یا جزئیات آن را در اپلیکیشن تسکرا بررسی نمایید.`,
  ].join('\n');

  const replyMarkup = {
    inline_keyboard: [
      [
        {
          text: '✅ تأیید حذف عضو',
          callback_data: `approve_removal:${requestId}`,
        },
      ],
      [
        {
          text: '🔎 مشاهده جزئیات در Taskera',
          url: detailUrl,
        },
      ],
    ],
  };

  return sendTelegramMessage({
    botToken: token,
    chatId: ownerChatId,
    message,
    replyMarkup,
  });
};

