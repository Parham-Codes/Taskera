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
          `${stats.skipped} skipped, ${stats.failed} failed.`
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
 * Starts the automated recurring task reminder background scheduler.
 * @param {Object} options
 * @param {number} [options.intervalMs=300000] - Interval between ticks in milliseconds (default 5 minutes)
 */
export const startReminderScheduler = ({ intervalMs = 5 * 60 * 1000 } = {}) => {
  if (schedulerInterval) {
    console.warn('[ReminderScheduler] Scheduler is already active.');
    return;
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
