import express from 'express';
import {
  createTask,
  batchCreateTasks,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  startTimeTracking,
  pauseTimeTracking,
  stopTimeTracking,
  toggleSubtask,
} from '../controllers/taskController.js';
import commentRoutes from './commentRoutes.js';
import { protectAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createTaskSchema, updateTaskSchema } from '../validators/taskValidators.js';

const router = express.Router();

router.use(protectAuth);

// Nested comments for tasks
router.use('/:taskId/comments', commentRoutes);

// Time tracking
router.post('/:taskId/time/start', startTimeTracking);
router.post('/:taskId/time/pause', pauseTimeTracking);
router.post('/:taskId/time/stop', stopTimeTracking);

// Subtask status toggle
router.patch('/:taskId/subtasks/:subtaskId/toggle', toggleSubtask);

// Batch task creation (AI Markdown import)
router.post('/batch', batchCreateTasks);

// Core task CRUD
router.post('/', validate(createTaskSchema), createTask);
router.get('/', getTasks);
router.get('/:taskId', getTaskById);
router.patch('/:taskId', validate(updateTaskSchema), updateTask);
router.delete('/:taskId', deleteTask);

export default router;
