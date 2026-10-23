import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = {
  COMMENT_ADDED: 'comment_added',
  TASK_ASSIGNED: 'task_assigned',
  STATUS_CHANGED: 'status_changed',
  TASK_REMINDER: 'task_reminder',
  GENERAL: 'general',
};

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      default: NOTIFICATION_TYPES.COMMENT_ADDED,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    reminderStage: {
      type: String,
      enum: ['day_before', 'due_today', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for lightning-fast notification retrieval and unread counts
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default Notification;
