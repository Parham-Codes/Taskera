import mongoose from 'mongoose';
import {
  Comment,
  Task,
  User,
  Organization,
  OrganizationMember,
  ORG_ROLES,
  ActivityLog,
  ACTIVITY_ACTIONS,
  Notification,
  NOTIFICATION_TYPES,
} from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { notifyTaskCommentOnTelegram } from '../services/telegramService.js';

/**
 * Add a comment to a task
 */
export const addComment = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return errorResponse(res, { message: 'Invalid Task ID format', statusCode: 400 });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    // Tenant / Owner verification
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
      return errorResponse(res, {
        message: 'Access denied: You cannot comment on someone else’s personal task',
        statusCode: 403,
      });
    }

    // If this commenter previously muted notifications for this task, automatically re-enable them!
    if (task.commentMutedUsers && task.commentMutedUsers.length > 0) {
      const isMuted = task.commentMutedUsers.some((u) => u.toString() === req.user.id);
      if (isMuted) {
        task.commentMutedUsers = task.commentMutedUsers.filter((u) => u.toString() !== req.user.id);
        await task.save();
      }
    }

    const comment = await Comment.create({
      taskId,
      authorId: req.user._id,
      content,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'name email avatar')
      .lean();

    // Determine notification recipients:
    // 1. All task assignees (excluding the comment author)
    const rawAssignees = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : task.assignedTo ? [task.assignedTo] : [];
    const assigneeIds = rawAssignees
      .map((a) => (a?._id ? a._id.toString() : a?.toString()))
      .filter((id) => id && id !== req.user.id);

    // 2. All past commenters on this task
    const pastCommenterIds = await Comment.distinct('authorId', { taskId });
    const mutedUsersSet = new Set(
      (task.commentMutedUsers || []).map((u) => u.toString())
    );
    const assigneesSet = new Set(rawAssignees.map((a) => (a?._id ? a._id.toString() : a?.toString())));

    // Eligible participants: commented before, not an assignee, not the current author, and not muted!
    const participantIds = pastCommenterIds
      .map((id) => id.toString())
      .filter((id) => id !== req.user.id && !assigneesSet.has(id) && !mutedUsersSet.has(id));

    const creatorIdStr = task.createdBy ? task.createdBy.toString() : null;
    const isCreatorEligible =
      creatorIdStr &&
      creatorIdStr !== req.user.id &&
      !mutedUsersSet.has(creatorIdStr);

    // Combined unique recipients
    const uniqueRecipientIds = [
      ...new Set([
        ...assigneeIds,
        ...participantIds,
        ...(isCreatorEligible ? [creatorIdStr] : []),
      ]),
    ];

    // In-app notifications
    for (const recipientId of uniqueRecipientIds) {
      await Notification.create({
        recipient: recipientId,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.COMMENT_ADDED,
        title: `نظر جدید روی تسک: ${task.title}`,
        message: `${req.user.name}: "${content.slice(0, 120)}${content.length > 120 ? '...' : ''}"`,
        taskId: task._id,
        organizationId: task.organizationId || null,
        isRead: false,
      });
    }

    // Asynchronous Telegram Notification dispatch (Non-blocking)
    (async () => {
      try {
        let organizationName = null;
        if (task.organizationId) {
          const org = await Organization.findById(task.organizationId).select('name').lean();
          if (org) organizationName = org.name;
        }

        for (const rId of uniqueRecipientIds) {
          const recipientUser = await User.findById(rId)
            .select('name email telegramSettings')
            .lean();

          if (recipientUser?.telegramSettings?.enabled) {
            await notifyTaskCommentOnTelegram({
              recipientUser,
              task,
              commenterName: req.user.name,
              commentContent: content,
              organizationName,
            });
          }
        }
      } catch (tgError) {
        console.error(
          '[TelegramNotification] Failed to send comment alert:',
          tgError.message
        );
      }
    })();

    // Log Activity for organization tasks
    if (task.organizationId) {
      await ActivityLog.create({
        organizationId: task.organizationId,
        taskId,
        actorId: req.user._id,
        action: ACTIVITY_ACTIONS.COMMENT_ADDED,
        details: { commentPreview: content.slice(0, 50) },
      });
    }

    return successResponse(res, {
      message: 'Comment added successfully',
      statusCode: 201,
      data: { comment: populatedComment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all comments for a specific task
 */
export const getTaskComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return errorResponse(res, { message: 'Invalid Task ID format', statusCode: 400 });
    }

    const task = await Task.findById(taskId).lean();
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    // Check read permissions
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
      return errorResponse(res, { message: 'Access denied', statusCode: 403 });
    }

    const comments = await Comment.find({ taskId })
      .sort({ createdAt: 1 })
      .populate('authorId', 'name email avatar')
      .lean();

    const rawAssignees = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : task.assignedTo ? [task.assignedTo] : [];
    const isAssignee = rawAssignees.some(
      (a) => (a?._id ? a._id.toString() : a?.toString()) === req.user.id
    );
    const isMuted = (task.commentMutedUsers || []).some(
      (u) => u.toString() === req.user.id
    );

    return successResponse(res, {
      message: 'Comments retrieved successfully',
      data: {
        comments,
        meta: {
          isMuted,
          canMute: !isAssignee,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle notification mute for non-assignees on a task discussion thread
 */
export const toggleCommentMute = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return errorResponse(res, { message: 'Invalid Task ID format', statusCode: 400 });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return errorResponse(res, { message: 'Task not found', statusCode: 404 });
    }

    // Tenant / Owner verification
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
      return errorResponse(res, {
        message: 'Access denied: You cannot modify someone else’s personal task',
        statusCode: 403,
      });
    }

    // Check if user is an assignee of this task
    const rawAssignees = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : task.assignedTo ? [task.assignedTo] : [];
    const isAssignee = rawAssignees.some(
      (a) => (a?._id ? a._id.toString() : a?.toString()) === req.user.id
    );

    if (isAssignee) {
      return errorResponse(res, {
        message: 'مسئولین تسک نمی‌توانند اعلان‌های این گفت‌وگو را بی‌صدا کنند',
        statusCode: 400,
      });
    }

    const mutedList = (task.commentMutedUsers || []).map((u) => u.toString());
    const isAlreadyMuted = mutedList.includes(req.user.id);

    if (isAlreadyMuted) {
      task.commentMutedUsers = task.commentMutedUsers.filter(
        (u) => u.toString() !== req.user.id
      );
    } else {
      task.commentMutedUsers.push(req.user._id);
    }

    await task.save();

    const isMuted = !isAlreadyMuted;
    return successResponse(res, {
      message: isMuted
        ? 'اعلان‌های تلگرام این گفت‌وگو برای شما بی‌صدا شد'
        : 'دریافت اعلان‌های تلگرام این گفت‌وگو مجدداً برای شما فعال شد',
      data: { isMuted, canMute: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a comment
 */
export const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return errorResponse(res, { message: 'Invalid Comment ID format', statusCode: 400 });
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return errorResponse(res, { message: 'Comment not found', statusCode: 404 });
    }

    const isAuthor = comment.authorId.toString() === req.user.id;

    if (!isAuthor) {
      // Check if user is manager/owner of the organization
      const task = await Task.findById(comment.taskId).lean();
      if (task && task.organizationId) {
        const membership = await OrganizationMember.findOne({
          organizationId: task.organizationId,
          userId: req.user._id,
        }).lean();

        const isManager = membership && [ORG_ROLES.OWNER, ORG_ROLES.MANAGER].includes(membership.role);
        if (!isManager) {
          return errorResponse(res, {
            message: 'You can only delete your own comments',
            statusCode: 403,
          });
        }
      } else {
        return errorResponse(res, {
          message: 'You can only delete your own comments',
          statusCode: 403,
        });
      }
    }

    await Comment.findByIdAndDelete(commentId);

    return successResponse(res, {
      message: 'Comment deleted successfully',
      data: { commentId },
    });
  } catch (error) {
    next(error);
  }
};
