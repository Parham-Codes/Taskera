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
    .populate('organizationId', 'name slug')
    .populate('assignedTo', 'name email timezone telegramSettings')
    .populate('createdBy', 'name email timezone telegramSettings')
    .lean();

  const eligibleItems = [];

  for (const task of activeTasks) {
    // Recipient rule: Assigned members have precedence; fallback to task creator
    const rawAssignees = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : task.assignedTo ? [task.assignedTo] : [];
    const validAssignees = rawAssignees.filter((a) => a && a._id);
    const recipients =
      validAssignees.length > 0
        ? validAssignees
        : task.createdBy && task.createdBy._id
        ? [task.createdBy]
        : [];

    for (const recipientUser of recipients) {
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

      // If the outcome is already marked UNKNOWN, do NOT blindly redeliver
      if (existing.status === DELIVERY_STATUS.UNKNOWN) {
        return null;
      }

      // Check if the record is currently processing and still fresh
      const isStale =
        existing.status === DELIVERY_STATUS.PROCESSING &&
        Date.now() - new Date(existing.processingStartedAt).getTime() >
          STALE_PROCESSING_THRESHOLD_MS;

      // If a stale processing record crashed during Telegram dispatch, its outcome is unknown
      if (isStale && existing.channel === DELIVERY_CHANNELS.TELEGRAM) {
        try {
          const updateResult = await TaskReminderDelivery.updateOne(
            { _id: existing._id, status: DELIVERY_STATUS.PROCESSING },
            {
              $set: {
                status: DELIVERY_STATUS.UNKNOWN,
                lastError: 'Server stalled or crashed during Telegram dispatch; outcome unknown.',
              },
            }
          );
          if (updateResult && updateResult.matchedCount === 0) {
            console.warn(
              `[ReminderService] Stale processing record for task ${task._id} did not match expected PROCESSING status. Transition to UNKNOWN was not applied; automatic redelivery remains suppressed.`
            );
          } else {
            console.warn(
              `[ReminderService] Stale processing record for task ${task._id} was during Telegram dispatch. Transitioned to UNKNOWN to prevent duplicate delivery.`
            );
          }
        } catch (staleDbErr) {
          console.error(
            `[ReminderService] Database unavailable while updating stale Telegram record to UNKNOWN for task ${task._id} (${staleDbErr.message}). Transition could not be persisted; automatic redelivery remains suppressed.`
          );
        }
        return null;
      }

      const isFailed = existing.status === DELIVERY_STATUS.FAILED;

      // Allow retry if failed or non-telegram stale processing under the max attempt threshold
      if ((isStale || isFailed) && existing.attemptCount < MAX_DELIVERY_ATTEMPTS) {
        // Defensive guard: Telegram deliveries must never be automatically retried
        if (existing.channel === DELIVERY_CHANNELS.TELEGRAM) {
          return null;
        }

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

export const TELEGRAM_DELIVERY_OUTCOME = {
  NOT_ATTEMPTED: 'not_attempted',
  CONFIRMED_SUCCESS: 'confirmed_success',
  CONFIRMED_REJECTION: 'confirmed_rejection',
  UNKNOWN: 'unknown',
};

/**
 * Dispatches the reminder with Telegram-first routing and In-App notification fallback.
 *
 * @param {Object} item
 * @param {TaskReminderDelivery} deliveryRecord
 * @returns {Promise<{ channel: string, success: boolean, unknown?: boolean, error?: string }>}
 */
export const dispatchReminder = async (item, deliveryRecord) => {
  const { task, recipientUser, reminderStage, dueDateKey } = item;
  let deliveredChannel = null;
  let telegramOutcome = TELEGRAM_DELIVERY_OUTCOME.NOT_ATTEMPTED;

  try {
    // 1. Evaluate Telegram delivery if recipient has it configured and enabled
    if (isTelegramConfigured(recipientUser)) {
      // Record channel attempt in progress before dispatch (never overwrite an already-sent record)
      await TaskReminderDelivery.updateOne(
        { _id: deliveryRecord._id, status: { $ne: DELIVERY_STATUS.SENT } },
        { $set: { channel: DELIVERY_CHANNELS.TELEGRAM } }
      );
      deliveryRecord.channel = DELIVERY_CHANNELS.TELEGRAM;

      const telegramResult = await sendTaskReminderTelegram({
        recipientUser,
        task,
        reminderStage,
        dueDateKey,
      });

      // Track the external Telegram outcome immediately before performing any database writes
      if (telegramResult.success) {
        telegramOutcome = TELEGRAM_DELIVERY_OUTCOME.CONFIRMED_SUCCESS;
        deliveredChannel = DELIVERY_CHANNELS.TELEGRAM;
      } else if (telegramResult.isUnknown) {
        telegramOutcome = TELEGRAM_DELIVERY_OUTCOME.UNKNOWN;
      } else {
        telegramOutcome = TELEGRAM_DELIVERY_OUTCOME.CONFIRMED_REJECTION;
      }

      if (telegramOutcome === TELEGRAM_DELIVERY_OUTCOME.UNKNOWN) {
        // Network timeout / transport error: delivery outcome is ambiguous.
        // DO NOT resend and DO NOT fall back to in-app to prevent double delivery.
        const errorMsg = `Telegram delivery outcome unknown (transport error): ${telegramResult.reason}`;
        await TaskReminderDelivery.updateOne(
          { _id: deliveryRecord._id, status: { $nin: [DELIVERY_STATUS.SENT, DELIVERY_STATUS.UNKNOWN] } },
          {
            $set: {
              status: DELIVERY_STATUS.UNKNOWN,
              channel: DELIVERY_CHANNELS.TELEGRAM,
              lastError: errorMsg,
            },
          }
        );
        deliveryRecord.status = DELIVERY_STATUS.UNKNOWN;
        deliveryRecord.channel = DELIVERY_CHANNELS.TELEGRAM;
        deliveryRecord.lastError = errorMsg;

        console.warn(
          `[ReminderService] Telegram delivery for task ${task._id} produced an UNKNOWN outcome: ${telegramResult.reason}. Marked as UNKNOWN to prevent duplicate delivery.`
        );

        return {
          channel: DELIVERY_CHANNELS.TELEGRAM,
          success: false,
          unknown: true,
        };
      } else if (telegramOutcome === TELEGRAM_DELIVERY_OUTCOME.CONFIRMED_REJECTION) {
        // Confirmed Telegram API rejection (e.g. Chat not found, bot blocked)
        console.warn(
          `[ReminderService] Telegram confirmed failure for task ${task._id} (${telegramResult.reason || 'unknown'}). Safely falling back to in-app notification.`
        );
      }
    }

    // 2. In-App Notification Fallback (if Telegram was not configured, disabled, or confirmed rejected)
    if (!deliveredChannel) {
      const isDueToday = reminderStage === REMINDER_STAGES.DUE_TODAY;
      const title = isDueToday
        ? 'یادآوری: سررسید تسک امروز است'
        : 'یادآوری: سررسید تسک فردا است';
      const message = isDueToday
        ? `تسک «${task.title}» امروز باید انجام شود.`
        : `تسک «${task.title}» فردا باید انجام شود.`;

      // Idempotent insertion using reminderDeliveryId as the unique anchor
      try {
        await Notification.findOneAndUpdate(
          { reminderDeliveryId: deliveryRecord._id },
          {
            $setOnInsert: {
              recipient: recipientUser._id,
              sender: null,
              type: NOTIFICATION_TYPES.TASK_REMINDER,
              reminderStage,
              title,
              message,
              taskId: task._id,
              organizationId: task.organizationId || null,
              isRead: false,
              reminderDeliveryId: deliveryRecord._id,
            },
          },
          { upsert: true, returnDocument: 'after' }
        );
      } catch (insertError) {
        if (insertError.code === 11000) {
          // Handled duplicate key error: concurrent worker or previous attempt already inserted it
        } else {
          throw insertError;
        }
      }

      deliveredChannel = DELIVERY_CHANNELS.IN_APP;
    }

    // 3. Mark delivery as successfully completed (conditional update so SENT cannot overwrite another terminal state)
    const completedAt = new Date();
    await TaskReminderDelivery.updateOne(
      { _id: deliveryRecord._id, status: { $ne: DELIVERY_STATUS.SENT } },
      {
        $set: {
          status: DELIVERY_STATUS.SENT,
          channel: deliveredChannel,
          sentAt: completedAt,
          lastError: null,
        },
      }
    );
    deliveryRecord.status = DELIVERY_STATUS.SENT;
    deliveryRecord.channel = deliveredChannel;
    deliveryRecord.sentAt = completedAt;
    deliveryRecord.lastError = null;

    return {
      channel: deliveredChannel,
      success: true,
    };
  } catch (error) {
    // -------------------------------------------------------------------------
    // CRITICAL ERROR HANDLER:
    // Guard against marking potentially delivered Telegram reminders as FAILED!
    // -------------------------------------------------------------------------

    // A. Telegram Confirmed Success:
    // The Telegram message was ALREADY confirmed sent by the Telegram API.
    // We must NEVER mark it as FAILED or allow redelivery.
    if (telegramOutcome === TELEGRAM_DELIVERY_OUTCOME.CONFIRMED_SUCCESS) {
      console.error(
        `[ReminderService] Telegram confirmed success for task ${task._id}, but persisting SENT failed:`,
        error.message
      );
      try {
        await TaskReminderDelivery.updateOne(
          { _id: deliveryRecord._id, status: { $ne: DELIVERY_STATUS.SENT } },
          {
            $set: {
              status: DELIVERY_STATUS.SENT,
              channel: DELIVERY_CHANNELS.TELEGRAM,
              sentAt: new Date(),
              lastError: `Telegram delivered; status update recovered after initial error: ${error.message}`,
            },
          }
        );
        deliveryRecord.status = DELIVERY_STATUS.SENT;
        deliveryRecord.channel = DELIVERY_CHANNELS.TELEGRAM;
      } catch (retryDbErr) {
        // If DB remains unavailable, do NOT execute further writes that could turn it into FAILED.
        // The record remains in PROCESSING with channel: TELEGRAM.
        // Scheduler recovery explicitly ensures channel: TELEGRAM transitions to UNKNOWN, preventing duplicate send.
        console.error(
          `[ReminderService] Database unavailable for task ${task._id}. Leaving record in safe non-retryable state:`,
          retryDbErr.message
        );
      }

      return {
        channel: DELIVERY_CHANNELS.TELEGRAM,
        success: true,
        error: error.message,
      };
    }

    // B. Telegram Outcome Unknown:
    // Transport error / lost response. Telegram may have accepted the message.
    // We must NEVER retry Telegram, NEVER create an in-app fallback, and NEVER mark FAILED.
    if (telegramOutcome === TELEGRAM_DELIVERY_OUTCOME.UNKNOWN) {
      console.error(
        `[ReminderService] Telegram outcome unknown for task ${task._id}, and persistence failed:`,
        error.message
      );
      try {
        await TaskReminderDelivery.updateOne(
          { _id: deliveryRecord._id, status: { $nin: [DELIVERY_STATUS.SENT, DELIVERY_STATUS.UNKNOWN] } },
          {
            $set: {
              status: DELIVERY_STATUS.UNKNOWN,
              channel: DELIVERY_CHANNELS.TELEGRAM,
              lastError: `Telegram outcome unknown: ${error.message}`,
            },
          }
        );
        deliveryRecord.status = DELIVERY_STATUS.UNKNOWN;
        deliveryRecord.channel = DELIVERY_CHANNELS.TELEGRAM;
      } catch (dbErr) {
        console.error(
          `[ReminderService] Database unavailable while saving UNKNOWN state for task ${task._id}:`,
          dbErr.message
        );
      }

      return {
        channel: DELIVERY_CHANNELS.TELEGRAM,
        success: false,
        unknown: true,
        error: error.message,
      };
    }

    // C. Telegram Confirmed Rejection or Not Attempted:
    // Telegram was NOT sent. Failure occurred during in-app creation or persistence.
    // Retrying is safe and idempotent via reminderDeliveryId anchor.
    // Conditionally update so an already-terminal SENT or UNKNOWN state is never overwritten.
    try {
      await TaskReminderDelivery.updateOne(
        { _id: deliveryRecord._id, status: { $nin: [DELIVERY_STATUS.SENT, DELIVERY_STATUS.UNKNOWN] } },
        {
          $set: {
            status: DELIVERY_STATUS.FAILED,
            channel: deliveredChannel || DELIVERY_CHANNELS.IN_APP,
            lastError: error.message,
          },
        }
      );
      deliveryRecord.status = DELIVERY_STATUS.FAILED;
      deliveryRecord.channel = deliveredChannel || DELIVERY_CHANNELS.IN_APP;
      deliveryRecord.lastError = error.message;
    } catch (dbErr) {
      console.error(
        `[ReminderService] Failed to persist FAILED status for task ${task._id}:`,
        dbErr.message
      );
    }

    return {
      channel: deliveredChannel || DELIVERY_CHANNELS.NONE,
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
 * @returns {Promise<{ totalEligible: number, sentTelegram: number, sentInApp: number, skipped: number, unknown: number, failed: number }>}
 */
export const runReminderCycle = async (referenceDate = new Date()) => {
  const stats = {
    totalEligible: 0,
    sentTelegram: 0,
    sentInApp: 0,
    skipped: 0,
    unknown: 0,
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
      } else if (result.unknown) {
        stats.unknown++;
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
