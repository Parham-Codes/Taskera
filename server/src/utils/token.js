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

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  if (refreshToken) {
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
};

export const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
  });
};
