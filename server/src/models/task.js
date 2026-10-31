import mongoose from 'mongoose';

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in-progress',
  REVIEW: 'review',
  COMPLETED: 'completed',
};

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
};

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [150, 'Task title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(TASK_STATUS),
        message: '{VALUE} is not a valid task status',
      },
      default: TASK_STATUS.TODO,
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: Object.values(TASK_PRIORITY),
        message: '{VALUE} is not a valid task priority',
      },
      default: TASK_PRIORITY.MEDIUM,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true,
    },
    assignedTo: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          index: true,
        },
      ],
      default: [],
      set: (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(Boolean);
        return [val];
      },
    },
    commentMutedUsers: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
      set: (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(Boolean);
        return [val];
      },
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null, // null means Personal Space task!
      index: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [200, 'Subtask title cannot exceed 200 characters'],
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedAt: {
          type: Date,
          default: null,
        },
        totalTimeSpent: {
          type: Number,
          default: 0, // In seconds
        },
      },
    ],
    tags: {
      type: [String],
      default: [],
    },
    totalTimeSpent: {
      type: Number,
      default: 0, // In seconds
    },
    timeLogs: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        subtaskId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        startTime: {
          type: Date,
          required: true,
        },
        endTime: {
          type: Date,
          default: null,
        },
        duration: {
          type: Number, // in seconds
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for ultra-fast filtering without full collection scans
// 1. Personal tasks index
taskSchema.index({ createdBy: 1, organizationId: 1, status: 1 });

// 2. Organization tasks index (by status and board ordering)
taskSchema.index({ organizationId: 1, status: 1, order: 1 });

// 3. Organization tasks assigned to a specific member
taskSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });

// 4. Deadline / calendar queries
taskSchema.index({ organizationId: 1, dueDate: 1 });

// 5. Compound category queries and cascade updates
taskSchema.index({ organizationId: 1, categoryId: 1 });

// 6. Reminder query index: supports bounded dueDate range scans and non-completed status filtering across all scopes
taskSchema.index({ dueDate: 1, status: 1 });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;
