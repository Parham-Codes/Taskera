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
import internalRoutes from './routes/internalRoutes.js';
import { csrfProtection } from './middlewares/csrfProtection.js';
import { generalApiLimiter } from './middlewares/rateLimiter.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const server = express();

// Configure Express proxy trust for reverse proxies (Render, Cloudflare, etc.)
// Setting to 1 trusts the first hop (the front-facing reverse proxy), ensuring req.ip
// correctly resolves to the real client IP from X-Forwarded-For and resolves the
// express-rate-limit ERR_ERL_UNEXPECTED_X_FORWARDED_FOR warning securely.
server.set('trust proxy', 1);

// Security HTTP headers
server.use(helmet());

// Cross-Origin Resource Sharing with credentials support (for httpOnly cookies)
// IMPORTANT ARCHITECTURAL NOTE FOR GITHUB PAGES DEPLOYMENT:
// Render's CLIENT_URL environment variable must be set to "https://parham-codes.github.io"
// without "/Taskera/" because CORS checks the origin (protocol + host + port), not the page path.
// Wildcards (origin: '*') cannot be used when credentials: true.
const getClientOrigin = () => {
  const configured = process.env.CLIENT_URL || 'http://localhost:5173';
  try {
    return new URL(configured).origin;
  } catch {
    return configured.trim().replace(/\/+$/, '');
  }
};

server.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. server-to-server, curl, non-browser test clients)
      if (!origin || origin === getClientOrigin()) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Body and Cookie Parsers
server.use(express.json({ limit: '10kb' }));
server.use(express.urlencoded({ extended: true, limit: '10kb' }));
server.use(cookieParser());

// CSRF Origin validation for unsafe HTTP methods (protects SameSite=None cross-origin cookies)
server.use(csrfProtection);

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
server.use('/api/internal', internalRoutes);

// Global Centralized Error Handler (must be last)
server.use(errorHandler);