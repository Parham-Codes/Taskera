import express from 'express';
import {
  getTelegramSettings,
  updateTelegramSettings,
  testTelegramNotification,
} from '../controllers/telegramController.js';
import { protectAuth } from '../middlewares/auth.js';

const router = express.Router();

// All telegram routes require user authentication
router.use(protectAuth);

router.get('/settings', getTelegramSettings);
router.put('/settings', updateTelegramSettings);
router.post('/test', testTelegramNotification);

export default router;
