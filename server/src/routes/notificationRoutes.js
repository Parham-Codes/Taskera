import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';
import { protectAuth } from '../middlewares/auth.js';

const router = express.Router();

router.use(protectAuth);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:notificationId/read', markAsRead);

export default router;
