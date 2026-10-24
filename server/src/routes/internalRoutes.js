import { Router } from 'express';
import { verifyInternalSecret } from '../middlewares/internalAuth.js';
import { runInternalReminders } from '../controllers/internalReminderController.js';

const router = Router();

// Internal reminders trigger endpoint (secured by REMINDER_TRIGGER_SECRET)
router.post('/reminders/run', verifyInternalSecret, runInternalReminders);

export default router;
