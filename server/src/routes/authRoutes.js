import express from 'express';
import { register, login, logout, refresh, getMe, updateTimezone } from '../controllers/authController.js';
import { validate } from '../middlewares/validate.js';
import { protectAuth } from '../middlewares/auth.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import { registerSchema, loginSchema } from '../validators/authValidators.js';

const router = express.Router();

// Public auth routes protected with brute-force rate limiter
router.post('/register', authRateLimiter, validate(registerSchema), register);
router.post('/login', authRateLimiter, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', logout);

// Protected session route
router.get('/me', protectAuth, getMe);
router.patch('/timezone', protectAuth, updateTimezone);

export default router;