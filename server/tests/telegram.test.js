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
  _setTelegramQueueConfig,
  _resetTelegramQueueConfig,
  _clearTelegramQueueState,
  _getTelegramQueueConfig,
  _getDefaultTelegramQueueConfig,
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

    // =========================================================================
    // 5. RAPID TASK UPDATE QUEUE, PACING, 429 RETRY & TRANSPORT SAFETY
    // =========================================================================
    console.log('\n[5] Rapid Task Notification Queue, Rate Limiting & Safety:');

    // 5.1a Explicitly verify production queue configuration defaults
    const prodConfig = _getDefaultTelegramQueueConfig();
    assert(
      prodConfig.chatIntervalMs === 1100,
      `Expected production chatIntervalMs === 1100, got ${prodConfig.chatIntervalMs}`
    );
    assert(
      prodConfig.globalIntervalMs === 35,
      `Expected production globalIntervalMs === 35, got ${prodConfig.globalIntervalMs}`
    );
    assert(
      prodConfig.requestTimeoutMs === 10000,
      `Expected production requestTimeoutMs === 10000, got ${prodConfig.requestTimeoutMs}`
    );
    assert(
      prodConfig.maxRetries429 === 2,
      `Expected production maxRetries429 === 2, got ${prodConfig.maxRetries429}`
    );
    assert(
      prodConfig.maxRetryAfterSec === 30,
      `Expected production maxRetryAfterSec === 30, got ${prodConfig.maxRetryAfterSec}`
    );
    console.log('  5.1a Production Queue Configuration Verified: PASS (chatInterval: 1100ms, globalInterval: 35ms)');

    // 5.1b Verify queue serialization and pacing using controlled injected interval (avoiding slow test run)
    _clearTelegramQueueState();
    _setTelegramQueueConfig({ chatIntervalMs: 60, globalIntervalMs: 15 });

    const rapidDispatches = [];
    global.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('api.telegram.org')) {
        const body = options?.body ? JSON.parse(options.body) : {};
        rapidDispatches.push({
          url,
          chat_id: body.chat_id,
          text: body.text,
          time: Date.now(),
        });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: { message_id: 1000 + rapidDispatches.length },
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const recipient = {
        name: 'Rapid Queue User',
        telegramSettings: {
          enabled: true,
          botToken: INITIAL_CUSTOM_TOKEN,
          chatId: '123456789',
          notifyOnStatusChange: true,
        },
      };

      // Trigger 3 status change events simultaneously (as would happen with rapid drag/drop or batch updates)
      const p1 = notifyTaskEventOnTelegram({
        recipientUser: recipient,
        task: { title: 'Task A', priority: 'medium' },
        eventType: 'status_changed',
        actorName: 'Alice',
        oldStatus: 'todo',
        newStatus: 'in-progress',
      });
      const p2 = notifyTaskEventOnTelegram({
        recipientUser: recipient,
        task: { title: 'Task B', priority: 'high' },
        eventType: 'status_changed',
        actorName: 'Bob',
        oldStatus: 'in-progress',
        newStatus: 'review',
      });
      const p3 = notifyTaskEventOnTelegram({
        recipientUser: recipient,
        task: { title: 'Task C', priority: 'urgent' },
        eventType: 'status_changed',
        actorName: 'Charlie',
        oldStatus: 'review',
        newStatus: 'completed',
      });

      const [res1, res2, res3] = await Promise.all([p1, p2, p3]);

      assert(res1.success === true, 'Expected res1 to succeed');
      assert(res2.success === true, 'Expected res2 to succeed');
      assert(res3.success === true, 'Expected res3 to succeed');
      assert(rapidDispatches.length === 3, `Expected 3 dispatches, got ${rapidDispatches.length}`);

      // Verify FIFO ordering
      assert(rapidDispatches[0].text.includes('Task A'), 'First message should be Task A');
      assert(rapidDispatches[1].text.includes('Task B'), 'Second message should be Task B');
      assert(rapidDispatches[2].text.includes('Task C'), 'Third message should be Task C');

      // Verify sequential pacing (at least ~45ms between sends given 60ms setting)
      const diff1 = rapidDispatches[1].time - rapidDispatches[0].time;
      const diff2 = rapidDispatches[2].time - rapidDispatches[1].time;
      assert(
        diff1 >= 45,
        `Expected at least ~45ms pacing between msg 1 & 2 (configured 60ms), got ${diff1}ms`
      );
      assert(
        diff2 >= 45,
        `Expected at least ~45ms pacing between msg 2 & 3 (configured 60ms), got ${diff2}ms`
      );
      console.log(`  5.1b Rapid Notifications Serialized & Paced (injected 60ms): PASS (pacing ${diff1}ms, ${diff2}ms)`);
    } finally {
      global.fetch = originalFetch;
      _resetTelegramQueueConfig();
    }

    // 5.1c Global per-token pacing across multiple concurrent destination chats
    _clearTelegramQueueState();
    _setTelegramQueueConfig({ chatIntervalMs: 120, globalIntervalMs: 30 });

    const multiChatDispatches = [];
    global.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('api.telegram.org')) {
        const body = options?.body ? JSON.parse(options.body) : {};
        multiChatDispatches.push({
          url,
          chat_id: body.chat_id,
          text: body.text,
          time: Date.now(),
        });
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: { message_id: 2000 + multiChatDispatches.length },
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      // Send 2 messages to chat_Alpha and 2 messages to chat_Beta concurrently using the same botToken
      const pA1 = sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: 'chat_Alpha',
        message: 'Alpha Msg 1',
      });
      const pB1 = sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: 'chat_Beta',
        message: 'Beta Msg 1',
      });
      const pA2 = sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: 'chat_Alpha',
        message: 'Alpha Msg 2',
      });
      const pB2 = sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: 'chat_Beta',
        message: 'Beta Msg 2',
      });

      const [resA1, resB1, resA2, resB2] = await Promise.all([pA1, pB1, pA2, pB2]);

      assert(resA1.success && resB1.success && resA2.success && resB2.success, 'All multi-chat messages should succeed');
      assert(multiChatDispatches.length === 4, `Expected 4 total dispatches, got ${multiChatDispatches.length}`);

      // Verify per-chat FIFO ordering
      const alphaMessages = multiChatDispatches.filter(d => d.chat_id === 'chat_Alpha');
      const betaMessages = multiChatDispatches.filter(d => d.chat_id === 'chat_Beta');
      assert(alphaMessages[0].text === 'Alpha Msg 1', 'Alpha Msg 1 must precede Alpha Msg 2');
      assert(alphaMessages[1].text === 'Alpha Msg 2', 'Alpha Msg 2 must follow Alpha Msg 1');
      assert(betaMessages[0].text === 'Beta Msg 1', 'Beta Msg 1 must precede Beta Msg 2');
      assert(betaMessages[1].text === 'Beta Msg 2', 'Beta Msg 2 must follow Beta Msg 1');

      // Verify global token pacing between ALL consecutive dispatches through this bot token
      for (let i = 1; i < multiChatDispatches.length; i++) {
        const gap = multiChatDispatches[i].time - multiChatDispatches[i - 1].time;
        assert(
          gap >= 25,
          `Global token pacing violated between dispatch ${i-1} and ${i}: expected >= 25ms (config 30ms), got ${gap}ms`
        );
      }

      console.log('  5.1c Global Per-Token Pacing & Multi-Chat FIFO: PASS (consecutive token gaps respected)');
    } finally {
      global.fetch = originalFetch;
      _resetTelegramQueueConfig();
    }

    // 5.2 HTTP 429 Rate Limit Retry with parameters.retry_after
    _clearTelegramQueueState();
    _setTelegramQueueConfig({ chatIntervalMs: 10, globalIntervalMs: 5, maxRetries429: 2 });

    let attempts429 = 0;
    global.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('api.telegram.org')) {
        attempts429++;
        if (attempts429 === 1) {
          // Telegram returns 429 on first try with retry_after: 1 (1 second)
          return {
            ok: false,
            status: 429,
            json: async () => ({
              ok: false,
              error_code: 429,
              description: 'Too Many Requests: retry after 1',
              parameters: { retry_after: 1 },
            }),
          };
        }
        // Succeeds on retry
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: { message_id: 5555 },
          }),
        };
      }
      return originalFetch(url, options);
    };

    try {
      const startTime = Date.now();
      const res429 = await sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: '999888777',
        message: 'Testing 429 retry',
      });
      const elapsed = Date.now() - startTime;

      assert(res429.success === true, 'Expected 429 retry to succeed on 2nd attempt');
      assert(attempts429 === 2, `Expected exactly 2 attempts, got ${attempts429}`);
      assert(
        elapsed >= 900,
        `Expected at least ~900ms wait according to retry_after: 1, got ${elapsed}ms`
      );
      console.log(`  5.2 HTTP 429 Handled with parameters.retry_after: PASS (retried after ${elapsed}ms)`);

      // 5.2b Non-retryable 4xx (e.g. 400 Bad Request) must NOT be retried
      let attempts400 = 0;
      global.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('api.telegram.org')) {
          attempts400++;
          return {
            ok: false,
            status: 400,
            json: async () => ({
              ok: false,
              error_code: 400,
              description: 'Bad Request: chat not found',
            }),
          };
        }
        return originalFetch(url);
      };

      const res400 = await sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: 'invalid_chat_id',
        message: 'Testing non-retryable 400',
      });

      assert(res400.success === false, 'Expected 400 to fail');
      assert(res400.isConfirmedFailure === true, 'Expected isConfirmedFailure === true for 400');
      assert(attempts400 === 1, `400 Bad Request must NOT be retried (got ${attempts400} calls)`);
      console.log('  5.2b Non-Retryable 4xx Handled Without Retries: PASS');

      // 5.2c Excessive parameters.retry_after exceeds automatic wait limit: never retry early!
      _clearTelegramQueueState();
      _setTelegramQueueConfig({ chatIntervalMs: 10, globalIntervalMs: 5, maxRetryAfterSec: 5 });

      let longRetryCalls = 0;
      global.fetch = async (url) => {
        if (typeof url === 'string' && url.includes('api.telegram.org')) {
          longRetryCalls++;
          return {
            ok: false,
            status: 429,
            json: async () => ({
              ok: false,
              error_code: 429,
              description: `Too Many Requests: retry after 300 for bot${INITIAL_CUSTOM_TOKEN}`,
              parameters: { retry_after: 300 }, // 300s exceeds maxRetryAfterSec (5s)
            }),
          };
        }
        return originalFetch(url);
      };

      const startLong = Date.now();
      const longRes = await sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: 'long_retry_chat',
        message: 'Testing long retry_after',
      });
      const elapsedLong = Date.now() - startLong;

      assert(longRes.success === false, 'Expected failure when retry_after exceeds limit');
      assert(longRes.rateLimited === true, 'Expected rateLimited === true');
      assert(longRes.isConfirmedFailure === true, 'Expected isConfirmedFailure === true');
      assert(longRes.retryAfterSec === 300, 'Expected retryAfterSec to reflect 300');
      assert(
        !longRes.reason.includes(INITIAL_CUSTOM_TOKEN),
        'Reason must never leak raw bot token'
      );
      assert(
        longRetryCalls === 1,
        `Must NOT retry early when retry_after (300s) exceeds limit (got ${longRetryCalls} calls)`
      );
      assert(
        elapsedLong < 1000,
        `Must return immediately without waiting or retrying early (took ${elapsedLong}ms)`
      );
      console.log('  5.2c Long retry_after Exceeding Limit Not Retried Early: PASS (returned immediately without token leak)');
    } finally {
      global.fetch = originalFetch;
      _resetTelegramQueueConfig();
    }

    // 5.3 Network Transport Failure & Timeout (Outcome Unknown, No Auto-Resend)
    _clearTelegramQueueState();
    _setTelegramQueueConfig({ chatIntervalMs: 10, globalIntervalMs: 5, requestTimeoutMs: 50 });

    let transportAttempts = 0;
    global.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('api.telegram.org')) {
        transportAttempts++;
        const err = new TypeError('fetch failed: network socket disconnected');
        err.code = 'ECONNRESET';
        throw err;
      }
      return originalFetch(url);
    };

    try {
      const resTransport = await sendTelegramMessage({
        botToken: INITIAL_CUSTOM_TOKEN,
        chatId: '123456789',
        message: 'Transport test message',
      });

      assert(resTransport.success === false, 'Expected failure on network error');
      assert(
        resTransport.isUnknown === true,
        'Expected isUnknown === true because transport outcome is ambiguous'
      );
      assert(
        resTransport.isConfirmedFailure === false,
        'Expected isConfirmedFailure === false for network transport error'
      );
      assert(
        transportAttempts === 1,
        `Transport failure must NOT auto-resend to prevent duplicate messages (got ${transportAttempts} calls)`
      );
      console.log('  5.3 Transport Failure Marked as UNKNOWN & No Auto-Resend: PASS');
    } finally {
      global.fetch = originalFetch;
      _resetTelegramQueueConfig();
    }

    // 5.4 One Failed Message Followed by Successful Delivery (No Queue Blockage)
    _clearTelegramQueueState();
    _setTelegramQueueConfig({ chatIntervalMs: 20, globalIntervalMs: 5 });

    let msgCounter = 0;
    global.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('api.telegram.org')) {
        msgCounter++;
        if (msgCounter === 1) {
          // First message fails with 403 Forbidden (bot blocked by user)
          return {
            ok: false,
            status: 403,
            json: async () => ({
              ok: false,
              error_code: 403,
              description: 'Forbidden: bot was blocked by the user',
            }),
          };
        }
        // Second message succeeds
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ok: true,
            result: { message_id: 8888 },
          }),
        };
      }
      return originalFetch(url);
    };

    try {
      // Concurrently queue message 1 (fails) and message 2 (succeeds) for the same chat
      const [failRes, successRes] = await Promise.all([
        sendTelegramMessage({
          botToken: INITIAL_CUSTOM_TOKEN,
          chatId: 'shared_chat_1',
          message: 'Message 1 that will fail',
        }),
        sendTelegramMessage({
          botToken: INITIAL_CUSTOM_TOKEN,
          chatId: 'shared_chat_1',
          message: 'Message 2 that should succeed',
        }),
      ]);

      assert(failRes.success === false, 'First message must fail');
      assert(failRes.isConfirmedFailure === true, 'First message must be confirmed failure');
      assert(successRes.success === true, 'Second message must succeed despite first message failure');
      assert(successRes.result?.message_id === 8888, 'Second message result verified');
      console.log('  5.4 Failed Message Does Not Block Queue For Next Message: PASS');
    } finally {
      global.fetch = originalFetch;
      _resetTelegramQueueConfig();
    }

    // 5.5 No Bot-Token Leakage in Logs
    _clearTelegramQueueState();
    _setTelegramQueueConfig({ chatIntervalMs: 10, globalIntervalMs: 5 });

    const SECRET_LEAK_TOKEN = '777777:SUPER_SECRET_TOKEN_DO_NOT_LEAK';
    const interceptedLogs = [];

    const origConsoleWarn = console.warn;
    const origConsoleError = console.error;

    console.warn = (...args) => {
      interceptedLogs.push(args.map(String).join(' '));
    };
    console.error = (...args) => {
      interceptedLogs.push(args.map(String).join(' '));
    };

    try {
      // Test 1: API error with token in description
      global.fetch = async () => ({
        ok: false,
        status: 401,
        json: async () => ({
          ok: false,
          error_code: 401,
          description: `Unauthorized: bot token bot${SECRET_LEAK_TOKEN} is revoked`,
        }),
      });

      await sendTelegramMessage({
        botToken: SECRET_LEAK_TOKEN,
        chatId: 'leak_chat',
        message: 'Test leak API error',
      });

      // Test 2: Rate limit 429 logging
      global.fetch = async () => ({
        ok: false,
        status: 429,
        json: async () => ({
          ok: false,
          error_code: 429,
          description: `Too Many Requests on bot${SECRET_LEAK_TOKEN}`,
          parameters: { retry_after: 50 }, // exceeds maxRetryAfterSec -> exhaustion log
        }),
      });

      await sendTelegramMessage({
        botToken: SECRET_LEAK_TOKEN,
        chatId: 'leak_chat',
        message: 'Test leak 429 error',
      });

      // Test 3: Network exception with token in error message
      global.fetch = async () => {
        throw new Error(`getaddrinfo ENOTFOUND api.telegram.org for bot${SECRET_LEAK_TOKEN}`);
      };

      await sendTelegramMessage({
        botToken: SECRET_LEAK_TOKEN,
        chatId: 'leak_chat',
        message: 'Test leak DNS exception',
      });

      // Verify none of the intercepted logs contain the secret token
      assert(interceptedLogs.length >= 3, `Expected at least 3 intercepted logs, got ${interceptedLogs.length}`);
      for (const logLine of interceptedLogs) {
        assert(
          !logLine.includes(SECRET_LEAK_TOKEN),
          `CRITICAL: Log line contains raw bot token: "${logLine}"`
        );
      }
      console.log('  5.5 No Bot-Token Leakage in Logs: PASS (All tokens sanitized/redacted)');
    } finally {
      console.warn = origConsoleWarn;
      console.error = origConsoleError;
      global.fetch = originalFetch;
      _resetTelegramQueueConfig();
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
