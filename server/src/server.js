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

  // Start background task reminder scheduler only after DB is connected
  startReminderScheduler();

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

