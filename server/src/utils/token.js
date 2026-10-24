import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

// Ensure .env is resolved even when executed outside server/ directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const getRequiredSecret = (secretName) => {
  const secret = process.env[secretName];
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    const errorMsg = `[FATAL ERROR] Required environment variable "${secretName}" is not set. The application cannot start without secure JWT secrets. Please define "${secretName}" in your server/.env file.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  return secret;
};

export const getAccessTokenSecret = () => getRequiredSecret('JWT_ACCESS_SECRET');
export const getRefreshTokenSecret = () => getRequiredSecret('JWT_REFRESH_SECRET');

// Validate immediately on module initialization to fail fast on startup if secrets are omitted
export const validateJwtSecrets = () => {
  getAccessTokenSecret();
  getRefreshTokenSecret();
};

validateJwtSecrets();

export const generateTokens = (userId) => {
  const accessToken = jwt.sign({ sub: userId }, getAccessTokenSecret(), {
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ sub: userId }, getRefreshTokenSecret(), {
    expiresIn: '7d',
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, getAccessTokenSecret());
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshTokenSecret());
};

/**
 * Resolves cookie attributes based on environment and AUTH_COOKIE_SAME_SITE setting.
 * Accepts only 'strict', 'lax', or 'none'.
 * Defaults:
 *   - Production: 'strict', secure: true, httpOnly: true
 *   - Development: 'lax', secure: false, httpOnly: true
 * When explicitly set to 'none':
 *   - sameSite: 'none', secure: true (mandated by browsers), httpOnly: true
 */
export const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const rawSameSite = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();

  let sameSite = isProduction ? 'strict' : 'lax';
  if (rawSameSite === 'strict' || rawSameSite === 'lax' || rawSameSite === 'none') {
    sameSite = rawSameSite;
  }

  // SameSite=None requires Secure=true in all modern browsers; otherwise the browser rejects the cookie.
  const secure = sameSite === 'none' ? true : isProduction;

  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
  };
};

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const baseOptions = getAuthCookieOptions();

  res.cookie('accessToken', accessToken, {
    ...baseOptions,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      ...baseOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
};

export const clearAuthCookies = (res) => {
  const baseOptions = getAuthCookieOptions();

  res.clearCookie('accessToken', baseOptions);
  res.clearCookie('refreshToken', baseOptions);
};
