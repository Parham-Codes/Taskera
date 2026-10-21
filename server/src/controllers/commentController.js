import mongoose from 'mongoose';
import {
  Comment,
  Task,
  OrganizationMember,
  ORG_ROLES,
  ActivityLog,
  ACTIVITY_ACTIONS,
  Notification,
  NOTIFICATION_TYPES,
} from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

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

    const task = await Task.findById(taskId).lean();
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

    const comment = await Comment.create({
      taskId,
      authorId: req.user._id,
      content,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate('authorId', 'name email avatar')
      .lean();

    // Notify task assignee if comment is from someone else
    if (task.assignedTo && task.assignedTo.toString() !== req.user.id) {
      await Notification.create({
        recipient: task.assignedTo,
        sender: req.user._id,
        type: NOTIFICATION_TYPES.COMMENT_ADDED,
        title: `نظر جدید روی تسک: ${task.title}`,
        message: `${req.user.name}: "${content.slice(0, 120)}${content.length > 120 ? '...' : ''}"`,
        taskId: task._id,
        organizationId: task.organizationId || null,
        isRead: false,
      });
    }

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

    return successResponse(res, {
      message: 'Comments retrieved successfully',
      data: { comments },
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
