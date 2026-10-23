import mongoose from 'mongoose';
import { OrganizationMember, ORG_ROLES } from '../../models/index.js';
import { TaskError } from './taskErrors.js';

/**
 * Validates MongoDB ObjectId format
 * @param {string} id
 * @param {string} label
 */
export const assertValidObjectId = (id, label = 'Task ID') => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    throw new TaskError(`Invalid ${label} format`, 400);
  }
};

/**
 * Verifies that a user is an active member of an organization
 * @param {string|mongoose.Types.ObjectId} organizationId
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} customErrorMessage
 * @returns {Promise<Object>} membership document
 */
export const verifyOrgMembership = async (
  organizationId,
  userId,
  customErrorMessage = 'Access denied: You are not a member of this organization'
) => {
  assertValidObjectId(organizationId, 'Organization ID');

  const membership = await OrganizationMember.findOne({
    organizationId,
    userId,
  }).lean();

  if (!membership) {
    throw new TaskError(customErrorMessage, 403);
  }

  return membership;
};

/**
 * Verifies read access for a task (Org member or Personal creator)
 * @param {Object} task
 * @param {string} userId
 */
export const verifyTaskReadAccess = async (task, userId) => {
  if (!task) {
    throw new TaskError('Task not found', 404);
  }

  if (task.organizationId) {
    await verifyOrgMembership(task.organizationId, userId);
  } else {
    const creatorId = task.createdBy?._id
      ? task.createdBy._id.toString()
      : task.createdBy?.toString();
    if (creatorId !== userId.toString()) {
      throw new TaskError('Access denied to this personal task', 403);
    }
  }
};

/**
 * Verifies time tracking access for a task
 * @param {Object} task
 * @param {string} userId
 */
export const verifyTaskTimeTrackingAccess = async (task, userId) => {
  if (!task) {
    throw new TaskError('Task not found', 404);
  }

  if (task.organizationId) {
    await verifyOrgMembership(task.organizationId, userId);
  } else {
    const creatorId = task.createdBy?._id
      ? task.createdBy._id.toString()
      : task.createdBy?.toString();
    if (creatorId !== userId.toString()) {
      throw new TaskError('Access denied to this personal task', 403);
    }
  }
};

/**
 * Verifies update access for a task with RBAC and assignee rules
 * @param {Object} task
 * @param {string} userId
 * @param {Object} updates
 */
export const verifyTaskUpdateAccess = async (task, userId, updates = {}) => {
  if (!task) {
    throw new TaskError('Task not found', 404);
  }

  const userIdStr = userId.toString();
  const creatorId = task.createdBy?._id
    ? task.createdBy._id.toString()
    : task.createdBy?.toString();

  if (task.organizationId) {
    const membership = await verifyOrgMembership(task.organizationId, userId);

    const isManagerOrOwner = [ORG_ROLES.OWNER, ORG_ROLES.MANAGER].includes(membership.role);
    const isCreator = creatorId === userIdStr;
    const assigneeId = task.assignedTo?._id
      ? task.assignedTo._id.toString()
      : task.assignedTo?.toString();
    const isAssignee = assigneeId && assigneeId === userIdStr;

    if (!isManagerOrOwner && !isCreator) {
      // Regular members can only update task status of their assigned tasks
      if (isAssignee && Object.keys(updates).length === 1 && updates.status) {
        // Allowed to transition status
      } else {
        throw new TaskError(
          'Only managers or the task creator can modify full task details',
          403
        );
      }
    }
  } else if (creatorId !== userIdStr) {
    throw new TaskError('You cannot edit someone else’s personal task', 403);
  }

  // Verify assignee membership if assignedTo is being updated
  if (updates.assignedTo) {
    const newAssigneeStr = updates.assignedTo.toString();
    if (task.organizationId) {
      const assigneeMembership = await OrganizationMember.findOne({
        organizationId: task.organizationId,
        userId: updates.assignedTo,
      }).lean();

      if (!assigneeMembership) {
        throw new TaskError('Assigned user is not a member of this organization', 400);
      }
    } else if (newAssigneeStr !== userIdStr) {
      throw new TaskError('Personal tasks cannot be assigned to another user', 400);
    }
  }
};

/**
 * Verifies delete access for a task
 * @param {Object} task
 * @param {string} userId
 */
export const verifyTaskDeleteAccess = async (task, userId) => {
  if (!task) {
    throw new TaskError('Task not found', 404);
  }

  const userIdStr = userId.toString();
  const creatorId = task.createdBy?._id
    ? task.createdBy._id.toString()
    : task.createdBy?.toString();

  if (task.organizationId) {
    const membership = await verifyOrgMembership(task.organizationId, userId);

    const isManagerOrOwner = [ORG_ROLES.OWNER, ORG_ROLES.MANAGER].includes(membership.role);
    const isCreator = creatorId === userIdStr;

    if (!isManagerOrOwner && !isCreator) {
      throw new TaskError('Only managers or the task creator can delete this task', 403);
    }
  } else if (creatorId !== userIdStr) {
    throw new TaskError('You cannot delete someone else’s personal task', 403);
  }
};
