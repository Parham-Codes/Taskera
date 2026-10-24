import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { server } from "./app.js";
import connectDB from "./config/db.js";
import { startReminderScheduler, stopReminderScheduler } from "./services/reminderScheduler.js";

// Ensure .env is resolved even when executed outside server/ directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const PORT = process.env.PORT || 7000;

async function bootstrap() {
  await connectDB();

  // Start in-process reminder scheduler if enabled (defaults to true for local development)
  const isSchedulerEnabled = process.env.ENABLE_REMINDER_SCHEDULER !== 'false';
  if (isSchedulerEnabled) {
    console.log('[Server] In-process reminder scheduler is enabled.');
    startReminderScheduler();
  } else {
    console.log('[Server] In-process reminder scheduler is disabled (ENABLE_REMINDER_SCHEDULER=false). Recurring reminders will rely on external trigger.');
  }

  const httpServer = server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  const handleShutdown = (signal) => {
    console.log(`Received ${signal}. Shutting down server gracefully...`);
    stopReminderScheduler();
    httpServer.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap();

