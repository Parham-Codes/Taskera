import express from 'express';
import {
  addComment,
  getTaskComments,
  deleteComment,
} from '../controllers/commentController.js';
import { protectAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { addCommentSchema } from '../validators/commentValidators.js';

const router = express.Router({ mergeParams: true });

router.use(protectAuth);

// Handles /api/tasks/:taskId/comments
router.post('/', validate(addCommentSchema), addComment);
router.get('/', getTaskComments);
router.delete('/:commentId', deleteComment);

export default router;
