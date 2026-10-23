import mongoose from 'mongoose';

export const REMINDER_STAGES = {
  DAY_BEFORE: 'day_before',
  DUE_TODAY: 'due_today',
};

export const DELIVERY_CHANNELS = {
  TELEGRAM: 'telegram',
  IN_APP: 'in_app',
  NONE: 'none',
};

export const DELIVERY_STATUS = {
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed',
};

const taskReminderDeliverySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dueDateKey: {
      type: String,
      required: true,
      trim: true,
    },
    reminderStage: {
      type: String,
      enum: Object.values(REMINDER_STAGES),
      required: true,
    },
    dedupeKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    channel: {
      type: String,
      enum: Object.values(DELIVERY_CHANNELS),
      default: DELIVERY_CHANNELS.NONE,
    },
    status: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.PROCESSING,
      index: true,
    },
    attemptCount: {
      type: Number,
      default: 1,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    processingStartedAt: {
      type: Date,
      default: Date.now,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

taskReminderDeliverySchema.index({ status: 1, processingStartedAt: 1 });

const TaskReminderDelivery =
  mongoose.models.TaskReminderDelivery ||
  mongoose.model('TaskReminderDelivery', taskReminderDeliverySchema);

export default TaskReminderDelivery;
