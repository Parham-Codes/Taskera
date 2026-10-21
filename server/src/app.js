import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import telegramRoutes from './routes/telegramRoutes.js';
import { generalApiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const server = express();

// Security HTTP headers
server.use(helmet());

// Cross-Origin Resource Sharing with credentials support (for httpOnly cookies)
server.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body and Cookie Parsers
server.use(express.json({ limit: '10kb' }));
server.use(express.urlencoded({ extended: true, limit: '10kb' }));
server.use(cookieParser());

// Base Health Check
server.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply general rate limiter to API routes
server.use('/api', generalApiLimiter);

// API Modules
server.use('/api/auth', authRoutes);
server.use('/api/organizations', organizationRoutes);
server.use('/api/tasks', taskRoutes);
server.use('/api/notifications', notificationRoutes);
server.use('/api/categories', categoryRoutes);
server.use('/api/telegram', telegramRoutes);

// Global Centralized Error Handler (must be last)
server.use(errorHandler);