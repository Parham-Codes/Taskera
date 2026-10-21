import mongoose from 'mongoose';
import {
  User,
  Task,
  OrganizationMember,
  ORG_ROLES,
  Comment,
  ActivityLog,
  ACTIVITY_ACTIONS,
  Category,
} from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { notifyTaskEventOnTelegram } from '../services/telegramService.js';

/**
 * Create a new task (Personal Space or Organization Space)
 */
export const createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      organizationId,
      assignedTo,
      tags,
      order,
      categoryId,
      subtasks,
    } = req.body;

    let targetOrgId = null;
    let targetAssigneeId = req.user._id;

    // Handle Organization Task
    if (organizationId) {
      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return errorResponse(res, {
          message: 'Invalid Organization ID format',
          statusCode: 400,
        });
      }

      // 1. Verify creator belongs to this organization
      const creatorMembership = await OrganizationMember.findOne({
        organizationId,
        userId: req.user._id,
      }).lean();

      if (!creatorMembership) {
        return errorResponse(res, {
          message: 'You are not a member of this organization',
          statusCode: 403,
        });
      }

      targetOrgId = organizationId;

      // 2. If assigning to another member, verify they also belong to the organization
      if (assignedTo) {
        const assigneeMembership = await OrganizationMember.findOne({
          organizationId,
          userId: assignedTo,
        }).lean();

        if (!assigneeMembership) {
          return errorResponse(res, {
            message: 'Assigned user is not a member of this organization',
            statusCode: 400,
          });
        }
        targetAssigneeId = assignedTo;
      } else {
        targetAssigneeId = req.user._id;
      }
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      createdBy: req.user._id,
      assignedTo: targetAssigneeId,
      organizationId: targetOrgId,
      categoryId: categoryId || null,
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      tags: tags || [],
      order: order || 0,
    });

    // Populate for immediate frontend UI insertion
    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    // Log activity if created within an organization
    if (targetOrgId) {
      await ActivityLog.create({
        organizationId: targetOrgId,
        taskId: task._id,
        actorId: req.user._id,
        action: ACTIVITY_ACTIONS.TASK_CREATED,
        details: { title: task.title, assignedTo: targetAssigneeId },
      });
    }

    // Asynchronous Telegram Notification dispatch (Non-blocking)
    (async () => {
      try {
        const isSelfAssigned = targetAssigneeId.toString() === req.user._id.toString();

        if (isSelfAssigned) {
          // Task created for oneself
          if (req.user?.telegramSettings?.enabled) {
            await notifyTaskEventOnTelegram({
              recipientUser: req.user,
              task: populatedTask,
              eventType: 'created',
              actorName: req.user.name,
            });
          }
        } else {
          // Task assigned to someone else
          const assigneeUser = await User.findById(targetAssigneeId)
            .select('name email telegramSettings')
            .lean();

          if (assigneeUser?.telegramSettings?.enabled) {
            await notifyTaskEventOnTelegram({
              recipientUser: assigneeUser,
              task: populatedTask,
              eventType: 'assigned',
              actorName: req.user.name,
            });
          }

          // Also notify creator if enabled
          if (req.user?.telegramSettings?.enabled && req.user?.telegramSettings?.notifyOnCreated) {
            await notifyTaskEventOnTelegram({
              recipientUser: req.user,
              task: populatedTask,
              eventType: 'created',
              actorName: req.user.name,
            });
          }
        }
      } catch (tgError) {
        console.error('[TelegramNotification] Failed to send on task creation:', tgError.message);
      }
    })();

    return successResponse(res, {
      message: 'Task created successfully',
      statusCode: 201,
      data: { task: populatedTask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List tasks with pagination, filters, and search
 * Supports both Personal Space (organizationId = null) and Team Space
 */
export const getTasks = async (req, res, next) => {
  try {
    const {
      organizationId,
      status,
      priority,
      assignedTo,
      categoryId,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    if (organizationId) {
      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return errorResponse(res, {
          message: 'Invalid Organization ID format',
          statusCode: 400,
        });
      }

      // Check membership
      const membership = await OrganizationMember.findOne({
        organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }

      query.organizationId = organizationId;

      if (assignedTo) {
        query.assignedTo = assignedTo;
      }
    } else {
      // Personal tasks: strictly owned by the logged-in user with no organization
      query.organizationId = null;
      query.createdBy = req.user._id;
    }

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email avatar')
        .populate('assignedTo', 'name email avatar')
        .populate('categoryId', 'name color')
        .lean(),
      Task.countDocuments(query),
    ]);

    return successResponse(res, {
      message: 'Tasks retrieved successfully',
      data: {
        tasks,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single task by ID
 */
export const getTaskById = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return errorResponse(res, { message: 'Invalid Task ID format', statusCode: 400 });
    }

    const task = await Task.findById(taskId)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    // Access authorization check
    if (task.organizationId) {
      const isMember = await OrganizationMember.findOne({
        organizationId: task.organizationId,
        userId: req.user._id,
      }).lean();

      if (!isMember) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }
    } else if (task.createdBy._id.toString() !== req.user.id) {
      return errorResponse(res, { message: 'Access denied to this personal task', statusCode: 403 });
    }

    return successResponse(res, {
      message: 'Task retrieved successfully',
      data: { task },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task details with role and ownership checks
 */
export const updateTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const updates = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    // Authorization logic
    if (task.organizationId) {
      const membership = await OrganizationMember.findOne({
        organizationId: task.organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }

      // If user is regular member (not manager/owner and not creator)
      const isManagerOrOwner = [ORG_ROLES.OWNER, ORG_ROLES.MANAGER].includes(membership.role);
      const isCreator = task.createdBy.toString() === req.user.id;
      const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user.id;

      if (!isManagerOrOwner && !isCreator) {
        // Regular members can only update task status of their assigned tasks
        if (isAssignee && Object.keys(updates).length === 1 && updates.status) {
          // Allowed to transition status
        } else {
          return errorResponse(res, {
            message: 'Only managers or the task creator can modify full task details',
            statusCode: 403,
          });
        }
      }
    } else if (task.createdBy.toString() !== req.user.id) {
      return errorResponse(res, {
        message: 'You cannot edit someone else’s personal task',
        statusCode: 403,
      });
    }

    const previousStatus = task.status;
    const previousAssignee = task.assignedTo?.toString();

    // Apply allowed updates
    Object.assign(task, updates);
    await task.save();

    const updatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    // Log Activity changes if in organization
    if (task.organizationId) {
      if (updates.status && updates.status !== previousStatus) {
        await ActivityLog.create({
          organizationId: task.organizationId,
          taskId: task._id,
          actorId: req.user._id,
          action: ACTIVITY_ACTIONS.STATUS_CHANGED,
          details: { from: previousStatus, to: updates.status },
        });
      }

      if (updates.assignedTo && updates.assignedTo.toString() !== previousAssignee) {
        await ActivityLog.create({
          organizationId: task.organizationId,
          taskId: task._id,
          actorId: req.user._id,
          action: ACTIVITY_ACTIONS.TASK_ASSIGNED,
          details: { assignedTo: updates.assignedTo },
        });
      }
    }

    // Asynchronous Telegram Notification on status update (Non-blocking)
    if (updates.status && updates.status !== previousStatus) {
      (async () => {
        try {
          const targetUserId = task.assignedTo || task.createdBy;
          if (targetUserId) {
            const recipient =
              targetUserId.toString() === req.user._id.toString()
                ? req.user
                : await User.findById(targetUserId).select('name email telegramSettings').lean();

            if (recipient?.telegramSettings?.enabled) {
              await notifyTaskEventOnTelegram({
                recipientUser: recipient,
                task: updatedTask,
                eventType: 'status_changed',
                actorName: req.user.name,
                oldStatus: previousStatus,
                newStatus: updates.status,
              });
            }
          }
        } catch (tgError) {
          console.error('[TelegramNotification] Failed to send on status update:', tgError.message);
        }
      })();
    }

    return successResponse(res, {
      message: 'Task updated successfully',
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a task
 */
export const deleteTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    if (task.organizationId) {
      const membership = await OrganizationMember.findOne({
        organizationId: task.organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }

      const isManagerOrOwner = [ORG_ROLES.OWNER, ORG_ROLES.MANAGER].includes(membership.role);
      const isCreator = task.createdBy.toString() === req.user.id;

      if (!isManagerOrOwner && !isCreator) {
        return errorResponse(res, {
          message: 'Only managers or the task creator can delete this task',
          statusCode: 403,
        });
      }
    } else if (task.createdBy.toString() !== req.user.id) {
      return errorResponse(res, {
        message: 'You cannot delete someone else’s personal task',
        statusCode: 403,
      });
    }

    await Task.findByIdAndDelete(taskId);

    // Clean up associated comments and logs
    await Comment.deleteMany({ taskId });

    if (task.organizationId) {
      await ActivityLog.create({
        organizationId: task.organizationId,
        taskId: null,
        actorId: req.user._id,
        action: ACTIVITY_ACTIONS.TASK_DELETED,
        details: { title: task.title },
      });
    }

    return successResponse(res, {
      message: 'Task deleted successfully',
      data: { taskId },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start Time Tracking for a Task
 */
export const startTimeTracking = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    // Authorization
    if (task.organizationId) {
      const membership = await OrganizationMember.findOne({
        organizationId: task.organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }
    } else if (task.createdBy.toString() !== req.user.id) {
      return errorResponse(res, { message: 'Access denied to this personal task', statusCode: 403 });
    }

    // Check if user already has an active timer running on this task
    let activeLog = task.timeLogs.find(
      (log) => log.userId.toString() === req.user.id && !log.endTime
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

      return successResponse(res, {
        message: 'Timer is already running on this task',
        data: {
          task: populatedTask,
          activeLog,
          taskStatus: task.status,
          totalTimeSpent: task.totalTimeSpent,
        },
      });
    }

    const now = new Date();
    task.timeLogs.push({
      userId: req.user._id,
      startTime: now,
      endTime: null,
      duration: 0,
    });

    // Ensure status is in-progress
    task.status = 'in-progress';

    await task.save();

    activeLog = task.timeLogs[task.timeLogs.length - 1];

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .lean();

    return successResponse(res, {
      message: 'Timer started successfully',
      statusCode: 201,
      data: {
        task: populatedTask,
        activeLog,
        taskStatus: task.status,
        totalTimeSpent: task.totalTimeSpent,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stop Time Tracking for a Task
 */
export const stopTimeTracking = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    // Find the unended timer for this user
    const activeLogIndex = task.timeLogs.findIndex(
      (log) => log.userId.toString() === req.user.id && !log.endTime
    );

    if (activeLogIndex === -1) {
      return errorResponse(res, {
        message: 'No active timer found running for this user on this task',
        statusCode: 400,
      });
    }

    const now = new Date();
    const startTime = new Date(task.timeLogs[activeLogIndex].startTime);
    const durationSeconds = Math.max(1, Math.round((now.getTime() - startTime.getTime()) / 1000));

    task.timeLogs[activeLogIndex].endTime = now;
    task.timeLogs[activeLogIndex].duration = durationSeconds;
    task.totalTimeSpent = (task.totalTimeSpent || 0) + durationSeconds;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    return successResponse(res, {
      message: 'Timer stopped and duration logged successfully',
      data: {
        task: populatedTask,
        loggedSeconds: durationSeconds,
        totalTimeSpent: task.totalTimeSpent,
        log: task.timeLogs[activeLogIndex],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle a subtask completed status
 */
export const toggleSubtask = async (req, res, next) => {
  try {
    const { taskId, subtaskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    if (task.organizationId) {
      const membership = await OrganizationMember.findOne({
        organizationId: task.organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }
    } else if (task.createdBy.toString() !== req.user.id) {
      return errorResponse(res, { message: 'Access denied to this personal task', statusCode: 403 });
    }

    const subtask = task.subtasks.id(subtaskId);
    if (!subtask) {
      return errorResponse(res, { message: 'Subtask not found', statusCode: 404 });
    }

    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : null;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    return successResponse(res, {
      message: 'Subtask status updated successfully',
      data: { task: populatedTask, subtask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Batch create tasks (e.g. from Markdown AI Import)
 */
export const batchCreateTasks = async (req, res, next) => {
  try {
    const { tasks = [], organizationId = null } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return errorResponse(res, {
        message: 'No tasks provided for batch creation',
        statusCode: 400,
      });
    }

    if (tasks.length > 50) {
      return errorResponse(res, {
        message: 'Maximum 50 tasks allowed per batch import',
        statusCode: 400,
      });
    }

    let targetOrgId = null;
    if (organizationId) {
      if (!mongoose.Types.ObjectId.isValid(organizationId)) {
        return errorResponse(res, {
          message: 'Invalid Organization ID format',
          statusCode: 400,
        });
      }

      const membership = await OrganizationMember.findOne({
        organizationId,
        userId: req.user._id,
      }).lean();

      if (!membership) {
        return errorResponse(res, {
          message: 'Access denied: You are not a member of this organization',
          statusCode: 403,
        });
      }

      targetOrgId = organizationId;
    }

    // Cache categories in this workspace to avoid repetitive queries
    const existingCategories = await Category.find({
      organizationId: targetOrgId,
      ...(targetOrgId ? {} : { createdBy: req.user._id }),
    });

    const categoryMap = new Map();
    existingCategories.forEach((cat) => {
      categoryMap.set(cat.name.trim().toLowerCase(), cat._id);
    });

    const createdTasks = [];

    for (const item of tasks) {
      if (!item.title || !item.title.trim()) continue;

      let categoryId = null;
      if (item.categoryId && mongoose.Types.ObjectId.isValid(item.categoryId)) {
        categoryId = item.categoryId;
      } else if (item.categoryName && item.categoryName.trim()) {
        const catNameTrimmed = item.categoryName.trim();
        const catKey = catNameTrimmed.toLowerCase();
        if (categoryMap.has(catKey)) {
          categoryId = categoryMap.get(catKey);
        } else {
          // Auto-create category with a curated color
          const palette = ['#4F5AE4', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#64748B'];
          const randomColor = palette[Math.floor(Math.random() * palette.length)];
          const newCat = await Category.create({
            name: catNameTrimmed,
            color: item.categoryColor || randomColor,
            organizationId: targetOrgId,
            createdBy: req.user._id,
          });
          categoryMap.set(catKey, newCat._id);
          categoryId = newCat._id;
        }
      }

      const validPriorities = ['urgent', 'high', 'medium', 'low'];
      const priority = validPriorities.includes(item.priority) ? item.priority : 'medium';

      const validStatuses = ['todo', 'in-progress', 'review', 'completed'];
      const status = validStatuses.includes(item.status) ? item.status : 'todo';

      const subtasks = Array.isArray(item.subtasks)
        ? item.subtasks
            .filter((s) => (typeof s === 'string' ? s.trim() : s?.title && s.title.trim()))
            .map((s) => ({
              title: typeof s === 'string' ? s.trim() : s.title.trim(),
              completed: typeof s === 'object' ? Boolean(s.completed) : false,
            }))
        : [];

      let dueDate = null;
      if (item.dueDate) {
        const parsedDate = new Date(item.dueDate);
        if (!isNaN(parsedDate.getTime())) {
          dueDate = parsedDate;
        }
      }

      const newTask = await Task.create({
        title: item.title.trim(),
        description: item.description?.trim() || '',
        status,
        priority,
        dueDate,
        organizationId: targetOrgId,
        createdBy: req.user._id,
        assignedTo: req.user._id,
        categoryId,
        subtasks,
      });

      createdTasks.push(newTask._id);
    }

    const populatedTasks = await Task.find({ _id: { $in: createdTasks } })
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, {
      message: `${populatedTasks.length} tasks imported successfully`,
      statusCode: 201,
      data: { tasks: populatedTasks },
    });
  } catch (error) {
    next(error);
  }
};


