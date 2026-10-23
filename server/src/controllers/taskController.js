import { successResponse } from '../utils/apiResponse.js';
import {
  taskCrudService,
  taskTimeService,
  taskSubtaskService,
  taskBatchService,
} from '../services/tasks/index.js';

/**
 * Task Controller - Thin HTTP Presentation Layer.
 * Handles request parsing, invokes dedicated domain services, and returns formatted HTTP responses.
 */

/**
 * POST /api/tasks
 * Create a new task (Personal Space or Organization Workspace)
 */
export const createTask = async (req, res, next) => {
  try {
    const task = await taskCrudService.createTask({
      taskData: req.body,
      user: req.user,
    });

    return successResponse(res, {
      message: 'Task created successfully',
      statusCode: 201,
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks
 * List tasks with pagination, filters, and search
 */
export const getTasks = async (req, res, next) => {
  try {
    const { tasks, pagination } = await taskCrudService.getTasks({
      queryParams: req.query,
      user: req.user,
    });

    return successResponse(res, {
      message: 'Tasks retrieved successfully',
      data: { tasks, pagination },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/tasks/:taskId
 * Retrieve single task by ID
 */
export const getTaskById = async (req, res, next) => {
  try {
    const task = await taskCrudService.getTaskById({
      taskId: req.params.taskId,
      user: req.user,
    });

    return successResponse(res, {
      message: 'Task retrieved successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:taskId
 * Update task details with role and ownership checks
 */
export const updateTask = async (req, res, next) => {
  try {
    const task = await taskCrudService.updateTask({
      taskId: req.params.taskId,
      updates: req.body,
      user: req.user,
    });

    return successResponse(res, {
      message: 'Task updated successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/tasks/:taskId
 * Delete a task
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = await taskCrudService.deleteTask({
      taskId: req.params.taskId,
      user: req.user,
    });

    return successResponse(res, {
      message: 'Task deleted successfully',
      data: { taskId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks/:taskId/time/start
 * Start Time Tracking for a Task
 */
export const startTimeTracking = async (req, res, next) => {
  try {
    const result = await taskTimeService.startTimeTracking({
      taskId: req.params.taskId,
      user: req.user,
    });

    const statusCode = result.alreadyRunning ? 200 : 201;
    const message = result.alreadyRunning
      ? 'Timer is already running on this task'
      : 'Timer started successfully';

    return successResponse(res, {
      message,
      statusCode,
      data: {
        task: result.task,
        activeLog: result.activeLog,
        taskStatus: result.taskStatus,
        totalTimeSpent: result.totalTimeSpent,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks/:taskId/time/stop
 * Stop Time Tracking for a Task
 */
export const stopTimeTracking = async (req, res, next) => {
  try {
    const result = await taskTimeService.stopTimeTracking({
      taskId: req.params.taskId,
      user: req.user,
    });

    return successResponse(res, {
      message: 'Timer stopped and duration logged successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/tasks/:taskId/subtasks/:subtaskId/toggle
 * Toggle a subtask completed status
 */
export const toggleSubtask = async (req, res, next) => {
  try {
    const result = await taskSubtaskService.toggleSubtask({
      taskId: req.params.taskId,
      subtaskId: req.params.subtaskId,
      user: req.user,
    });

    return successResponse(res, {
      message: 'Subtask status updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/tasks/batch
 * Batch create tasks (e.g. from Markdown AI Import)
 */
export const batchCreateTasks = async (req, res, next) => {
  try {
    const populatedTasks = await taskBatchService.batchCreateTasks({
      tasks: req.body.tasks,
      organizationId: req.body.organizationId,
      user: req.user,
    });

    return successResponse(res, {
      message: `${populatedTasks.length} tasks imported successfully`,
      statusCode: 201,
      data: { tasks: populatedTasks },
    });
  } catch (error) {
    next(error);
  }
};
