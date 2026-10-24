import { z } from 'zod';
import { TASK_STATUS, TASK_PRIORITY } from '../models/task.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createTaskSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Task title is required' })
      .trim()
      .min(2, 'Title must be at least 2 characters')
      .max(150, 'Title cannot exceed 150 characters'),
    description: z.string().trim().max(5000).optional().default(''),
    status: z
      .enum(Object.values(TASK_STATUS))
      .optional()
      .default(TASK_STATUS.TODO),
    priority: z
      .enum(Object.values(TASK_PRIORITY))
      .optional()
      .default(TASK_PRIORITY.MEDIUM),
    dueDate: z.string().datetime().nullable().optional(),
    organizationId: z.string().regex(objectIdRegex, 'Invalid Organization ID').nullable().optional(),
    assignedTo: z
      .union([
        z.string().regex(objectIdRegex, 'Invalid Assigned User ID'),
        z.array(z.string().regex(objectIdRegex, 'Invalid Assigned User ID')),
      ])
      .nullable()
      .optional(),
    categoryId: z.string().regex(objectIdRegex, 'Invalid Category ID').nullable().optional(),
    subtasks: z
      .array(
        z.object({
          _id: z.string().optional(),
          title: z.string().trim().min(1, 'Subtask title cannot be empty').max(200),
          completed: z.boolean().optional().default(false),
          completedAt: z.union([z.string(), z.date()]).nullable().optional(),
        })
      )
      .optional()
      .default([]),
    tags: z.array(z.string().trim()).optional().default([]),
    order: z.number().int().optional().default(0),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(150).optional(),
    description: z.string().trim().max(5000).optional(),
    status: z.enum(Object.values(TASK_STATUS)).optional(),
    priority: z.enum(Object.values(TASK_PRIORITY)).optional(),
    dueDate: z.string().datetime().nullable().optional(),
    assignedTo: z
      .union([
        z.string().regex(objectIdRegex, 'Invalid Assigned User ID'),
        z.array(z.string().regex(objectIdRegex, 'Invalid Assigned User ID')),
      ])
      .nullable()
      .optional(),
    categoryId: z.string().regex(objectIdRegex, 'Invalid Category ID').nullable().optional(),
    subtasks: z
      .array(
        z.object({
          _id: z.string().optional(),
          title: z.string().trim().min(1).max(200),
          completed: z.boolean().optional(),
          completedAt: z.union([z.string(), z.date()]).nullable().optional(),
        })
      )
      .optional(),
    tags: z.array(z.string().trim()).optional(),
    order: z.number().int().optional(),
  }),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(Object.values(TASK_STATUS), {
      required_error: 'Status is required',
    }),
  }),
});
