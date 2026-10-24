import './testSetup.js';
import http from 'http';
import { server } from '../src/app.js';
import mongoose from 'mongoose';
import { getAuthCookieOptions, setAuthCookies, clearAuthCookies } from '../src/utils/token.js';
import { getExpectedOrigin } from '../src/middlewares/csrfProtection.js';
import { _setSchedulerProcessing } from '../src/services/reminderScheduler.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

const runCrossOriginAuthTests = async () => {
  console.log('--- STARTING CROSS-ORIGIN AUTH, COOKIE POLICY & CSRF REGRESSION TESTS ---');

  // =========================================================================
  // [1] Cookie Configuration & getAuthCookieOptions
  // =========================================================================
  console.log('\n[1] Cookie Configuration Options:');

  const origNodeEnv = process.env.NODE_ENV;
  const origSameSite = process.env.AUTH_COOKIE_SAME_SITE;

  try {
    // 1.1 Development Default (lax, secure: false)
    process.env.NODE_ENV = 'development';
    delete process.env.AUTH_COOKIE_SAME_SITE;
    const devOpts = getAuthCookieOptions();
    assert(devOpts.sameSite === 'lax', `Dev default sameSite must be 'lax', got: ${devOpts.sameSite}`);
    assert(devOpts.secure === false, `Dev default secure must be false, got: ${devOpts.secure}`);
    assert(devOpts.httpOnly === true, 'Dev httpOnly must be true');
    console.log('  1.1 Development default (sameSite=lax, secure=false, httpOnly=true): PASS');

    // 1.2 Production Default (strict, secure: true)
    process.env.NODE_ENV = 'production';
    delete process.env.AUTH_COOKIE_SAME_SITE;
    const prodOpts = getAuthCookieOptions();
    assert(prodOpts.sameSite === 'strict', `Prod default sameSite must be 'strict', got: ${prodOpts.sameSite}`);
    assert(prodOpts.secure === true, `Prod default secure must be true, got: ${prodOpts.secure}`);
    assert(prodOpts.httpOnly === true, 'Prod httpOnly must be true');
    console.log('  1.2 Production default (sameSite=strict, secure=true, httpOnly=true): PASS');

    // 1.3 SameSite=none explicitly configured (SameSite=none; Secure=true; HttpOnly=true)
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SAME_SITE = 'none';
    const noneOpts = getAuthCookieOptions();
    assert(noneOpts.sameSite === 'none', `Configured none must return sameSite='none', got: ${noneOpts.sameSite}`);
    assert(noneOpts.secure === true, 'SameSite=none requires secure: true in all browsers');
    assert(noneOpts.httpOnly === true, 'SameSite=none must retain httpOnly: true');
    console.log('  1.3 Explicit AUTH_COOKIE_SAME_SITE=none (sameSite=none, secure=true, httpOnly=true): PASS');

    // 1.4 SameSite=none in non-production still requires secure=true for modern browser specs
    process.env.NODE_ENV = 'development';
    process.env.AUTH_COOKIE_SAME_SITE = 'none';
    const noneDevOpts = getAuthCookieOptions();
    assert(noneDevOpts.sameSite === 'none', 'sameSite must be none');
    assert(noneDevOpts.secure === true, 'secure must be true whenever sameSite is none');
    console.log('  1.4 SameSite=none in dev enforces secure=true: PASS');

    // 1.5 SameSite=lax explicitly configured
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SAME_SITE = 'lax';
    const laxOpts = getAuthCookieOptions();
    assert(laxOpts.sameSite === 'lax', `sameSite must be 'lax', got: ${laxOpts.sameSite}`);
    console.log('  1.5 Explicit AUTH_COOKIE_SAME_SITE=lax: PASS');

    // 1.6 Invalid SameSite falls back safely to default
    process.env.NODE_ENV = 'production';
    process.env.AUTH_COOKIE_SAME_SITE = 'invalid_unknown_value';
    const fallbackOpts = getAuthCookieOptions();
    assert(fallbackOpts.sameSite === 'strict', 'Invalid setting must fall back to strict in production');
    console.log('  1.6 Invalid AUTH_COOKIE_SAME_SITE falls back safely: PASS');

    // 1.7 Mock res check for setAuthCookies and clearAuthCookies
    const cookiesSet = {};
    const cookiesCleared = {};
    const mockRes = {
      cookie: (name, val, opts) => { cookiesSet[name] = { val, opts }; },
      clearCookie: (name, opts) => { cookiesCleared[name] = opts; },
    };

    process.env.AUTH_COOKIE_SAME_SITE = 'none';
    setAuthCookies(mockRes, { accessToken: 'acc_123', refreshToken: 'ref_456' });
    assert(cookiesSet.accessToken.opts.sameSite === 'none', 'setAuthCookies accessToken sameSite=none');
    assert(cookiesSet.accessToken.opts.secure === true, 'setAuthCookies accessToken secure=true');
    assert(cookiesSet.refreshToken.opts.sameSite === 'none', 'setAuthCookies refreshToken sameSite=none');
    assert(cookiesSet.accessToken.opts.maxAge === 15 * 60 * 1000, 'accessToken maxAge is 15min');
    assert(cookiesSet.refreshToken.opts.maxAge === 7 * 24 * 60 * 60 * 1000, 'refreshToken maxAge is 7d');

    clearAuthCookies(mockRes);
    assert(cookiesCleared.accessToken.sameSite === 'none', 'clearAuthCookies accessToken sameSite=none');
    assert(cookiesCleared.refreshToken.sameSite === 'none', 'clearAuthCookies refreshToken sameSite=none');
    assert(cookiesCleared.accessToken.secure === true, 'clearAuthCookies accessToken secure=true');
    console.log('  1.7 setAuthCookies and clearAuthCookies use synchronized attributes: PASS');
  } finally {
    process.env.NODE_ENV = origNodeEnv;
    if (origSameSite) {
      process.env.AUTH_COOKIE_SAME_SITE = origSameSite;
    } else {
      delete process.env.AUTH_COOKIE_SAME_SITE;
    }
  }

  // =========================================================================
  // [2] Live Server Origin Validation & CSRF Protection
  // =========================================================================
  console.log('\n[2] CSRF & Browser Origin Validation:');

  const httpServer = http.createServer(server);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const origClientUrl = process.env.CLIENT_URL;
  const origNodeEnv2 = process.env.NODE_ENV;
  process.env.CLIENT_URL = 'https://parham-codes.github.io';

  try {
    assert(getExpectedOrigin() === 'https://parham-codes.github.io', 'getExpectedOrigin resolves cleanly');

    // 2.1 Allowed frontend origin -> accepted by CSRF validation on unsafe method (POST)
    // Sending empty body triggers schema validation (400 Bad Request) rather than CSRF rejection (403 Forbidden)
    const resAllowedOrigin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'https://parham-codes.github.io',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert(
      resAllowedOrigin.status === 400,
      `Allowed origin must pass CSRF and reach validation (expected 400, got ${resAllowedOrigin.status})`
    );
    console.log('  2.1 Matching allowed Origin passes CSRF protection: PASS');

    // 2.2 Disallowed origin -> rejected with 403 Forbidden
    const resDisallowedOrigin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        Origin: 'https://malicious-attacker.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const disallowedBody = await resDisallowedOrigin.json();
    assert(
      resDisallowedOrigin.status === 403,
      `Expected status 403 for disallowed origin, got ${resDisallowedOrigin.status}`
    );
    assert(disallowedBody.success === false, 'Body must have success: false');
    assert(disallowedBody.message.includes('origin not allowed'), 'Body message must mention origin');
    console.log('  2.2 Disallowed Origin rejected with 403 Forbidden: PASS');

    // 2.3 Production: Unsafe request with neither Origin nor Referer -> REJECTED with 403
    process.env.NODE_ENV = 'production';
    const resProdNoHeaders = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    const prodNoHeadersBody = await resProdNoHeaders.json();
    assert(
      resProdNoHeaders.status === 403,
      `Production unsafe request without Origin/Referer must return 403, got ${resProdNoHeaders.status}`
    );
    assert(
      prodNoHeadersBody.message.includes('origin or referer header is required'),
      'Body message must specify origin or referer is required'
    );
    console.log('  2.3 Production unsafe request with neither header rejected with 403: PASS');

    // 2.4 Production: Safe methods (GET, HEAD, OPTIONS) remain unaffected without headers
    const resProdSafeGet = await fetch(`${baseUrl}/health`);
    assert(resProdSafeGet.status === 200, 'Production safe GET without origin must succeed with 200');

    const resProdPreflight = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://parham-codes.github.io',
        'Access-Control-Request-Method': 'POST',
      },
    });
    assert(
      resProdPreflight.headers.get('access-control-allow-origin') === 'https://parham-codes.github.io',
      'CORS Preflight (OPTIONS) in production succeeds with matching origin'
    );
    console.log('  2.4 Production safe methods (GET, OPTIONS) remain unaffected: PASS');

    // 2.5 Non-production (test/dev): Unsafe request with neither header is permitted for test clients
    process.env.NODE_ENV = 'test';
    const resTestNoHeaders = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    assert(
      resTestNoHeaders.status === 400,
      `Non-production test client without Origin must pass CSRF to validation (expected 400, got ${resTestNoHeaders.status})`
    );
    console.log('  2.5 Non-production test client without Origin/Referer permitted: PASS');

    // =========================================================================
    // [3] Internal Reminder Endpoint Exemption & Path Tightening
    // =========================================================================
    console.log('\n[3] Internal Reminder Endpoint Exemption & Tightening:');

    const origSecret = process.env.REMINDER_TRIGGER_SECRET;
    const TEST_TRIGGER_SECRET = 'secret_32_chars_long_trigger_key_1234!';
    process.env.REMINDER_TRIGGER_SECRET = TEST_TRIGGER_SECRET;

    // Simulate active processing cycle so endpoint responds with 409 Conflict immediately without DB queries
    _setSchedulerProcessing(true);

    // 3.1 Authenticated internal reminder endpoint remains functional in production without Origin/Referer
    process.env.NODE_ENV = 'production';
    const resInternalNoHeaders = await fetch(`${baseUrl}/api/internal/reminders/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_TRIGGER_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    assert(
      resInternalNoHeaders.status === 409,
      `Internal endpoint must not be blocked by CSRF in production without headers (expected 409, got status ${resInternalNoHeaders.status})`
    );
    console.log('  3.1 Authenticated internal reminder endpoint functional without headers in production: PASS');

    // 3.2 Authenticated internal reminder endpoint functional with external origin
    const resInternalWithOrigin = await fetch(`${baseUrl}/api/internal/reminders/run`, {
      method: 'POST',
      headers: {
        Origin: 'https://some-external-scheduler.org',
        Authorization: `Bearer ${TEST_TRIGGER_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    assert(
      resInternalWithOrigin.status === 409,
      `Internal endpoint must not be blocked by CSRF with external origin (expected 409, got status ${resInternalWithOrigin.status})`
    );
    console.log('  3.2 Internal reminder endpoint bypasses CSRF with external origin: PASS');

    // 3.3 Tightened path matching: arbitrary prefix like /api/internal-hack is NOT exempt
    const resInternalFakePrefix = await fetch(`${baseUrl}/api/internal-fake-endpoint`, {
      method: 'POST',
      headers: {
        Origin: 'https://malicious-attacker.com',
        'Content-Type': 'application/json',
      },
    });
    assert(
      resInternalFakePrefix.status === 403,
      `Fake prefix /api/internal-fake-endpoint must NOT be exempt from CSRF (got status ${resInternalFakePrefix.status})`
    );
    console.log('  3.3 Arbitrary path sharing /api/internal prefix is strictly blocked: PASS');

    // =========================================================================
    // [4] Express Proxy Trust & Rate Limiter Client IP Resolution
    // =========================================================================
    console.log('\n[4] Express Proxy Trust & Rate Limiter IP Resolution:');

    // 4.1 Server trust proxy setting is configured to 1 (trust 1 front-facing proxy hop)
    assert(server.get('trust proxy') === 1, `Expected server trust proxy to be 1, got ${server.get('trust proxy')}`);
    console.log('  4.1 server.get("trust proxy") is configured to 1: PASS');

    // 4.2 X-Forwarded-For header processed cleanly by rate limiter without ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
    const resProxyIp1 = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'X-Forwarded-For': '203.0.113.195',
      },
    });
    // Should get 401 Unauthorized (missing auth cookie) with standard RateLimit headers, NOT an unhandled 500
    assert(resProxyIp1.status === 401, `Expected 401 from auth check, got ${resProxyIp1.status}`);
    assert(
      resProxyIp1.headers.has('ratelimit-limit') || resProxyIp1.headers.has('x-ratelimit-limit'),
      'Rate limit headers must be present on /api route'
    );
    console.log('  4.2 X-Forwarded-For header handled without ERR_ERL_UNEXPECTED_X_FORWARDED_FOR: PASS');

    // 4.3 Different client IPs tracked in distinct rate limiter buckets
    const resProxyIp2 = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        'X-Forwarded-For': '198.51.100.42',
      },
    });
    assert(resProxyIp2.status === 401, 'Request from distinct IP returns 401');
    const remainingIp2 = parseInt(resProxyIp2.headers.get('ratelimit-remaining') || resProxyIp2.headers.get('x-ratelimit-remaining'), 10);
    // Since 198.51.100.42 made 1 request to generalApiLimiter (max 300), remaining must be 299
    assert(remainingIp2 === 299, `Expected remaining to be 299 for fresh IP, got ${remainingIp2}`);
    console.log('  4.3 Rate limiter isolates distinct client IPs resolved through proxy: PASS');

    if (origSecret) {
      process.env.REMINDER_TRIGGER_SECRET = origSecret;
    } else {
      delete process.env.REMINDER_TRIGGER_SECRET;
    }
  } finally {
    _setSchedulerProcessing(false);
    process.env.CLIENT_URL = origClientUrl;
    process.env.NODE_ENV = origNodeEnv2;
    await new Promise((resolve) => httpServer.close(resolve));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  }

  console.log('\n--- ALL CROSS-ORIGIN AUTH & CSRF TESTS PASSED SUCCESSFULLY ---\n');
};

runCrossOriginAuthTests().catch((err) => {
  console.error('\n[FATAL TEST FAILURE]', err);
  process.exit(1);
});
