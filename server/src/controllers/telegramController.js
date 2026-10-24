import User, { sanitizeTelegramSettings } from '../models/user.js';
import {
  sendTelegramTestMessage,
  sanitizeTelegramErrorMessage,
} from '../services/telegramService.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

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
