import mongoose from 'mongoose';
import {
  User,
  Task,
  OrganizationMember,
  Comment,
  ActivityLog,
  ACTIVITY_ACTIONS,
} from '../../models/index.js';
import { notifyTaskEventOnTelegram } from '../telegramService.js';
import { TaskError } from './taskErrors.js';
import {
  assertValidObjectId,
  verifyOrgMembership,
  verifyTaskReadAccess,
  verifyTaskUpdateAccess,
  verifyTaskDeleteAccess,
} from './taskAccessHelper.js';

/**
 * Service for Core Task CRUD operations, queries, and business rules.
 */
export const taskCrudService = {
  /**
   * Create a new task in personal space or organization workspace
   */
  async createTask({ taskData, user }) {
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
    } = taskData;

    let targetOrgId = null;
    let targetAssigneeId = user._id;

    // Handle Organization Task
    if (organizationId) {
      assertValidObjectId(organizationId, 'Organization ID');

      // 1. Verify creator belongs to this organization
      await verifyOrgMembership(
        organizationId,
        user._id,
        'You are not a member of this organization'
      );

      targetOrgId = organizationId;

      // 2. If assigning to another member, verify they also belong to the organization
      if (assignedTo) {
        const assigneeMembership = await OrganizationMember.findOne({
          organizationId,
          userId: assignedTo,
        }).lean();

        if (!assigneeMembership) {
          throw new TaskError(
            'Assigned user is not a member of this organization',
            400
          );
        }
        targetAssigneeId = assignedTo;
      } else {
        targetAssigneeId = user._id;
      }
    }

    const task = await Task.create({
      title,
      description,
      status,
      priority,
      dueDate,
      createdBy: user._id,
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
        actorId: user._id,
        action: ACTIVITY_ACTIONS.TASK_CREATED,
        details: { title: task.title, assignedTo: targetAssigneeId },
      });
    }

    // Asynchronous Telegram Notification dispatch (Non-blocking)
    (async () => {
      try {
        const isSelfAssigned =
          targetAssigneeId.toString() === user._id.toString();

        if (isSelfAssigned) {
          if (user?.telegramSettings?.enabled) {
            await notifyTaskEventOnTelegram({
              recipientUser: user,
              task: populatedTask,
              eventType: 'created',
              actorName: user.name,
            });
          }
        } else {
          const assigneeUser = await User.findById(targetAssigneeId)
            .select('name email telegramSettings')
            .lean();

          if (assigneeUser?.telegramSettings?.enabled) {
            await notifyTaskEventOnTelegram({
              recipientUser: assigneeUser,
              task: populatedTask,
              eventType: 'assigned',
              actorName: user.name,
            });
          }

          if (user?.telegramSettings?.enabled && user?.telegramSettings?.notifyOnCreated) {
            await notifyTaskEventOnTelegram({
              recipientUser: user,
              task: populatedTask,
              eventType: 'created',
              actorName: user.name,
            });
          }
        }
      } catch (tgError) {
        console.error(
          '[TelegramNotification] Failed to send on task creation:',
          tgError.message
        );
      }
    })();

    return populatedTask;
  },

  /**
   * List tasks with pagination, search, and workspace isolation
   */
  async getTasks({ queryParams, user }) {
    const {
      organizationId,
      status,
      priority,
      assignedTo,
      categoryId,
      search,
      page = 1,
      limit = 50,
    } = queryParams;

    const query = {};

    if (organizationId) {
      assertValidObjectId(organizationId, 'Organization ID');
      await verifyOrgMembership(organizationId, user._id);

      query.organizationId = organizationId;

      if (assignedTo) {
        query.assignedTo = assignedTo;
      }
    } else {
      // Personal tasks: strictly owned by the logged-in user with no organization
      query.organizationId = null;
      query.createdBy = user._id;
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

    return {
      tasks,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  },

  /**
   * Get single task by ID with access verification
   */
  async getTaskById({ taskId, user }) {
    assertValidObjectId(taskId, 'Task ID');

    const task = await Task.findById(taskId)
      .populate('createdBy', 'name email avatar')
      .populate('assignedTo', 'name email avatar')
      .populate('categoryId', 'name color')
      .lean();

    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    await verifyTaskReadAccess(task, user.id);

    return task;
  },

  /**
   * Update task details with role and ownership checks
   */
  async updateTask({ taskId, updates, user }) {
    assertValidObjectId(taskId, 'Task ID');

    const task = await Task.findById(taskId);
    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    await verifyTaskUpdateAccess(task, user.id, updates);

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
          actorId: user._id,
          action: ACTIVITY_ACTIONS.STATUS_CHANGED,
          details: { from: previousStatus, to: updates.status },
        });
      }

      if (updates.assignedTo && updates.assignedTo.toString() !== previousAssignee) {
        await ActivityLog.create({
          organizationId: task.organizationId,
          taskId: task._id,
          actorId: user._id,
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
              targetUserId.toString() === user._id.toString()
                ? user
                : await User.findById(targetUserId)
                    .select('name email telegramSettings')
                    .lean();

            if (recipient?.telegramSettings?.enabled) {
              await notifyTaskEventOnTelegram({
                recipientUser: recipient,
                task: updatedTask,
                eventType: 'status_changed',
                actorName: user.name,
                oldStatus: previousStatus,
                newStatus: updates.status,
              });
            }
          }
        } catch (tgError) {
          console.error(
            '[TelegramNotification] Failed to send on status update:',
            tgError.message
          );
        }
      })();
    }

    return updatedTask;
  },

  /**
   * Delete a task and clean up associated entities
   */
  async deleteTask({ taskId, user }) {
    assertValidObjectId(taskId, 'Task ID');

    const task = await Task.findById(taskId);
    if (!task) {
      throw new TaskError('Task not found', 404);
    }

    await verifyTaskDeleteAccess(task, user.id);

    await Task.findByIdAndDelete(taskId);

    // Clean up associated comments
    await Comment.deleteMany({ taskId });

    if (task.organizationId) {
      await ActivityLog.create({
        organizationId: task.organizationId,
        taskId: null,
        actorId: user._id,
        action: ACTIVITY_ACTIONS.TASK_DELETED,
        details: { title: task.title },
      });
    }

    return { taskId };
  },
};
