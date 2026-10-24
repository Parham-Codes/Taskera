import { runReminderCycle } from './reminderService.js';

let schedulerInterval = null;
let isProcessing = false;

/**
 * Executes a single tick of the reminder scheduler with overlap prevention.
 */
export const triggerSchedulerTick = async () => {
  if (isProcessing) {
    console.log('[ReminderScheduler] Previous cycle is still active. Skipping tick.');
    return null;
  }

  isProcessing = true;
  try {
    const stats = await runReminderCycle();
    if (stats.totalEligible > 0) {
      console.log(
        `[ReminderScheduler] Cycle completed: ${stats.totalEligible} eligible, ` +
          `${stats.sentTelegram} telegram, ${stats.sentInApp} in-app, ` +
          `${stats.skipped} skipped, ${stats.unknown} unknown, ${stats.failed} failed.`
      );
    }
    return stats;
  } catch (error) {
    console.error('[ReminderScheduler] Error during scheduled reminder cycle:', error.message);
    return null;
  } finally {
    isProcessing = false;
  }
};

/**
 * Triggers a reminder cycle on demand (e.g., from internal API endpoint) with overlap prevention.
 * Returns { inProgress: true } if already active, or { success: true, stats } upon completion.
 */
export const triggerManualReminderCycle = async () => {
  if (isProcessing) {
    console.warn('[ReminderScheduler] Manual trigger requested while a cycle is already active. Preventing overlap.');
    return { inProgress: true };
  }

  isProcessing = true;
  try {
    const stats = await runReminderCycle();
    return { success: true, stats };
  } finally {
    isProcessing = false;
  }
};

/**
 * Checks whether an automated or manual reminder cycle is currently running.
 */
export const isSchedulerProcessing = () => isProcessing;

/**
 * Internal test helper to simulate or reset the processing lock state.
 * @param {boolean} val
 */
export const _setSchedulerProcessing = (val) => {
  isProcessing = val;
};

/**
 * Checks whether the recurring in-process scheduler interval is currently active.
 */
export const isSchedulerRunning = () => !!schedulerInterval;

/**
 * Starts the automated recurring task reminder background scheduler.
 * Respects ENABLE_REMINDER_SCHEDULER environment variable.
 * @param {Object} options
 * @param {number} [options.intervalMs=300000] - Interval between ticks in milliseconds (default 5 minutes)
 */
export const startReminderScheduler = ({ intervalMs = 5 * 60 * 1000 } = {}) => {
  if (process.env.ENABLE_REMINDER_SCHEDULER === 'false') {
    console.log('[ReminderScheduler] In-process reminder scheduler is disabled (ENABLE_REMINDER_SCHEDULER=false).');
    return null;
  }

  if (schedulerInterval) {
    console.warn('[ReminderScheduler] Scheduler is already active.');
    return schedulerInterval;
  }

  console.log(`[ReminderScheduler] Starting reminder scheduler (interval: ${intervalMs / 1000}s)`);

  // Run initial check 10 seconds after server start
  setTimeout(() => {
    triggerSchedulerTick();
  }, 10000);

  // Set recurring interval
  schedulerInterval = setInterval(() => {
    triggerSchedulerTick();
  }, intervalMs);

  return schedulerInterval;
};

/**
 * Stops the scheduler cleanly (for graceful server shutdown or test teardown).
 */
export const stopReminderScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[ReminderScheduler] Scheduler stopped cleanly.');
  }
};
