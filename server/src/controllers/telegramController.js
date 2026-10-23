import User from '../models/user.js';
import { sendTelegramTestMessage } from '../services/telegramService.js';
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

    const settings = user.telegramSettings || {
      enabled: false,
      botToken: '',
      chatId: '',
      notifyOnCreated: true,
      notifyOnAssigned: true,
      notifyOnStatusChange: true,
    };

    return successResponse(res, {
      message: 'Telegram settings retrieved successfully',
      data: { settings },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's Telegram notification settings
 */
export const updateTelegramSettings = async (req, res, next) => {
  try {
    const { enabled, botToken, chatId, notifyOnCreated, notifyOnAssigned, notifyOnStatusChange } =
      req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return errorResponse(res, { message: 'User not found', statusCode: 404 });
    }

    user.telegramSettings = {
      enabled: Boolean(enabled),
      botToken: typeof botToken === 'string' ? botToken.trim() : user.telegramSettings?.botToken || '',
      chatId: typeof chatId === 'string' ? chatId.trim() : user.telegramSettings?.chatId || '',
      notifyOnCreated: notifyOnCreated !== undefined ? Boolean(notifyOnCreated) : true,
      notifyOnAssigned: notifyOnAssigned !== undefined ? Boolean(notifyOnAssigned) : true,
      notifyOnStatusChange:
        notifyOnStatusChange !== undefined ? Boolean(notifyOnStatusChange) : true,
    };

    await user.save();

    return successResponse(res, {
      message: 'Telegram settings updated successfully',
      data: { settings: user.telegramSettings },
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

    const targetToken = botToken !== undefined ? botToken : user.telegramSettings?.botToken;
    const targetChatId = chatId !== undefined ? chatId : user.telegramSettings?.chatId;

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
      return errorResponse(res, {
        message: `خطا در ارسال پیام تلگرام: ${result.reason || 'اتصال برقرار نشد'}`,
        statusCode: 400,
      });
    }

    return successResponse(res, {
      message: 'پیام تست با موفقیت به تلگرام شما ارسال شد!',
      data: { result },
    });
  } catch (error) {
    next(error);
  }
};
