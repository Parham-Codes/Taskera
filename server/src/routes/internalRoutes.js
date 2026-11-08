import { Router } from 'express';
import { verifyInternalSecret } from '../middlewares/internalAuth.js';
import { verifyN8nAssistantSecret } from '../middlewares/n8nAuth.js';
import { runInternalReminders } from '../controllers/internalReminderController.js';
import { createTaskFromTelegramAssistant } from '../controllers/telegramAssistantController.js';

const router = Router();

// Internal reminders trigger endpoint (secured by REMINDER_TRIGGER_SECRET)
router.post('/reminders/run', verifyInternalSecret, runInternalReminders);

// Internal Telegram Assistant endpoint for n8n (secured by N8N_INTEGRATION_SECRET)
router.post('/telegram/assistant/tasks', verifyN8nAssistantSecret, createTaskFromTelegramAssistant);

export default router;
