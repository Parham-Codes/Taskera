/**
 * CSRF Protection Middleware
 *
 * Protects state-changing browser requests when cookies are configured with SameSite=None.
 * - Bypasses safe HTTP methods (GET, HEAD, OPTIONS).
 * - Bypasses separately authenticated internal endpoints (/api/internal and /api/internal/...).
 * - In production, rejects unsafe requests when both Origin and Referer headers are absent.
 * - In non-production (test/development), allows requests without Origin/Referer to support non-browser test suites.
 * - Validates Origin (or Referer) against the configured CLIENT_URL origin.
 * - Rejects unauthorized origins with 403 Forbidden.
 */

export const getExpectedOrigin = () => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  try {
    return new URL(clientUrl).origin;
  } catch {
    return clientUrl.trim().replace(/\/+$/, '');
  }
};

export const csrfProtection = (req, res, next) => {
  // 1. Safe HTTP methods do not mutate state and are safe from CSRF
  // Note: CORS preflight requests use OPTIONS and must pass through
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 2. Separately authenticated internal endpoints use Bearer tokens, not cookies.
  // Match '/api/internal' or '/api/internal/...' only (not arbitrary prefixes like '/api/internal-hack')
  const path = req.path || '';
  const baseUrl = req.baseUrl || '';
  const isInternal =
    baseUrl === '/api/internal' ||
    path === '/api/internal' ||
    path.startsWith('/api/internal/');

  if (isInternal) {
    return next();
  }

  // 2b. Telegram Bot Webhook endpoint receives server-to-server callbacks verified via X-Telegram-Bot-Api-Secret-Token
  const originalUrl = req.originalUrl || '';
  const isTelegramWebhook =
    originalUrl === '/api/telegram/approval-webhook' ||
    originalUrl.startsWith('/api/telegram/approval-webhook?') ||
    path === '/api/telegram/approval-webhook' ||
    (baseUrl === '/api/telegram' && (path === '/approval-webhook' || path === 'approval-webhook'));

  if (isTelegramWebhook) {
    return next();
  }

  // 3. Extract request origin from Origin or Referer header
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;

  let requestOrigin = null;
  if (originHeader) {
    requestOrigin = originHeader.trim();
  } else if (refererHeader) {
    try {
      requestOrigin = new URL(refererHeader).origin;
    } catch {
      requestOrigin = null;
    }
  }

  // 4. In production, unsafe requests MUST contain an Origin or Referer header.
  // In non-production (test/development), non-browser test clients omitting Origin/Referer
  // are permitted to support automated testing suites and local tooling.
  if (!requestOrigin) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Request origin or referer header is required for state-changing operations.',
      });
    }
    return next();
  }

  // 5. Compare with expected frontend origin
  const expectedOrigin = getExpectedOrigin();
  const normalizedRequestOrigin = requestOrigin.replace(/\/+$/, '');

  if (normalizedRequestOrigin !== expectedOrigin) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Request origin not allowed for state-changing operations.',
    });
  }

  next();
};
