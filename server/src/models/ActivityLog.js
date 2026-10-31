import mongoose from 'mongoose';

export const ACTIVITY_ACTIONS = {
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  STATUS_CHANGED: 'status_changed',
  TASK_ASSIGNED: 'task_assigned',
  TASK_DELETED: 'task_deleted',
  COMMENT_ADDED: 'comment_added',
  MEMBER_JOINED: 'member_joined',
  MEMBER_REMOVED: 'member_removed',
  MEMBER_REMOVAL_REQUESTED: 'member_removal_requested',
  MEMBER_REMOVAL_REJECTED: 'member_removal_rejected',
  ROLE_UPDATED: 'role_updated',
};

const activityLogSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
      index: true,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
      index: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor ID is required'],
      index: true,
    },
    action: {
      type: String,
      enum: {
        values: Object.values(ACTIVITY_ACTIONS),
        message: '{VALUE} is not a valid activity action',
      },
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// High-speed retrieval for team audit feeds and task histories
activityLogSchema.index({ organizationId: 1, createdAt: -1 });
activityLogSchema.index({ taskId: 1, createdAt: -1 });

const ActivityLog = mongoose.models.ActivityLog || mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
