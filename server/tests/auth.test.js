import './testSetup.js';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { server } from '../src/app.js';
import connectDB from '../src/config/db.js';
import { User } from '../src/models/index.js';
import { getAccessTokenSecret, getRefreshTokenSecret } from '../src/utils/token.js';

function parseSetCookies(setCookieHeaders) {
  const headers = Array.isArray(setCookieHeaders)
    ? setCookieHeaders
    : setCookieHeaders ? [setCookieHeaders] : [];

  const cookies = {};
  for (const str of headers) {
    const parts = str.split(';').map((p) => p.trim());
    const [name, ...valParts] = parts[0].split('=');
    const val = valParts.join('=');
    cookies[name] = {
      value: val,
      raw: str,
      httpOnly: parts.some((p) => p.toLowerCase() === 'httponly'),
      secure: parts.some((p) => p.toLowerCase() === 'secure'),
      sameSite: parts.find((p) => p.toLowerCase().startsWith('samesite='))?.split('=')[1],
      maxAge: parts.find((p) => p.toLowerCase().startsWith('max-age='))?.split('=')[1],
      path: parts.find((p) => p.toLowerCase().startsWith('path='))?.split('=')[1],
    };
  }
  return cookies;
}

function buildCookieHeader(cookieObj) {
  return Object.entries(cookieObj)
    .filter(([_, data]) => data && data.value)
    .map(([name, data]) => `${name}=${data.value}`)
    .join('; ');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

const runAuthTests = async () => {
  console.log('--- STARTING COMPREHENSIVE AUTH & SESSION AUTOMATED TESTS ---');
  await connectDB();

  // Spin up an ephemeral HTTP server on a random free port for real end-to-end HTTP pipeline tests
  const httpServer = http.createServer(server);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const TEST_EMAIL = 'auth_session_test@taskera.local';
  const TEST_PASSWORD = 'StrongPassword123!';
  let sessionCookies = {};

  try {
    // 0. Pre-test cleanup
    await User.deleteMany({ email: { $in: [TEST_EMAIL, 'duplicate_test@taskera.local'] } });

    // ==========================================
    // 1. REGISTRATION TESTS
    // ==========================================
    console.log('\n[1] Registration Tests:');

    // 1.1 Successful Registration
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Auth Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, `Expected status 201 on registration, got ${regRes.status}`);
    assert(regData.success === true, 'Expected success === true');
    assert(regData.data?.user?.email === TEST_EMAIL, `Expected email ${TEST_EMAIL}`);
    assert(regData.data?.user?.password === undefined, 'Password must not be returned in response');
    assert(regData.data?.user?.refreshToken === undefined, 'Refresh token must not be leaked in response JSON');

    const regCookies = parseSetCookies(regRes.headers.getSetCookie());
    assert(regCookies.accessToken?.value, 'Missing accessToken cookie in register response');
    assert(regCookies.refreshToken?.value, 'Missing refreshToken cookie in register response');
    console.log('  1.1 Successful Registration: PASS (Status 201, Cookies Set)');

    // 1.2 Invalid Input Validation (Zod Validation)
    const badRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'A', // too short
        email: 'invalid-email-format',
        password: '123', // too short
      }),
    });
    const badRegData = await badRegRes.json();
    assert(badRegRes.status === 400, `Expected status 400 for invalid inputs, got ${badRegRes.status}`);
    assert(badRegData.success === false, 'Expected success === false for invalid inputs');
    assert(Array.isArray(badRegData.errors), 'Expected validation errors array');
    console.log('  1.2 Invalid Input Validation: PASS (Status 400, Zod Errors Caught)');

    // 1.3 Duplicate Registration Rejection
    const dupRegRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    const dupRegData = await dupRegRes.json();
    assert(dupRegRes.status === 409, `Expected status 409 for duplicate registration, got ${dupRegRes.status}`);
    assert(dupRegData.success === false, 'Expected success === false for duplicate registration');
    console.log('  1.3 Duplicate Registration Rejection: PASS (Status 409 Conflict)');

    // ==========================================
    // 2. LOGIN TESTS
    // ==========================================
    console.log('\n[2] Login Tests:');

    // 2.1 Incorrect Password
    const wrongPassRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'IncorrectPassword999!',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert(wrongPassRes.status === 401, `Expected status 401 for incorrect password, got ${wrongPassRes.status}`);
    assert(wrongPassData.message === 'Invalid email or password', 'Expected Invalid email or password message');
    console.log('  2.1 Incorrect Password Rejection: PASS (Status 401 Unauthorized)');

    // 2.2 Non-Existent User Login
    const noUserRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent_user_xyz@taskera.local',
        password: TEST_PASSWORD,
      }),
    });
    assert(noUserRes.status === 401, `Expected status 401 for non-existent user, got ${noUserRes.status}`);
    console.log('  2.2 Non-Existent User Rejection: PASS (Status 401 Unauthorized)');

    // 2.3 Successful Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, `Expected status 200 on login, got ${loginRes.status}`);
    assert(loginData.success === true, 'Expected success === true on login');
    sessionCookies = parseSetCookies(loginRes.headers.getSetCookie());
    assert(sessionCookies.accessToken?.value, 'Missing accessToken on login');
    assert(sessionCookies.refreshToken?.value, 'Missing refreshToken on login');

    // Verify DB user record has refresh token saved
    const dbUserAfterLogin = await User.findOne({ email: TEST_EMAIL }).select('+refreshToken').lean();
    assert(dbUserAfterLogin.refreshToken === sessionCookies.refreshToken.value, 'DB refresh token must match login cookie');
    console.log('  2.3 Successful Login: PASS (Status 200, DB RefreshToken Stored)');

    // ==========================================
    // 3. PROTECTED ROUTE ACCESS TESTS (/api/auth/me)
    // ==========================================
    console.log('\n[3] Protected Route Access Tests:');

    // 3.1 Access Without Token
    const noTokenRes = await fetch(`${baseUrl}/api/auth/me`);
    const noTokenData = await noTokenRes.json();
    assert(noTokenRes.status === 401, `Expected status 401 without token, got ${noTokenRes.status}`);
    assert(noTokenData.message.includes('Authentication required'), 'Expected Authentication required message');
    console.log('  3.1 Access Without Token: PASS (Status 401 Blocked)');

    // 3.2 Access With Malformed/Tampered Token
    const tamperedRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: 'accessToken=malformed.tampered.signature' },
    });
    const tamperedData = await tamperedRes.json();
    assert(tamperedRes.status === 401, `Expected status 401 with tampered token, got ${tamperedRes.status}`);
    assert(tamperedData.message === 'Invalid access token', 'Expected Invalid access token message');
    console.log('  3.2 Malformed Token Access: PASS (Status 401 Blocked)');

    // 3.3 Access With Expired Token
    const expiredAccessToken = jwt.sign(
      { sub: dbUserAfterLogin._id.toString() },
      getAccessTokenSecret(),
      { expiresIn: '-10s' }
    );
    const expiredRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: `accessToken=${expiredAccessToken}` },
    });
    const expiredData = await expiredRes.json();
    assert(expiredRes.status === 401, `Expected status 401 with expired token, got ${expiredRes.status}`);
    assert(expiredData.message === 'Access token expired', 'Expected Access token expired message');
    assert(expiredData.errors?.[0]?.code === 'TOKEN_EXPIRED', 'Expected TOKEN_EXPIRED error code');
    console.log('  3.3 Expired Token Access: PASS (Status 401 with TOKEN_EXPIRED Code)');

    // 3.4 Valid Token Access via Cookie
    const validCookieRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: buildCookieHeader(sessionCookies) },
    });
    const validCookieData = await validCookieRes.json();
    assert(validCookieRes.status === 200, `Expected status 200 with valid cookie, got ${validCookieRes.status}`);
    assert(validCookieData.data?.user?.email === TEST_EMAIL, 'Returned user email must match');
    console.log('  3.4 Valid Token Access via Cookie: PASS (Status 200 Authorized)');

    // 3.5 Valid Token Access via Authorization Header (Bearer fallback)
    const validHeaderRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${sessionCookies.accessToken.value}` },
    });
    const validHeaderData = await validHeaderRes.json();
    assert(validHeaderRes.status === 200, `Expected status 200 with Bearer header, got ${validHeaderRes.status}`);
    assert(validHeaderData.data?.user?.email === TEST_EMAIL, 'Returned user email must match');
    console.log('  3.5 Valid Token Access via Bearer Header: PASS (Status 200 Authorized)');

    // ==========================================
    // 4. REFRESH TOKEN ROTATION & VALIDATION TESTS
    // ==========================================
    console.log('\n[4] Refresh Token Rotation Tests:');

    const oldRefreshToken = sessionCookies.refreshToken.value;

    // Advance 1s so JWT timestamp advances and produces a distinct cryptographic signature
    await new Promise((resolve) => setTimeout(resolve, 1050));

    // 4.1 Valid Refresh Token Rotation
    const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${oldRefreshToken}` },
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, `Expected status 200 on token refresh, got ${refreshRes.status}`);
    assert(refreshData.message === 'Token refreshed', 'Expected Token refreshed message');

    const rotatedCookies = parseSetCookies(refreshRes.headers.getSetCookie());
    assert(rotatedCookies.accessToken?.value, 'Missing new accessToken on refresh');
    assert(rotatedCookies.refreshToken?.value, 'Missing new refreshToken on refresh');
    assert(rotatedCookies.refreshToken.value !== oldRefreshToken, 'RefreshToken must rotate to a new value');

    // Verify DB was updated with the rotated refresh token
    const dbUserAfterRefresh = await User.findOne({ email: TEST_EMAIL }).select('+refreshToken').lean();
    assert(dbUserAfterRefresh.refreshToken === rotatedCookies.refreshToken.value, 'DB must reflect rotated refresh token');
    console.log('  4.1 Valid Refresh Token: PASS (Status 200, Tokens Rotated, DB Updated)');

    // 4.2 Replay / Old Refresh Token Rejection
    const oldTokenRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${oldRefreshToken}` },
    });
    assert(oldTokenRes.status === 401, `Expected status 401 when reusing old refresh token, got ${oldTokenRes.status}`);
    console.log('  4.2 Replay/Revoked Token Rejection: PASS (Status 401 Session Revoked)');

    // 4.3 Missing Refresh Token
    const noRefreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
    });
    assert(noRefreshRes.status === 401, `Expected status 401 with missing refresh token, got ${noRefreshRes.status}`);
    console.log('  4.3 Missing Refresh Token: PASS (Status 401 Blocked)');

    // 4.4 Forged / Malformed Refresh Token
    const bogusRefreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: 'refreshToken=bogus_unverifiable_signature' },
    });
    assert(bogusRefreshRes.status === 401, `Expected status 401 with bogus refresh token, got ${bogusRefreshRes.status}`);
    console.log('  4.4 Malformed Refresh Token: PASS (Status 401 Blocked)');

    // 4.5 Expired Refresh Token
    const expiredRefreshToken = jwt.sign(
      { sub: dbUserAfterLogin._id.toString() },
      getRefreshTokenSecret(),
      { expiresIn: '-10s' }
    );
    const expiredRefreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${expiredRefreshToken}` },
    });
    assert(expiredRefreshRes.status === 401, `Expected status 401 with expired refresh token, got ${expiredRefreshRes.status}`);
    console.log('  4.5 Expired Refresh Token: PASS (Status 401 Blocked)');

    // Update active session with the rotated refresh cookies
    sessionCookies = rotatedCookies;

    // ==========================================
    // 5. LOGOUT AND POST-LOGOUT BEHAVIOR TESTS
    // ==========================================
    console.log('\n[5] Logout and Session Revocation Tests:');

    // 5.1 Successful Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${sessionCookies.refreshToken.value}` },
    });
    const logoutData = await logoutRes.json();
    assert(logoutRes.status === 200, `Expected status 200 on logout, got ${logoutRes.status}`);
    assert(logoutData.message === 'Logged out successfully', 'Expected Logged out successfully message');

    // Check Set-Cookie headers clear the cookies
    const clearCookies = parseSetCookies(logoutRes.headers.getSetCookie());
    assert(clearCookies.accessToken?.value === '', 'accessToken cookie must be cleared on logout');
    assert(clearCookies.refreshToken?.value === '', 'refreshToken cookie must be cleared on logout');

    // Check database has revoked the refresh token
    const dbUserAfterLogout = await User.findOne({ email: TEST_EMAIL }).select('+refreshToken').lean();
    assert(dbUserAfterLogout.refreshToken === null, 'User refreshToken must be set to null in DB on logout');
    console.log('  5.1 Logout Execution: PASS (Status 200, Cookies Cleared, DB RefreshToken Nullified)');

    // 5.2 Attempt to use logged-out Refresh Token
    const postLogoutRefreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `refreshToken=${sessionCookies.refreshToken.value}` },
    });
    assert(
      postLogoutRefreshRes.status === 401,
      `Expected status 401 when using logged-out refresh token, got ${postLogoutRefreshRes.status}`
    );
    console.log('  5.2 Post-Logout Refresh Attempt: PASS (Status 401 Session Revoked)');

    // ==========================================
    // 6. COOKIE SECURITY ATTRIBUTES VERIFICATION
    // ==========================================
    console.log('\n[6] Cookie Security Attributes Verification:');

    // Inspect regCookies attributes from Step 1
    assert(regCookies.accessToken.httpOnly === true, 'accessToken must have HttpOnly flag');
    assert(regCookies.refreshToken.httpOnly === true, 'refreshToken must have HttpOnly flag');
    assert(regCookies.accessToken.sameSite?.toLowerCase() === 'lax', 'In test/dev mode, SameSite must be Lax');
    assert(regCookies.refreshToken.sameSite?.toLowerCase() === 'lax', 'In test/dev mode, SameSite must be Lax');
    assert(regCookies.accessToken.maxAge === '900', 'accessToken maxAge must be 900 seconds (15 minutes)');
    assert(regCookies.refreshToken.maxAge === '604800', 'refreshToken maxAge must be 604800 seconds (7 days)');

    console.log('  6.1 HttpOnly Flags: PASS (Both accessToken and refreshToken are HttpOnly)');
    console.log('  6.2 SameSite Policy: PASS (Configured to Lax in dev/test, Strict in production)');
    console.log('  6.3 MaxAge LifeSpan: PASS (15m for Access Token, 7d for Refresh Token)');

    // ==========================================
    // Post-test Cleanup
    // ==========================================
    await User.deleteMany({ email: { $in: [TEST_EMAIL, 'duplicate_test@taskera.local'] } });
    console.log('\n--- ALL AUTHENTICATION & SESSION AUTOMATED TESTS PASSED SUCCESSFULLY ---\n');
    process.exit(0);
  } finally {
    await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.disconnect();
  }
};

runAuthTests().catch((err) => {
  console.error('\n[AUTH TEST SUITE FAILED]:', err);
  process.exit(1);
});
