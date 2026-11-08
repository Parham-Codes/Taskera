import crypto from 'node:crypto';

/**
 * Middleware to authenticate n8n internal service requests using N8N_INTEGRATION_SECRET.
 * Requires: Authorization: Bearer <N8N_INTEGRATION_SECRET>
 *
 * Security guarantees:
 * - Constant-time comparison via crypto.timingSafeEqual to prevent timing attacks.
 * - Buffer length equality checked before timingSafeEqual to avoid errors.
 * - 503 Service Unavailable if N8N_INTEGRATION_SECRET is not configured on the server.
 * - 401 Unauthorized if Authorization header is missing or not in Bearer format.
 * - 403 Forbidden if the provided secret does not match.
 * - Never logs or leaks the secret in error messages, logs, or responses.
 */
export const verifyN8nAssistantSecret = (req, res, next) => {
  const configuredSecret = process.env.N8N_INTEGRATION_SECRET;

  if (!configuredSecret || configuredSecret.trim() === '') {
    return res.status(503).json({
      success: false,
      error: 'N8N integration secret is not configured on this server.',
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
  const configuredBuffer = Buffer.from(configuredSecret.trim(), 'utf8');

  if (providedBuffer.length !== configuredBuffer.length) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid authorization secret.',
    });
  }

  const matches = crypto.timingSafeEqual(providedBuffer, configuredBuffer);
  if (!matches) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid authorization secret.',
    });
  }

  next();
};

