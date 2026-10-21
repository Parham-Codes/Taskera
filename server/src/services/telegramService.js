/**
 * Telegram Notification Service
 * Fully modular and asynchronous service to dispatch Telegram alerts.
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
 * Dispatch a message using the Telegram Bot API
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
    return { success: false, reason: 'NO_BOT_TOKEN' };
  }

  if (!targetChatId) {
    console.warn('[TelegramService] Skipped sending: No chat ID provided.');
    return { success: false, reason: 'NO_CHAT_ID' };
  }

  const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

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
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('[TelegramService] Telegram API error:', data.description);
      return { success: false, reason: data.description };
    }

    return { success: true, result: data.result };
  } catch (error) {
    console.error('[TelegramService] Network/Transport exception:', error.message);
    return { success: false, reason: error.message };
  }
};

/**
 * Send a verification/test message to confirm telegram credentials
 */
export const sendTelegramTestMessage = async ({ botToken, chatId, userName }) => {
  const message = [
    `🚀 <b>اتصال با موفقیت برقرار شد!</b>`,
    `سلام ${escapeHtml(userName || 'کاربر گرامی')} 👋`,
    ``,
    `تنظیمات ربات تلگرام تسک‌منیجر شما با موفقیت ثبت شد. از این پس اعلان‌های مربوط به تسک‌های شما فوراً از این طریق برای شما ارسال خواهد شد.`,
    ``,
    `📅 <i>زمان تست: ${new Date().toLocaleString('fa-IR')}</i>`,
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
  messageLines.push(`⏰ <i>${new Date().toLocaleString('fa-IR')}</i>`);

  const fullMessage = messageLines.filter(Boolean).join('\n');

  return sendTelegramMessage({
    botToken,
    chatId,
    message: fullMessage,
  });
};
