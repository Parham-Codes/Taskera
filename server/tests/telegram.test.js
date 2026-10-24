import './testSetup.js';
import http from 'http';
import mongoose from 'mongoose';
import { server } from '../src/app.js';
import connectDB from '../src/config/db.js';
import { User, Task } from '../src/models/index.js';
import { generateTokens, setAuthCookies } from '../src/utils/token.js';
import {
  sendTelegramMessage,
  sendTelegramTestMessage,
  notifyTaskEventOnTelegram,
  sanitizeTelegramErrorMessage,
} from '../src/services/telegramService.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

const runTelegramTests = async () => {
  console.log('--- STARTING TELEGRAM BOT TOKEN SECURITY & LIFECYCLE TESTS ---');
  await connectDB();

  const httpServer = http.createServer(server);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const TEST_EMAIL = 'tg_security_test@taskera.local';
  const INITIAL_CUSTOM_TOKEN = '111111:INITIAL_CUSTOM_BOT_TOKEN_SECRET';
  const REPLACEMENT_CUSTOM_TOKEN = '222222:NEW_REPLACEMENT_TOKEN_SECRET';

  try {
    // Cleanup prior runs
    await User.deleteMany({ email: { $in: [TEST_EMAIL, 'tg_new_reg@taskera.local'] } });

    // Create user with a saved custom bot token
    const testUser = await User.create({
      name: 'Telegram Security Test User',
      email: TEST_EMAIL,
      password: 'StrongPassword123!',
      timezone: 'UTC',
      telegramSettings: {
        enabled: true,
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: '987654321',
        notifyOnCreated: true,
        notifyOnAssigned: true,
        notifyOnStatusChange: true,
        notifyOnReminders: true,
      },
    });

    const tokens = generateTokens(testUser._id);
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.accessToken}`,
    };

    // =========================================================================
    // 1. AUTH & USER PROFILE ENDPOINTS NEVER EXPOSE BOT TOKEN
    // =========================================================================
    console.log('\n[1] User Profile & Auth Response Token Sanitization:');

    // 1.1 GET /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: authHeaders,
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, `Expected 200 on /api/auth/me, got ${meRes.status}`);
    assert(meData.data?.user?.telegramSettings, 'Missing telegramSettings in /api/auth/me');
    assert(
      meData.data.user.telegramSettings.botToken === undefined,
      'CRITICAL: botToken must NEVER appear in /api/auth/me response'
    );
    assert(
      meData.data.user.telegramSettings.botTokenConfigured === true,
      'Expected botTokenConfigured === true for user with saved token'
    );
    console.log('  1.1 GET /api/auth/me: PASS (botToken absent, botTokenConfigured === true)');

    // 1.2 POST /api/auth/register
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Registered User',
        email: 'tg_new_reg@taskera.local',
        password: 'StrongPassword123!',
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, `Expected 201 on register, got ${regRes.status}`);
    assert(
      regData.data?.user?.telegramSettings?.botToken === undefined,
      'CRITICAL: botToken must NEVER appear in /api/auth/register response'
    );
    assert(
      regData.data?.user?.telegramSettings?.botTokenConfigured === false,
      'Expected botTokenConfigured === false on fresh registration'
    );
    console.log('  1.2 POST /api/auth/register: PASS (botToken absent, botTokenConfigured === false)');

    // 1.3 POST /api/auth/login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        password: 'StrongPassword123!',
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, `Expected 200 on login, got ${loginRes.status}`);
    assert(
      loginData.data?.user?.telegramSettings?.botToken === undefined,
      'CRITICAL: botToken must NEVER appear in /api/auth/login response'
    );
    assert(
      loginData.data?.user?.telegramSettings?.botTokenConfigured === true,
      'Expected botTokenConfigured === true in login response'
    );
    console.log('  1.3 POST /api/auth/login: PASS (botToken absent, botTokenConfigured === true)');

    // 1.4 PATCH /api/auth/timezone
    const tzRes = await fetch(`${baseUrl}/api/auth/timezone`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ timezone: 'Asia/Tehran' }),
    });
    const tzData = await tzRes.json();
    assert(tzRes.status === 200, `Expected 200 on /api/auth/timezone, got ${tzRes.status}`);
    assert(
      tzData.data?.user?.telegramSettings?.botToken === undefined,
      'CRITICAL: botToken must NEVER appear in /api/auth/timezone response'
    );
    console.log('  1.4 PATCH /api/auth/timezone: PASS (botToken absent)');

    // =========================================================================
    // 2. TELEGRAM SETTINGS GET/PUT LIFECYCLE (PRESERVE, REPLACE, CLEAR)
    // =========================================================================
    console.log('\n[2] Telegram Settings GET/PUT Lifecycle & Token Security:');

    // 2.1 GET /api/telegram/settings
    const getTgRes = await fetch(`${baseUrl}/api/telegram/settings`, {
      method: 'GET',
      headers: authHeaders,
    });
    const getTgData = await getTgRes.json();
    assert(getTgRes.status === 200, `Expected 200 on /api/telegram/settings, got ${getTgRes.status}`);
    assert(
      getTgData.data?.settings?.botToken === undefined,
      'CRITICAL: botToken must NEVER appear in GET /api/telegram/settings'
    );
    assert(
      getTgData.data?.settings?.botTokenConfigured === true,
      'Expected botTokenConfigured === true'
    );
    assert(getTgData.data?.settings?.chatId === '987654321', 'Expected chatId to match');
    console.log('  2.1 GET /api/telegram/settings: PASS (botToken absent, botTokenConfigured === true)');

    // 2.2 PUT /api/telegram/settings with empty string / blank botToken (PRESERVES existing token)
    const preserveRes = await fetch(`${baseUrl}/api/telegram/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        enabled: true,
        chatId: '987654321',
        botToken: '', // User left input empty in modal
        notifyOnCreated: false,
        notifyOnAssigned: true,
      }),
    });
    const preserveData = await preserveRes.json();
    assert(preserveRes.status === 200, `Expected 200 on update, got ${preserveRes.status}`);
    assert(
      preserveData.data?.settings?.botToken === undefined,
      'CRITICAL: botToken must NEVER appear in PUT /api/telegram/settings response'
    );
    assert(
      preserveData.data?.settings?.botTokenConfigured === true,
      'botTokenConfigured must remain true when preserved'
    );

    // Verify directly in DB that token was NOT erased
    const dbUserAfterPreserve = await User.findById(testUser._id).select('+telegramSettings.botToken');
    assert(
      dbUserAfterPreserve.telegramSettings.botToken === INITIAL_CUSTOM_TOKEN,
      `Expected existing token '${INITIAL_CUSTOM_TOKEN}' to be preserved in DB, got '${dbUserAfterPreserve.telegramSettings.botToken}'`
    );
    assert(
      dbUserAfterPreserve.telegramSettings.notifyOnCreated === false,
      'Expected other settings (notifyOnCreated) to be updated'
    );
    console.log('  2.2 Blank Token Preserves Existing Custom Token: PASS (DB token untouched)');

    // 2.3 PUT /api/telegram/settings with new token (REPLACES existing token)
    const replaceRes = await fetch(`${baseUrl}/api/telegram/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        enabled: true,
        chatId: '987654321',
        botToken: REPLACEMENT_CUSTOM_TOKEN, // New token entered
        notifyOnCreated: true,
      }),
    });
    const replaceData = await replaceRes.json();
    assert(replaceRes.status === 200, `Expected 200 on replace, got ${replaceRes.status}`);
    assert(
      replaceData.data?.settings?.botToken === undefined,
      'botToken must NEVER appear in replace response'
    );
    assert(
      replaceData.data?.settings?.botTokenConfigured === true,
      'botTokenConfigured must be true after replacement'
    );

    // Verify directly in DB that token was updated
    const dbUserAfterReplace = await User.findById(testUser._id);
    assert(
      dbUserAfterReplace.telegramSettings.botToken === REPLACEMENT_CUSTOM_TOKEN,
      `Expected token in DB to be '${REPLACEMENT_CUSTOM_TOKEN}', got '${dbUserAfterReplace.telegramSettings.botToken}'`
    );
    console.log('  2.3 Submitting New Token Replaces Custom Token: PASS (DB token updated)');

    // 2.4 PUT /api/telegram/settings with clearBotToken: true (EXPLICIT CLEAR)
    const clearRes = await fetch(`${baseUrl}/api/telegram/settings`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        enabled: true,
        chatId: '987654321',
        clearBotToken: true, // Explicit remove custom token action
      }),
    });
    const clearData = await clearRes.json();
    assert(clearRes.status === 200, `Expected 200 on clear, got ${clearRes.status}`);
    assert(
      clearData.data?.settings?.botToken === undefined,
      'botToken must NEVER appear in clear response'
    );
    assert(
      clearData.data?.settings?.botTokenConfigured === false,
      'Expected botTokenConfigured === false after explicit clearing'
    );

    // Verify directly in DB that token was cleared to empty string
    const dbUserAfterClear = await User.findById(testUser._id);
    assert(
      dbUserAfterClear.telegramSettings.botToken === '',
      `Expected DB botToken to be empty string after clearing, got '${dbUserAfterClear.telegramSettings.botToken}'`
    );
    console.log('  2.4 Explicit clearBotToken Clears Custom Token: PASS (DB token cleared, default bot active)');

    // =========================================================================
    // 3. TEST NOTIFICATION DISPATCH & ERROR REDACTION
    // =========================================================================
    console.log('\n[3] Test Notification Security & Error Redaction:');

    // Restore custom token for testing
    dbUserAfterClear.telegramSettings.botToken = INITIAL_CUSTOM_TOKEN;
    await dbUserAfterClear.save();

    // Mock global fetch to capture dispatch requests and simulate responses
    const originalFetch = global.fetch;
    let lastDispatchedUrl = null;
    let mockResponseGenerator = null;

    global.fetch = async (url, options) => {
      // If it's a telegram API call, intercept
      if (typeof url === 'string' && url.includes('api.telegram.org')) {
        lastDispatchedUrl = url;
        if (mockResponseGenerator) {
          return mockResponseGenerator(url, options);
        }
        return {
          ok: true,
          json: async () => ({
            ok: true,
            result: { message_id: 1234, chat: { id: 987654321 } },
          }),
        };
      }
      // Otherwise fallback to original fetch for local test server HTTP requests
      return originalFetch(url, options);
    };

    try {
      // 3.1 Test notification without botToken provided -> uses saved custom token
      lastDispatchedUrl = null;
      const testRes1 = await originalFetch(`${baseUrl}/api/telegram/test`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ chatId: '987654321' }),
      });
      const testData1 = await testRes1.json();
      assert(testRes1.status === 200, `Expected 200 on test notification, got ${testRes1.status}`);
      assert(testData1.success === true, 'Expected test success === true');
      assert(
        lastDispatchedUrl && lastDispatchedUrl.includes(INITIAL_CUSTOM_TOKEN),
        'Expected dispatch to use saved custom bot token when not provided in body'
      );
      console.log('  3.1 Test Notification Uses Saved Token: PASS (Used internal saved token)');

      // 3.2 Test notification with new botToken provided -> uses newly provided token
      lastDispatchedUrl = null;
      const testRes2 = await originalFetch(`${baseUrl}/api/telegram/test`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          chatId: '987654321',
          botToken: '999999:TEST_OVERRIDE_TOKEN',
        }),
      });
      assert(testRes2.status === 200, `Expected 200, got ${testRes2.status}`);
      assert(
        lastDispatchedUrl && lastDispatchedUrl.includes('999999:TEST_OVERRIDE_TOKEN'),
        'Expected dispatch to use temporary override token when provided in body'
      );
      console.log('  3.2 Test Notification Uses Override Token: PASS');

      // 3.3 Error Sanitization (Ensure botToken is never leaked in failure messages)
      mockResponseGenerator = async () => ({
        ok: false,
        json: async () => ({
          ok: false,
          description: `Unauthorized: invalid token bot${INITIAL_CUSTOM_TOKEN} cannot connect`,
        }),
      });

      const errRes = await originalFetch(`${baseUrl}/api/telegram/test`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ chatId: '987654321' }),
      });
      const errData = await errRes.json();
      assert(errRes.status === 400, `Expected 400 on failed dispatch, got ${errRes.status}`);
      assert(
        !errData.message.includes(INITIAL_CUSTOM_TOKEN),
        `CRITICAL LEAK: Error message contains raw botToken: ${errData.message}`
      );
      assert(
        errData.message.includes('[REDACTED]'),
        `Expected error message to contain [REDACTED], got: ${errData.message}`
      );
      console.log('  3.3 Error Message Sanitization: PASS (Token redacted in error message)');

      // 3.4 Sanitize helper unit test
      const dirtyError = `Failed to fetch https://api.telegram.org/bot${INITIAL_CUSTOM_TOKEN}/sendMessage`;
      const cleanError = sanitizeTelegramErrorMessage(dirtyError, INITIAL_CUSTOM_TOKEN);
      assert(!cleanError.includes(INITIAL_CUSTOM_TOKEN), 'Token must be scrubbed from error string');
      assert(cleanError.includes('[REDACTED]'), 'Must replace with [REDACTED]');
      console.log('  3.4 sanitizeTelegramErrorMessage Helper: PASS');
    } finally {
      // Restore global fetch
      global.fetch = originalFetch;
    }

    // =========================================================================
    // 4. INTERNAL TELEGRAM FUNCTIONALITY PRESERVED
    // =========================================================================
    console.log('\n[4] Internal Telegram Notification Services Compatibility:');

    // 4.1 Verify notifyTaskEventOnTelegram can read saved token internally
    let internalDispatchedToken = null;
    const originalSend = sendTelegramMessage;

    // Test notifyTaskEventOnTelegram with mock recipient
    const recipientUserWithToken = {
      name: 'Internal Test User',
      telegramSettings: {
        enabled: true,
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: '987654321',
        notifyOnCreated: true,
      },
    };

    // Global fetch mock to check internal dispatch
    global.fetch = async (url) => {
      internalDispatchedToken = url;
      return {
        ok: true,
        json: async () => ({ ok: true, result: {} }),
      };
    };

    try {
      await notifyTaskEventOnTelegram({
        recipientUser: recipientUserWithToken,
        task: { title: 'Test Task Event', priority: 'high', dueDate: new Date() },
        eventType: 'created',
        actorName: 'Colleague',
      });

      assert(
        internalDispatchedToken && internalDispatchedToken.includes(INITIAL_CUSTOM_TOKEN),
        'notifyTaskEventOnTelegram must be able to use the saved custom token internally'
      );
      console.log('  4.1 notifyTaskEventOnTelegram Uses Saved Custom Token: PASS');
    } finally {
      global.fetch = originalFetch;
    }

    // Cleanup
    await User.deleteMany({ email: { $in: [TEST_EMAIL, 'tg_new_reg@taskera.local'] } });
    await new Promise((resolve) => httpServer.close(resolve));

    console.log('\n--- ALL TELEGRAM TOKEN SECURITY AUTOMATED TESTS PASSED SUCCESSFULLY ---\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TELEGRAM TEST SUITE FAILED:', error);
    try {
      await User.deleteMany({ email: { $in: [TEST_EMAIL, 'tg_new_reg@taskera.local'] } });
      await new Promise((resolve) => httpServer.close(resolve));
    } catch {}
    process.exit(1);
  }
};

runTelegramTests();
