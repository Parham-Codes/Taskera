import express from 'express';
import {
  getTelegramSettings,
  updateTelegramSettings,
  testTelegramNotification,
  handleTelegramApprovalWebhook,
} from '../controllers/telegramController.js';
import { protectAuth } from '../middlewares/auth.js';

const router = express.Router();

// Public webhook receiver for Telegram Bot callbacks (authenticated via secret token header)
router.post('/approval-webhook', handleTelegramApprovalWebhook);

// All subsequent user telegram routes require standard session authentication
router.use(protectAuth);

router.get('/settings', getTelegramSettings);
router.put('/settings', updateTelegramSettings);
router.post('/test', testTelegramNotification);

export default router;
