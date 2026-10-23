import Task, { TASK_STATUS } from '../models/task.js';
import Notification, { NOTIFICATION_TYPES } from '../models/Notification.js';
import TaskReminderDelivery, {
  REMINDER_STAGES,
  DELIVERY_CHANNELS,
  DELIVERY_STATUS,
} from '../models/TaskReminderDelivery.js';
import {
  getLocalTimeInfo,
  addDaysToDateKey,
  getTaskDueDateKey,
  buildDedupeKey,
} from '../utils/reminderDateUtils.js';
import {
  isTelegramConfigured,
  sendTaskReminderTelegram,
} from './telegramService.js';

// Max attempts allowed per reminder before giving up
const MAX_DELIVERY_ATTEMPTS = 3;

// Stale processing threshold (15 minutes)
const STALE_PROCESSING_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * Identify all tasks that are currently eligible for due date reminders
 * based on the recipient's local time zone and current local hour (>= 9:00 AM).
 *
 * Scans only a bounded window around the reference date to avoid full table scans.
 *
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<Array<Object>>}
 */
export const findEligibleReminders = async (referenceDate = new Date()) => {
  // Bounded window: from -48 hours to +72 hours UTC covers all possible local time zone offsets
  const windowStart = new Date(referenceDate.getTime() - 48 * 3600 * 1000);
  const windowEnd = new Date(referenceDate.getTime() + 72 * 3600 * 1000);

  const activeTasks = await Task.find({
    dueDate: { $gte: windowStart, $lte: windowEnd },
    status: { $ne: TASK_STATUS.COMPLETED },
  })
    .select('title description status priority dueDate createdBy assignedTo organizationId')
    .populate('assignedTo', 'name email timezone telegramSettings')
    .populate('createdBy', 'name email timezone telegramSettings')
    .lean();

  const eligibleItems = [];

  for (const task of activeTasks) {
    // Recipient rule: Assigned member has precedence; fallback to task creator
    const recipientUser = task.assignedTo || task.createdBy;
    if (!recipientUser || !recipientUser._id) {
      continue;
    }

    const recipientTimezone = recipientUser.timezone || 'UTC';
    const localInfo = getLocalTimeInfo(referenceDate, recipientTimezone);

    // Reminders must only be dispatched at or after 09:00 local time
    if (localInfo.hour < 9) {
      continue;
    }

    const taskDueDateKey = getTaskDueDateKey(task.dueDate);
    if (!taskDueDateKey) {
      continue;
    }

    const todayDateKey = localInfo.dateKey;
    const tomorrowDateKey = addDaysToDateKey(todayDateKey, 1);

    let stage = null;
    if (taskDueDateKey === todayDateKey) {
      stage = REMINDER_STAGES.DUE_TODAY;
    } else if (taskDueDateKey === tomorrowDateKey) {
      stage = REMINDER_STAGES.DAY_BEFORE;
    }

    // If task is not due today or tomorrow, it is either overdue or in the future
    if (!stage) {
      continue;
    }

    const dedupeKey = buildDedupeKey(
      task._id,
      recipientUser._id,
      taskDueDateKey,
      stage
    );

    eligibleItems.push({
      task,
      recipientUser,
      reminderStage: stage,
      dueDateKey: taskDueDateKey,
      dedupeKey,
    });
  }

  return eligibleItems;
};

/**
 * Atomically reserve or claim a reminder delivery record.
 * Handles duplicate key constraints and stale processing recovery safely.
 *
 * @param {Object} item
 * @returns {Promise<TaskReminderDelivery|null>} Returns delivery record or null if already delivered/locked
 */
export const claimReminderDelivery = async (item) => {
  const { task, recipientUser, reminderStage, dueDateKey, dedupeKey } = item;

  try {
    const record = await TaskReminderDelivery.create({
      taskId: task._id,
      recipient: recipientUser._id,
      dueDateKey,
      reminderStage,
      dedupeKey,
      status: DELIVERY_STATUS.PROCESSING,
      attemptCount: 1,
      processingStartedAt: new Date(),
    });

    return record;
  } catch (error) {
    if (error.code === 11000) {
      // Record already exists with this dedupeKey
      const existing = await TaskReminderDelivery.findOne({ dedupeKey });
      if (!existing) return null;

      // Never re-process a reminder that was already successfully sent
      if (existing.status === DELIVERY_STATUS.SENT) {
        return null;
      }

      // Check if the record is currently processing and still fresh
      const isStale =
        existing.status === DELIVERY_STATUS.PROCESSING &&
        Date.now() - new Date(existing.processingStartedAt).getTime() >
          STALE_PROCESSING_THRESHOLD_MS;

      const isFailed = existing.status === DELIVERY_STATUS.FAILED;

      // Allow retry if failed or stale and under the max attempt threshold
      if ((isStale || isFailed) && existing.attemptCount < MAX_DELIVERY_ATTEMPTS) {
        const claimed = await TaskReminderDelivery.findOneAndUpdate(
          {
            _id: existing._id,
            status: existing.status,
            attemptCount: existing.attemptCount,
          },
          {
            $set: {
              status: DELIVERY_STATUS.PROCESSING,
              processingStartedAt: new Date(),
            },
            $inc: { attemptCount: 1 },
          },
          { returnDocument: 'after' }
        );

        return claimed;
      }

      return null;
    }

    throw error;
  }
};

