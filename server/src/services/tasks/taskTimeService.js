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
   * Start time tracking session for a task
   */
  async startTimeTracking({ taskId, user }) {
    assertValidObjectId(taskId, 'Task ID');

    const task = await Task.findById(taskId);
    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    await verifyTaskTimeTrackingAccess(task, user.id);

    // Check if user already has an active timer running on this task
    let activeLog = task.timeLogs.find(
      (log) => log.userId.toString() === user.id && !log.endTime
    );

    let statusChanged = false;
    if (task.status !== 'in-progress') {
      task.status = 'in-progress';
      statusChanged = true;
    }

    if (activeLog) {
      if (statusChanged) {
        await task.save();
      }

      const populatedTask = await Task.findById(task._id)
        .populate('createdBy', 'name email avatar')
        .populate('assignedTo', 'name email avatar')
        .lean();

      return {
        task: populatedTask,
        activeLog,
        taskStatus: task.status,
        totalTimeSpent: task.totalTimeSpent,
        alreadyRunning: true,
      };
    }

    const now = new Date();
    task.timeLogs.push({
      userId: user._id,
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
   * Stop active time tracking session and calculate duration
   */
  async stopTimeTracking({ taskId, user }) {
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
    const startTime = new Date(task.timeLogs[activeLogIndex].startTime);
    const durationSeconds = Math.max(
      1,
      Math.round((now.getTime() - startTime.getTime()) / 1000)
    );

    task.timeLogs[activeLogIndex].endTime = now;
    task.timeLogs[activeLogIndex].duration = durationSeconds;
    task.totalTimeSpent = (task.totalTimeSpent || 0) + durationSeconds;

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
      log: task.timeLogs[activeLogIndex],
    };
  },
};
