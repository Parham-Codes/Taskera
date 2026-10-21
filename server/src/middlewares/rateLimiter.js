import rateLimit from 'express-rate-limit';
import { errorResponse } from '../utils/apiResponse.js';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 requests per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, {
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      statusCode: 429,
    });
  },
});

export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(res, {
      message: 'Too many requests. Please slow down.',
      statusCode: 429,
    });
  },
});