/**
 * Dispatches the reminder with Telegram-first routing and In-App notification fallback.
 *
 * @param {Object} item
 * @param {TaskReminderDelivery} deliveryRecord
 * @returns {Promise<{ channel: string, success: boolean }>}
 */
export const dispatchReminder = async (item, deliveryRecord) => {
  const { task, recipientUser, reminderStage, dueDateKey } = item;
  let deliveredChannel = null;

  try {
    // 1. Evaluate Telegram delivery if recipient has it configured and enabled
    if (isTelegramConfigured(recipientUser)) {
      const telegramResult = await sendTaskReminderTelegram({
        recipientUser,
        task,
        reminderStage,
        dueDateKey,
      });

      if (telegramResult.success) {
        deliveredChannel = DELIVERY_CHANNELS.TELEGRAM;
      } else {
        console.warn(
          `[ReminderService] Telegram attempt failed for task ${task._id} (${telegramResult.reason || 'unknown'}). Falling back to in-app notification.`
        );
      }
    }

    // 2. In-App Notification Fallback (if Telegram was not configured, disabled, or failed)
    if (!deliveredChannel) {
      const isDueToday = reminderStage === REMINDER_STAGES.DUE_TODAY;
      const title = isDueToday
        ? 'یادآوری: سررسید تسک امروز است'
        : 'یادآوری: سررسید تسک فردا است';
      const message = isDueToday
        ? `تسک «${task.title}» امروز باید انجام شود.`
        : `تسک «${task.title}» فردا باید انجام شود.`;

      await Notification.create({
        recipient: recipientUser._id,
        sender: null,
        type: NOTIFICATION_TYPES.TASK_REMINDER,
        reminderStage,
        title,
        message,
        taskId: task._id,
        organizationId: task.organizationId || null,
        isRead: false,
      });

      deliveredChannel = DELIVERY_CHANNELS.IN_APP;
    }

    // 3. Mark delivery as successfully completed
    deliveryRecord.status = DELIVERY_STATUS.SENT;
    deliveryRecord.channel = deliveredChannel;
    deliveryRecord.sentAt = new Date();
    deliveryRecord.lastError = null;
    await deliveryRecord.save();

    return {
      channel: deliveredChannel,
      success: true,
    };
  } catch (error) {
    deliveryRecord.status = DELIVERY_STATUS.FAILED;
    deliveryRecord.lastError = error.message;
    await deliveryRecord.save();

    return {
      channel: DELIVERY_CHANNELS.NONE,
      success: false,
      error: error.message,
    };
  }
};

/**
 * Runs a single complete cycle of reminder evaluation and dispatch.
 * Bounded, idempotent, and error-isolated per task.
 *
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<{ totalEligible: number, sentTelegram: number, sentInApp: number, skipped: number, failed: number }>}
 */
export const runReminderCycle = async (referenceDate = new Date()) => {
  const stats = {
    totalEligible: 0,
    sentTelegram: 0,
    sentInApp: 0,
    skipped: 0,
    failed: 0,
  };

  const eligibleItems = await findEligibleReminders(referenceDate);
  stats.totalEligible = eligibleItems.length;

  for (const item of eligibleItems) {
    try {
      const claim = await claimReminderDelivery(item);
      if (!claim) {
        stats.skipped++;
        continue;
      }

      const result = await dispatchReminder(item, claim);
      if (result.success) {
        if (result.channel === DELIVERY_CHANNELS.TELEGRAM) {
          stats.sentTelegram++;
        } else if (result.channel === DELIVERY_CHANNELS.IN_APP) {
          stats.sentInApp++;
        }
      } else {
        stats.failed++;
      }
    } catch (taskError) {
      console.error(
        `[ReminderService] Error processing reminder for task ${item.task?._id}:`,
        taskError.message
      );
      stats.failed++;
    }
  }

  return stats;
};
