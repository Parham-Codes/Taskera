import { Task } from '../../models/index.js';
import { TaskError } from './taskErrors.js';
import {
  assertValidObjectId,
  verifyTaskTimeTrackingAccess,
} from './taskAccessHelper.js';

/**
 * Service for Subtasks management and toggling.
 */
export const taskSubtaskService = {
  /**
   * Toggle completion status of a subtask
   */
  async toggleSubtask({ taskId, subtaskId, user }) {
    assertValidObjectId(taskId, 'Task ID');

    const task = await Task.findById(taskId);
    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    // Access authorization check
    await verifyTaskTimeTrackingAccess(task, user.id);

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      throw new TaskError('Subtask not found', 404);
    }

    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : null;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    return {
      task: populatedTask,
      subtask,
    };
  },
};
