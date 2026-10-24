import { triggerManualReminderCycle } from '../services/reminderScheduler.js';

/**
 * Triggers an isolated reminder evaluation and dispatch cycle via internal authenticated API.
 * Route: POST /api/internal/reminders/run
 */
export const runInternalReminders = async (req, res, next) => {
  try {
    const result = await triggerManualReminderCycle();

    if (result.inProgress) {
      return res.status(409).json({
        success: false,
        message: 'A reminder cycle is already in progress. Overlapping execution was prevented.',
        inProgress: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Reminder cycle executed successfully.',
      timestamp: new Date().toISOString(),
      stats: result.stats,
    });
  } catch (error) {
    next(error);
  }
};
