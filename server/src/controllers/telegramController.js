import crypto from 'node:crypto';
import User, { sanitizeTelegramSettings } from '../models/user.js';
import { Organization, OrganizationMember, ActivityLog, ACTIVITY_ACTIONS } from '../models/index.js';
import {
  sendTelegramTestMessage,
  sanitizeTelegramErrorMessage,
  answerTelegramCallbackQuery,
  editTelegramMessageText,
} from '../services/telegramService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const escapeHtml = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Get current user's Telegram notification settings
 */
export const getTelegramSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('telegramSettings').lean();
    if (!user) {
      return errorResponse(res, { message: 'User not found', statusCode: 404 });
    }

    return successResponse(res, {
      message: 'Telegram settings retrieved successfully',
      data: {
        settings: sanitizeTelegramSettings(user.telegramSettings),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's Telegram notification settings
 * Supports:
 * - Entering a new token: replaces the saved token
 * - Leaving token blank / undefined: preserves the saved token
 * - Explicit clearing (clearBotToken: true or botToken: null): clears the custom token and switches to default
 */
export const updateTelegramSettings = async (req, res, next) => {
  try {
    const {
      enabled,
      botToken,
      clearBotToken,
      chatId,
      notifyOnCreated,
      notifyOnAssigned,
      notifyOnStatusChange,
      notifyOnReminders,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, { message: 'User not found', statusCode: 404 });
    }

    // Determine target bot token:
    // 1. Explicit clear requested
    // 2. New token entered
    // 3. Otherwise: preserve existing token
    let nextBotToken = user.telegramSettings?.botToken || '';
    if (clearBotToken === true || botToken === null) {
      nextBotToken = '';
    } else if (typeof botToken === 'string' && botToken.trim().length > 0) {
      nextBotToken = botToken.trim();
    }

    user.telegramSettings = {
      enabled: Boolean(enabled),
      botToken: nextBotToken,
      chatId: typeof chatId === 'string' ? chatId.trim() : user.telegramSettings?.chatId || '',
      notifyOnCreated: notifyOnCreated !== undefined ? Boolean(notifyOnCreated) : true,
      notifyOnAssigned: notifyOnAssigned !== undefined ? Boolean(notifyOnAssigned) : true,
      notifyOnStatusChange:
        notifyOnStatusChange !== undefined ? Boolean(notifyOnStatusChange) : true,
      notifyOnReminders:
        notifyOnReminders !== undefined ? Boolean(notifyOnReminders) : true,
    };

    await user.save();

    return successResponse(res, {
      message: 'Telegram settings updated successfully',
      data: {
        settings: sanitizeTelegramSettings(user.telegramSettings),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send a test Telegram notification using provided or stored settings
 */
export const testTelegramNotification = async (req, res, next) => {
  try {
    const { botToken, chatId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, { message: 'User not found', statusCode: 404 });
    }

    // Use newly provided token if non-empty, otherwise use saved custom token
    const targetToken =
      typeof botToken === 'string' && botToken.trim().length > 0
        ? botToken.trim()
        : user.telegramSettings?.botToken || undefined;

    const targetChatId =
      typeof chatId === 'string' && chatId.trim().length > 0
        ? chatId.trim()
        : user.telegramSettings?.chatId;

    if (!targetChatId) {
      return errorResponse(res, {
        message: 'شناسه چت (Chat ID) تلگرام الزامی است.',
        statusCode: 400,
      });
    }

    const result = await sendTelegramTestMessage({
      botToken: targetToken,
      chatId: targetChatId,
      userName: user.name,
    });

    if (!result.success) {
      const cleanReason = sanitizeTelegramErrorMessage(
        result.reason || 'اتصال برقرار نشد',
        targetToken
      );
      return errorResponse(res, {
        message: `خطا در ارسال پیام تلگرام: ${cleanReason}`,
        statusCode: 400,
      });
    }

    return successResponse(res, {
      message: 'پیام تست با موفقیت به تلگرام شما ارسال شد!',
      data: { success: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle incoming Telegram Bot Webhook for interactive removal approvals
 * Route: POST /api/telegram/approval-webhook
 * Validates X-Telegram-Bot-Api-Secret-Token, verifies organization Owner identity,
 * processes the member removal safely, logs activity, and responds to callback query.
 */
export const handleTelegramApprovalWebhook = async (req, res) => {
  try {
    // 1. Validate Webhook Secret Header if configured in environment
    const configuredSecret =
      process.env.TELEGRAM_WEBHOOK_SECRET || process.env.TASKERA_TELEGRAM_WEBHOOK_SECRET;

    if (configuredSecret) {
      const incomingSecret = req.headers['x-telegram-bot-api-secret-token'];
      if (!incomingSecret || typeof incomingSecret !== 'string') {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid or missing Telegram webhook secret token',
        });
      }

      const incomingBuffer = Buffer.from(incomingSecret);
      const configuredBuffer = Buffer.from(configuredSecret);
      if (
        incomingBuffer.length !== configuredBuffer.length ||
        !crypto.timingSafeEqual(incomingBuffer, configuredBuffer)
      ) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: Invalid or missing Telegram webhook secret token',
        });
      }
    }

    const update = req.body;
    if (!update || !update.callback_query) {
      // Return 200 OK for standard updates (e.g. messages/commands) so Telegram does not retry
      return res.status(200).json({ ok: true, ignored: true });
    }

    const { callback_query } = update;
    const callbackQueryId = callback_query.id;
    const data = callback_query.data || '';
    const telegramChatId = String(callback_query.message?.chat?.id || callback_query.from?.id || '');
    const messageId = callback_query.message?.message_id;

    if (!data.startsWith('approve_removal:')) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: 'دستور نامعتبر است.',
        showAlert: false,
      });
      return res.status(200).json({ ok: true });
    }

    const requestId = data.replace('approve_removal:', '').trim();
    if (!requestId) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: 'شناسه درخواست نامعتبر است.',
        showAlert: true,
      });
      return res.status(200).json({ ok: true });
    }

    // 2. Locate member membership with this pending removal request
    const membership = await OrganizationMember.findOne({
      'removalRequest.requestId': requestId,
      'removalRequest.status': 'pending',
    }).populate('userId', 'name email');

    if (!membership) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: '⚠️ این درخواست قبلاً پردازش شده، رد شده یا دیگر معتبر نیست.',
        showAlert: true,
      });

      if (telegramChatId && messageId) {
        await editTelegramMessageText({
          chatId: telegramChatId,
          messageId,
          text: `${callback_query.message?.text || ''}\n\n<i>⚠️ این درخواست قبلاً تعیین تکلیف شده یا نامعتبر است.</i>`,
          replyMarkup: { inline_keyboard: [] },
        });
      }
      return res.status(200).json({ ok: true, message: 'Already processed or invalid' });
    }

    // 3. Locate Organization & verify Owner
    const organization = await Organization.findById(membership.organizationId).lean();
    if (!organization) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: 'سازمان مربوطه یافت نشد.',
        showAlert: true,
      });
      return res.status(200).json({ ok: true });
    }

    const ownerUser = await User.findById(organization.owner)
      .select('name email telegramSettings')
      .lean();

    if (!ownerUser) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: 'مالک سازمان یافت نشد.',
        showAlert: true,
      });
      return res.status(200).json({ ok: true });
    }

    // Strictly verify caller Telegram ID matches the registered Owner's chatId
    const ownerChatId = String(ownerUser.telegramSettings?.chatId || '');
    if (!ownerChatId || ownerChatId !== telegramChatId) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: '⛔ شما دسترسی لازم برای تأیید این درخواست را ندارید (تنها مالک این سازمان مجاز است).',
        showAlert: true,
      });
      return res.status(200).json({ ok: true, unauthorized: true });
    }

    // Verify owner still actively holds the Owner role in this organization
    const activeOwnerMembership = await OrganizationMember.findOne({
      organizationId: organization._id,
      userId: ownerUser._id,
      role: 'owner',
    }).lean();

    if (!activeOwnerMembership) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: '⛔ حساب کاربری در حال حاضر دسترسی مالکیت این سازمان را ندارد.',
        showAlert: true,
      });
      return res.status(200).json({ ok: true, unauthorized: true });
    }

    // Requester cannot approve own request
    if (String(membership.removalRequest.requestedBy) === String(ownerUser._id)) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: 'درخواست‌دهنده نمی‌تواند درخواست خود را تأیید کند.',
        showAlert: true,
      });
      return res.status(200).json({ ok: true });
    }

    // 4. Atomic deletion to prevent concurrent race conditions
    const targetUserId = membership.userId?._id || membership.userId;
    const targetUserName = membership.userId?.name || 'عضو';
    const requesterId = membership.removalRequest.requestedBy;

    const deletedDoc = await OrganizationMember.findOneAndDelete({
      _id: membership._id,
      organizationId: organization._id,
      'removalRequest.requestId': requestId,
      'removalRequest.status': 'pending',
    });

    if (!deletedDoc) {
      await answerTelegramCallbackQuery({
        callbackQueryId,
        text: '⚠️ این درخواست هم‌اکنون پردازش شده یا نامعتبر است.',
        showAlert: true,
      });

      if (telegramChatId && messageId) {
        await editTelegramMessageText({
          chatId: telegramChatId,
          messageId,
          text: `${callback_query.message?.text || ''}\n\n<i>⚠️ این درخواست قبلاً تعیین تکلیف شده یا نامعتبر است.</i>`,
          replyMarkup: { inline_keyboard: [] },
        });
      }
      return res.status(200).json({ ok: true, message: 'Already processed concurrently' });
    }

    await ActivityLog.create({
      organizationId: organization._id,
      actorId: ownerUser._id,
      action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
      details: {
        targetUserId,
        targetUserName,
        requestedBy: requesterId,
        approvedBy: ownerUser._id,
        method: 'telegram_approved',
        requestId,
      },
    });

    // 5. Acknowledge callback query
    await answerTelegramCallbackQuery({
      callbackQueryId,
      text: '✅ عضویت کاربر با موفقیت حذف شد.',
      showAlert: false,
    });

    // 6. Update Telegram message to show approval and remove action buttons
    if (telegramChatId && messageId) {
      const approvedTime = new Date().toLocaleString('fa-IR');
      const updatedText = `${callback_query.message?.text || ''}\n\n✅ <b>این درخواست در تاریخ ${approvedTime} توسط مالک سازمان (${escapeHtml(ownerUser.name)}) تأیید و عضو مربوطه از سازمان حذف شد.</b>`;

      await editTelegramMessageText({
        chatId: telegramChatId,
        messageId,
        text: updatedText,
        replyMarkup: { inline_keyboard: [] },
      });
    }

    return res.status(200).json({ ok: true, removed: true });
  } catch (error) {
    console.error('[TelegramWebhook] Error processing callback:', error);
    return res.status(200).json({ ok: false, error: 'Internal processing error' });
  }
};
