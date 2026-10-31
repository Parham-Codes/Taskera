import { Task } from '../../models/index.js';
import { TaskError } from './taskErrors.js';
import {
  assertValidObjectId,
  verifyTaskTimeTrackingAccess,
} from './taskAccessHelper.js';

/**
 * Service for Task Time Tracking, Stopwatch, and Work Sessions.
 */
export const taskTimeService = {
  /**
   * Start time tracking session for a task or specific subtask
   */
  async startTimeTracking({ taskId, user, subtaskId = null }) {
    assertValidObjectId(taskId, 'Task ID');
    if (subtaskId) {
      assertValidObjectId(subtaskId, 'Subtask ID');
    }

    const task = await Task.findById(taskId);
    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    await verifyTaskTimeTrackingAccess(task, user.id);

    if (subtaskId && !task.subtasks.id(subtaskId)) {
      throw new TaskError('Subtask not found', 404);
    }

    // Check if user already has an active running timer on this task
    let activeLog = task.timeLogs.find(
      (log) => log.userId.toString() === user.id && !log.endTime
    );

    let statusChanged = false;
    if (task.status !== 'in-progress') {
      task.status = 'in-progress';
      statusChanged = true;
    }

    // If active timer exists on the exact same target, return alreadyRunning
    if (activeLog) {
      const sameTarget = String(activeLog.subtaskId || '') === String(subtaskId || '');
      if (sameTarget) {
        if (statusChanged) {
          await task.save();
        }

        const populatedTask = await Task.findById(task._id)
          .populate('createdBy', 'name email avatar')
          .populate('assignedTo', 'name email avatar')
          .populate('categoryId', 'name color')
          .lean();

        return {
          task: populatedTask,
          activeLog,
          taskStatus: task.status,
          totalTimeSpent: task.totalTimeSpent,
          alreadyRunning: true,
        };
      }

      // If switching targets (e.g. from main task to subtask or between subtasks), finalize previous slice
      const now = new Date();
      const prevStart = new Date(activeLog.startTime);
      const sliceDuration = Math.max(1, Math.round((now.getTime() - prevStart.getTime()) / 1000));
      activeLog.endTime = now;
      activeLog.duration = sliceDuration;
      task.totalTimeSpent = (task.totalTimeSpent || 0) + sliceDuration;

      if (activeLog.subtaskId) {
        const prevSubtask = task.subtasks.id(activeLog.subtaskId);
        if (prevSubtask) {
          prevSubtask.totalTimeSpent = (prevSubtask.totalTimeSpent || 0) + sliceDuration;
        }
      }
    }

    const now = new Date();
    task.timeLogs.push({
      userId: user._id,
      subtaskId: subtaskId || null,
      startTime: now,
      endTime: null,
      duration: 0,
    });

    task.status = 'in-progress';
    await task.save();

    activeLog = task.timeLogs[task.timeLogs.length - 1];

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    return {
      task: populatedTask,
      activeLog,
      taskStatus: task.status,
      totalTimeSpent: task.totalTimeSpent,
      alreadyRunning: false,
    };
  },

  /**
   * Pause active time tracking session (stops ticking, saves accumulated interval to total)
   */
  async pauseTimeTracking({ taskId, user, subtaskId = null }) {
    assertValidObjectId(taskId, 'Task ID');

    const task = await Task.findById(taskId);
    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    await verifyTaskTimeTrackingAccess(task, user.id);

    // Find the unended timer for this user
    const activeLogIndex = task.timeLogs.findIndex(
      (log) => log.userId.toString() === user.id && !log.endTime
    );

    if (activeLogIndex === -1) {
      throw new TaskError(
        'No active timer found running for this user on this task',
        400
      );
    }

    const now = new Date();
    const activeLog = task.timeLogs[activeLogIndex];
    const startTime = new Date(activeLog.startTime);
    const durationSeconds = Math.max(
      1,
      Math.round((now.getTime() - startTime.getTime()) / 1000)
    );

    activeLog.endTime = now;
    activeLog.duration = durationSeconds;
    task.totalTimeSpent = (task.totalTimeSpent || 0) + durationSeconds;

    if (activeLog.subtaskId) {
      const subtask = task.subtasks.id(activeLog.subtaskId);
      if (subtask) {
        subtask.totalTimeSpent = (subtask.totalTimeSpent || 0) + durationSeconds;
      }
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    return {
      task: populatedTask,
      loggedSeconds: durationSeconds,
      totalTimeSpent: task.totalTimeSpent,
      log: activeLog,
      isPaused: true,
    };
  },

  /**
   * Stop active time tracking session and calculate duration
   */
  async stopTimeTracking({ taskId, user, subtaskId = null }) {
    assertValidObjectId(taskId, 'Task ID');

    const task = await Task.findById(taskId);
    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    await verifyTaskTimeTrackingAccess(task, user.id);

    // Find the unended timer for this user if one is currently ticking
    const activeLogIndex = task.timeLogs.findIndex(
      (log) => log.userId.toString() === user.id && !log.endTime
    );

    let durationSeconds = 0;
    let finishedLog = null;

    if (activeLogIndex !== -1) {
      const now = new Date();
      finishedLog = task.timeLogs[activeLogIndex];
      const startTime = new Date(finishedLog.startTime);
      durationSeconds = Math.max(
        1,
        Math.round((now.getTime() - startTime.getTime()) / 1000)
      );

      finishedLog.endTime = now;
      finishedLog.duration = durationSeconds;
      task.totalTimeSpent = (task.totalTimeSpent || 0) + durationSeconds;

      if (finishedLog.subtaskId) {
        const subtask = task.subtasks.id(finishedLog.subtaskId);
        if (subtask) {
          subtask.totalTimeSpent = (subtask.totalTimeSpent || 0) + durationSeconds;
        }
      }

      await task.save();
    }

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    return {
      task: populatedTask,
      loggedSeconds: durationSeconds,
      totalTimeSpent: populatedTask.totalTimeSpent || 0,
      log: finishedLog,
    };
  },
};
