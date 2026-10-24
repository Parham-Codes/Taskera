import crypto from 'crypto';

/**
 * Middleware to authenticate internal service requests using a shared secret.
 * Requires: Authorization: Bearer <REMINDER_TRIGGER_SECRET>
 *
 * Security guarantees:
 * - Constant-time comparison via crypto.timingSafeEqual (with buffer length checks) to prevent timing attacks.
 * - 503 Service Unavailable if REMINDER_TRIGGER_SECRET is not configured on the server.
 * - 401 Unauthorized if Authorization header is missing or not in Bearer format.
 * - 403 Forbidden if the provided secret does not match.
 * - Never prints or leaks the secret in error messages, logs, or responses.
 */
export const verifyInternalSecret = (req, res, next) => {
  const configuredSecret = process.env.REMINDER_TRIGGER_SECRET;

  if (!configuredSecret || configuredSecret.trim() === '') {
    return res.status(503).json({
      success: false,
      error: 'Internal service secret is not configured on this server.',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header is required and must use Bearer token format.',
    });
  }

  const providedSecret = authHeader.slice(7).trim();
  if (!providedSecret) {
    return res.status(401).json({
      success: false,
      error: 'Bearer token must not be empty.',
    });
  }

  const providedBuffer = Buffer.from(providedSecret, 'utf8');
  const configuredBuffer = Buffer.from(configuredSecret, 'utf8');

  // crypto.timingSafeEqual requires buffers of identical length.
  // Check length first; if mismatched, return 403 in a safe manner.
  if (providedBuffer.length !== configuredBuffer.length) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid authorization secret.',
    });
  }

  const isMatch = crypto.timingSafeEqual(providedBuffer, configuredBuffer);
  if (!isMatch) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid authorization secret.',
    });
  }

  next();
};
