import './testSetup.js';
import http from 'http';
import { server } from '../src/app.js';
import connectDB from '../src/config/db.js';
import {
  startReminderScheduler,
  stopReminderScheduler,
  isSchedulerRunning,
  _setSchedulerProcessing,
} from '../src/services/reminderScheduler.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

const runInternalReminderTests = async () => {
  console.log('--- STARTING INTERNAL REMINDER ENDPOINT & SCHEDULER LIFECYCLE TESTS ---');
  await connectDB();

  const httpServer = http.createServer(server);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const endpoint = `${baseUrl}/api/internal/reminders/run`;

  const TEST_SECRET = 'test_internal_reminder_secret_32chars_long_key!';
  const ORIGINAL_SECRET = process.env.REMINDER_TRIGGER_SECRET;
  const ORIGINAL_SCHEDULER_FLAG = process.env.ENABLE_REMINDER_SCHEDULER;

  try {
    // =========================================================================
    // [1] Missing Server Secret (503 Service Unavailable)
    // =========================================================================
    console.log('\n[1] Missing Server Secret:');
    delete process.env.REMINDER_TRIGGER_SECRET;

    const res1 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    const body1 = await res1.json();

    assert(res1.status === 503, `Expected status 503 when secret is unconfigured, got ${res1.status}`);
    assert(body1.success === false, 'Body must have success: false');
    assert(typeof body1.error === 'string', 'Body must contain an error description');
    assert(!JSON.stringify(body1).includes(TEST_SECRET), 'Response must never leak credentials');
    console.log('  1.1 Missing REMINDER_TRIGGER_SECRET returns 503 Service Unavailable: PASS');

    // Configure the secret for subsequent tests
    process.env.REMINDER_TRIGGER_SECRET = TEST_SECRET;

    // =========================================================================
    // [2] Missing or Malformed Authorization Header (401 Unauthorized)
    // =========================================================================
    console.log('\n[2] Missing or Malformed Authorization Header:');

    // 2.1 No Authorization header
    const res2_1 = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const body2_1 = await res2_1.json();
    assert(res2_1.status === 401, `Expected status 401 for missing auth header, got ${res2_1.status}`);
    assert(body2_1.success === false, 'Body must have success: false');
    console.log('  2.1 Missing Authorization header returns 401: PASS');

    // 2.2 Basic auth instead of Bearer
    const res2_2 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from('user:pass').toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });
    assert(res2_2.status === 401, `Expected status 401 for non-Bearer auth, got ${res2_2.status}`);
    console.log('  2.2 Non-Bearer scheme returns 401: PASS');

    // 2.3 Empty Bearer token
    const res2_3 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ',
        'Content-Type': 'application/json',
      },
    });
    assert(res2_3.status === 401, `Expected status 401 for empty Bearer token, got ${res2_3.status}`);
    console.log('  2.3 Empty Bearer token returns 401: PASS');

    // =========================================================================
    // [3] Invalid Authorization Secret (403 Forbidden)
    // =========================================================================
    console.log('\n[3] Invalid Authorization Secret:');

    // 3.1 Length mismatch (checks buffer length guard)
    const res3_1 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong_length_secret',
        'Content-Type': 'application/json',
      },
    });
    const body3_1 = await res3_1.json();
    assert(res3_1.status === 403, `Expected status 403 for length mismatch, got ${res3_1.status}`);
    assert(body3_1.success === false, 'Body must have success: false');
    assert(!JSON.stringify(body3_1).includes(TEST_SECRET), 'Error response must not expose configured secret');
    console.log('  3.1 Buffer length mismatch handled safely (403 Forbidden): PASS');

    // 3.2 Same length, wrong content (checks constant-time timingSafeEqual comparison)
    const wrongSameLengthSecret = TEST_SECRET.slice(0, -1) + 'X';
    assert(wrongSameLengthSecret.length === TEST_SECRET.length, 'Secrets must have identical length for test');
    const res3_2 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${wrongSameLengthSecret}`,
        'Content-Type': 'application/json',
      },
    });
    assert(res3_2.status === 403, `Expected status 403 for mismatched secret, got ${res3_2.status}`);
    console.log('  3.2 Same-length mismatched secret rejected by timingSafeEqual (403 Forbidden): PASS');

    // =========================================================================
    // [4] Valid Authorization Invoking Reminder Cycle (200 OK)
    // =========================================================================
    console.log('\n[4] Valid Authorization Invoking Reminder Cycle:');

    const res4 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    const body4 = await res4.json();

    assert(res4.status === 200, `Expected status 200 for valid secret, got ${res4.status}`);
    assert(body4.success === true, 'Response must indicate success: true');
    assert(typeof body4.stats === 'object' && body4.stats !== null, 'Response must contain stats object');
    assert(typeof body4.stats.totalEligible === 'number', 'Stats must report totalEligible');
    assert(typeof body4.stats.sentTelegram === 'number', 'Stats must report sentTelegram');
    assert(typeof body4.stats.sentInApp === 'number', 'Stats must report sentInApp');
    assert(typeof body4.timestamp === 'string', 'Response must include timestamp');
    console.log(`  4.1 Valid secret triggers cycle: PASS (Eligible: ${body4.stats.totalEligible}, Status: 200)`);

    // =========================================================================
    // [5] Overlapping Execution Behavior (409 Conflict)
    // =========================================================================
    console.log('\n[5] Overlapping Execution Behavior:');

    // Simulate an ongoing cycle
    _setSchedulerProcessing(true);

    const res5 = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    const body5 = await res5.json();

    assert(res5.status === 409, `Expected status 409 when cycle is already active, got ${res5.status}`);
    assert(body5.success === false, 'Overlapping response must indicate success: false');
    assert(body5.inProgress === true, 'Response must specify inProgress: true');
    console.log('  5.1 Overlapping trigger request rejected with 409 Conflict: PASS');

    // Release the simulated lock
    _setSchedulerProcessing(false);

    // Verify it accepts requests again once the cycle finishes
    const res5_recovered = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TEST_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    assert(res5_recovered.status === 200, 'Subsequent request after lock release must succeed with 200');
    console.log('  5.2 Lock release allows subsequent cycle execution: PASS');

    // =========================================================================
    // [6] In-Process Scheduler Startup Toggle (ENABLE_REMINDER_SCHEDULER)
    // =========================================================================
    console.log('\n[6] In-Process Scheduler Startup Toggle:');

    // 6.1 Disabled when ENABLE_REMINDER_SCHEDULER='false'
    stopReminderScheduler();
    process.env.ENABLE_REMINDER_SCHEDULER = 'false';
    const disabledInterval = startReminderScheduler({ intervalMs: 60000 });
    assert(disabledInterval === null, 'startReminderScheduler must return null when disabled');
    assert(isSchedulerRunning() === false, 'isSchedulerRunning must be false when disabled');
    console.log('  6.1 ENABLE_REMINDER_SCHEDULER=false prevents in-process scheduler startup: PASS');

    // 6.2 Enabled by default (or when explicitly 'true')
    stopReminderScheduler();
    process.env.ENABLE_REMINDER_SCHEDULER = 'true';
    const enabledInterval = startReminderScheduler({ intervalMs: 60000 });
    assert(enabledInterval !== null, 'startReminderScheduler must return interval when enabled');
    assert(isSchedulerRunning() === true, 'isSchedulerRunning must be true when enabled');
    stopReminderScheduler();
    assert(isSchedulerRunning() === false, 'stopReminderScheduler cleanly clears active interval');
    console.log('  6.2 ENABLE_REMINDER_SCHEDULER=true starts in-process scheduler cleanly: PASS');

    console.log('\n--- ALL INTERNAL REMINDER & SCHEDULER LIFECYCLE TESTS PASSED SUCCESSFULLY ---');
  } finally {
    // Restore environment
    if (ORIGINAL_SECRET !== undefined) {
      process.env.REMINDER_TRIGGER_SECRET = ORIGINAL_SECRET;
    } else {
      delete process.env.REMINDER_TRIGGER_SECRET;
    }
    if (ORIGINAL_SCHEDULER_FLAG !== undefined) {
      process.env.ENABLE_REMINDER_SCHEDULER = ORIGINAL_SCHEDULER_FLAG;
    } else {
      delete process.env.ENABLE_REMINDER_SCHEDULER;
    }

    _setSchedulerProcessing(false);
    stopReminderScheduler();
    await new Promise((resolve) => httpServer.close(resolve));
  }
};

runInternalReminderTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Internal Reminder Tests Failed:', err);
    process.exit(1);
  });
