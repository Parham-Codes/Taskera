import mongoose from 'mongoose';
import { Notification } from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * Get notifications for logged-in user with unread count
 */
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipient: userId })
        .sort({ createdAt: -1 })
        .limit(40)
        .populate('sender', 'name email avatar')
        .populate('taskId', 'title status priority')
        .lean(),
      Notification.countDocuments({ recipient: userId, isRead: false }),
    ]);

    return successResponse(res, {
      message: 'Notifications retrieved successfully',
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const { notificationId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return errorResponse(res, { message: 'Invalid Notification ID format', statusCode: 400 });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return errorResponse(res, { message: 'Notification not found', statusCode: 404 });
    }

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return successResponse(res, {
      message: 'Notification marked as read',
      data: { notification, unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications as read for logged-in user
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return successResponse(res, {
      message: 'All notifications marked as read',
      data: { unreadCount: 0 },
    });
  } catch (error) {
    next(error);
  }
};
