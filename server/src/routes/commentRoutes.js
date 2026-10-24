import express from 'express';
import {
  addComment,
  getTaskComments,
  deleteComment,
  toggleCommentMute,
} from '../controllers/commentController.js';
import { protectAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { addCommentSchema } from '../validators/commentValidators.js';

const router = express.Router({ mergeParams: true });

router.use(protectAuth);

// Handles /api/tasks/:taskId/comments
router.post('/', validate(addCommentSchema), addComment);
router.get('/', getTaskComments);
router.post('/toggle-mute', toggleCommentMute);
router.delete('/:commentId', deleteComment);

export default router;
