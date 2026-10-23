import './testSetup.js';
import http from 'http';
import mongoose from 'mongoose';
import { server } from '../src/app.js';
import connectDB from '../src/config/db.js';
import {
  User,
  Organization,
  OrganizationMember,
  Task,
  Notification,
  NOTIFICATION_TYPES,
  TaskReminderDelivery,
  REMINDER_STAGES,
  DELIVERY_CHANNELS,
  DELIVERY_STATUS,
} from '../src/models/index.js';
import { generateTokens } from '../src/utils/token.js';
import {
  findEligibleReminders,
  claimReminderDelivery,
  dispatchReminder,
  runReminderCycle,
} from '../src/services/reminderService.js';
import {
  getLocalTimeInfo,
  addDaysToDateKey,
  getTaskDueDateKey,
  buildDedupeKey,
  isValidTimezone,
} from '../src/utils/reminderDateUtils.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

const runReminderTests = async () => {
  console.log('--- STARTING TASK REMINDER & SMART ROUTING AUTOMATED TESTS ---');
  await connectDB();

  // Spin up local HTTP server to test notification API retrieval
  const httpServer = http.createServer(server);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  // Mock global.fetch to intercept and control Telegram calls
  const originalFetch = global.fetch;
  let telegramCallCount = 0;
  let lastTelegramPayload = null;
  let mockTelegramSuccess = true;

  global.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      telegramCallCount++;
      lastTelegramPayload = options?.body ? JSON.parse(options.body) : null;
      if (mockTelegramSuccess) {
        return {
          ok: true,
          json: async () => ({ ok: true, result: { message_id: 999 } }),
        };
      } else {
        return {
          ok: false,
          json: async () => ({ ok: false, description: 'Mock network timeout / chat not found' }),
        };
      }
    }
    return originalFetch(url, options);
  };

  try {
    // Clean test database records
    await User.deleteMany({ email: /@reminder_test\.local$/ });
    await Task.deleteMany({ title: /^\[ReminderTest\]/ });
    await Notification.deleteMany({ type: NOTIFICATION_TYPES.TASK_REMINDER });
    await TaskReminderDelivery.deleteMany({});
    await Organization.deleteMany({ slug: /^reminder-org-/ });

    // Create test users: User A (UTC), User B (Asia/Tehran), User C (no telegram)
    const userA = await User.create({
      name: 'User A UTC',
      email: 'usera@reminder_test.local',
      password: 'StrongPassword123!',
      timezone: 'UTC',
      telegramSettings: {
        enabled: true,
        botToken: '123456:MOCK_TOKEN',
        chatId: '111111',
        notifyOnReminders: true,
      },
    });

    const userB = await User.create({
      name: 'User B Tehran',
      email: 'userb@reminder_test.local',
      password: 'StrongPassword123!',
      timezone: 'Asia/Tehran',
      telegramSettings: {
        enabled: false,
        chatId: '',
        notifyOnReminders: true,
      },
    });

    const userC = await User.create({
      name: 'User C Workspace',
      email: 'userc@reminder_test.local',
      password: 'StrongPassword123!',
      timezone: 'UTC',
      telegramSettings: {
        enabled: false,
      },
    });

    // Reference time: 2026-10-24 10:00:00 UTC (13:30 in Tehran)
    const refDate = new Date('2026-10-24T10:00:00.000Z');
    const todayKeyUTC = '2026-10-24';
    const tomorrowKeyUTC = '2026-10-25';

    console.log('\n[1] Date Helpers & Timezone Calculations:');
    assert(isValidTimezone('Asia/Tehran'), 'Asia/Tehran must be a valid timezone');
    assert(isValidTimezone('UTC'), 'UTC must be a valid timezone');
    assert(!isValidTimezone('Invalid/Zone'), 'Invalid timezone must be rejected');

    const infoUTC = getLocalTimeInfo(refDate, 'UTC');
    assert(infoUTC.dateKey === '2026-10-24', 'UTC dateKey should be 2026-10-24');
    assert(infoUTC.hour === 10, 'UTC hour should be 10');

    const infoTehran = getLocalTimeInfo(refDate, 'Asia/Tehran');
    assert(infoTehran.dateKey === '2026-10-24', 'Tehran dateKey should be 2026-10-24');
    assert(infoTehran.hour === 13, 'Tehran hour should be 13');
    console.log('  1.1 Timezone & Local Date calculations: PASS');

    console.log('\n[2] Day-Before & Due-Today Single Eligibility:');
    // Task 1: Due tomorrow (Day Before)
    const taskDayBefore = await Task.create({
      title: '[ReminderTest] Task Due Tomorrow',
      dueDate: new Date('2026-10-25T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    // Task 2: Due today
    const taskDueToday = await Task.create({
      title: '[ReminderTest] Task Due Today',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'in-progress',
    });

    // Task 3: Completed task (should be skipped)
    const taskCompleted = await Task.create({
      title: '[ReminderTest] Task Completed',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'completed',
    });

    // Task 4: Task without due date (should be skipped)
    const taskNoDueDate = await Task.create({
      title: '[ReminderTest] Task Without DueDate',
      dueDate: null,
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    // Task 5: Overdue task from 3 days ago (must NOT be sent)
    const taskOverdue = await Task.create({
      title: '[ReminderTest] Task Overdue',
      dueDate: new Date('2026-10-21T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const eligibleList = await findEligibleReminders(refDate);
    const eligibleIds = eligibleList.map((e) => e.task._id.toString());

    assert(eligibleIds.includes(taskDayBefore._id.toString()), 'Task due tomorrow should be eligible for day_before');
    assert(eligibleIds.includes(taskDueToday._id.toString()), 'Task due today should be eligible for due_today');
    assert(!eligibleIds.includes(taskCompleted._id.toString()), 'Completed tasks must NEVER be eligible');
    assert(!eligibleIds.includes(taskNoDueDate._id.toString()), 'Tasks without dueDate must NEVER be eligible');
    assert(!eligibleIds.includes(taskOverdue._id.toString()), 'Overdue tasks must NEVER be eligible');
    console.log('  2.1 Eligibility Filtering (completed, no dueDate, overdue skipped): PASS');

    console.log('\n[3] Telegram Delivery Routing (User A with Telegram Enabled):');
    mockTelegramSuccess = true;
    telegramCallCount = 0;

    const cycleStats1 = await runReminderCycle(refDate);
    assert(cycleStats1.sentTelegram >= 2, `Expected at least 2 telegram sends, got ${cycleStats1.sentTelegram}`);
    assert(cycleStats1.sentInApp === 0, 'Telegram-successful deliveries must NOT create in-app notifications');
    assert(telegramCallCount >= 2, 'Telegram fetch should have been called');

    const inAppForUserA = await Notification.find({ recipient: userA._id, type: NOTIFICATION_TYPES.TASK_REMINDER });
    assert(inAppForUserA.length === 0, 'No visible in-app notification should exist when Telegram succeeded');
    console.log('  3.1 Telegram Success -> No duplicate in-app notification: PASS');

    console.log('\n[4] Deduplication & Re-running Scheduler:');
    // Re-running scheduler on the same reference date should send 0 new reminders
    const cycleStats2 = await runReminderCycle(refDate);
    assert(cycleStats2.sentTelegram === 0, 'Re-running scheduler must not re-send to Telegram');
    assert(cycleStats2.sentInApp === 0, 'Re-running scheduler must not create duplicate notifications');
    assert(cycleStats2.skipped >= 2, 'Already-sent reminders must be skipped');
    console.log('  4.1 Re-run Idempotency (0 duplicates): PASS');

    console.log('\n[5] Fallback to In-App when Telegram Disabled / Not Configured (User B):');
    const taskUserB = await Task.create({
      title: '[ReminderTest] User B In-App Reminder',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userB._id,
      assignedTo: userB._id,
      status: 'todo',
    });

    const cycleStats3 = await runReminderCycle(refDate);
    assert(cycleStats3.sentInApp >= 1, 'Disabled Telegram must fall back to in-app notification');

    const notifsUserB = await Notification.find({ recipient: userB._id, taskId: taskUserB._id });
    assert(notifsUserB.length === 1, 'Exactly one in-app notification should be created for User B');
    assert(notifsUserB[0].sender === null, 'System reminder notification sender must be null');
    assert(notifsUserB[0].type === NOTIFICATION_TYPES.TASK_REMINDER, 'Notification type must be task_reminder');
    console.log('  5.1 Telegram Disabled -> In-App Fallback: PASS');

    console.log('\n[6] Fallback to In-App when Telegram Fails (Network / Bot Error):');
    mockTelegramSuccess = false; // Simulate Telegram API failure

    const taskFailTelegram = await Task.create({
      title: '[ReminderTest] Telegram Error Task',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const cycleStats4 = await runReminderCycle(refDate);
    assert(cycleStats4.sentInApp >= 1, 'Failed Telegram attempt must fall back to in-app notification');

    const notifsFailedFallback = await Notification.find({ recipient: userA._id, taskId: taskFailTelegram._id });
    assert(notifsFailedFallback.length === 1, 'In-app notification created as fallback for failed Telegram delivery');

    // Confirm delivery record marks in_app and sent
    const deliveryRec = await TaskReminderDelivery.findOne({ taskId: taskFailTelegram._id });
    assert(deliveryRec.channel === DELIVERY_CHANNELS.IN_APP, 'Delivery record channel should be in_app');
    assert(deliveryRec.status === DELIVERY_STATUS.SENT, 'Delivery record status should be sent');

    // Re-running scheduler must not re-attempt Telegram
    mockTelegramSuccess = true;
    telegramCallCount = 0;
    const cycleStats5 = await runReminderCycle(refDate);
    assert(telegramCallCount === 0, 'Successfully fallen-back reminder must never re-trigger Telegram');
    console.log('  6.1 Telegram Error -> Safe Fallback to In-App & Never Re-attempted: PASS');

    console.log('\n[7] Existing In-App Notification API & Populated Task Retrieval:');
    const tokensUserB = generateTokens(userB._id.toString());
    const apiRes = await fetch(`${baseUrl}/api/notifications`, {
      headers: {
        Authorization: `Bearer ${tokensUserB.accessToken}`,
      },
    });
    const apiData = await apiRes.json();
    assert(apiRes.status === 200, 'Notification API should return 200');
    assert(apiData.data?.notifications?.length >= 1, 'Notification API should return User B notifications');

    const reminderNotif = apiData.data.notifications.find((n) => n.taskId?._id?.toString() === taskUserB._id.toString());
    assert(reminderNotif, 'Created reminder notification must be retrievable from API');
    assert(reminderNotif.type === NOTIFICATION_TYPES.TASK_REMINDER, 'API notification type must be task_reminder');
    assert(reminderNotif.taskId.title === taskUserB.title, 'Notification should populate task title for client modal click');
    console.log('  7.1 Existing Notification API compatibility & Task Populating: PASS');

    console.log('\n[8] Recipient Delegation & Workspace Isolation:');
    // Task created by userA but assigned to userC
    const taskAssigned = await Task.create({
      title: '[ReminderTest] Delegated Task to User C',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userC._id,
      status: 'todo',
    });

    await runReminderCycle(refDate);

    const userCNotifs = await Notification.find({ recipient: userC._id, taskId: taskAssigned._id });
    const userANotifs = await Notification.find({ recipient: userA._id, taskId: taskAssigned._id });

    assert(userCNotifs.length === 1, 'Assignee (User C) should receive the reminder');
    assert(userANotifs.length === 0, 'Creator (User A) should NOT receive the reminder when assignedTo is present');
    console.log('  8.1 Recipient Priority (Assignee > Creator): PASS');

    console.log('\n[9] Due Date Change Produces New Dedupe Key & New Reminder:');
    // Change taskUserB dueDate to next month
    taskUserB.dueDate = new Date('2026-11-15T00:00:00.000Z');
    await taskUserB.save();

    const futureRefDate = new Date('2026-11-15T10:00:00.000Z');
    const futureStats = await runReminderCycle(futureRefDate);
    assert(futureStats.sentInApp >= 1, 'New dueDate should produce a new reminder when the new date arrives');

    const totalUserBNotifs = await Notification.find({ recipient: userB._id, taskId: taskUserB._id });
    assert(totalUserBNotifs.length === 2, 'User B should have received 1 reminder for old date and 1 for new date');
    console.log('  9.1 Due Date Change Deduplication Isolation: PASS');

    console.log('\n[10] Non-UTC Timezone Local 09:00 Boundary:');
    // Create user in Tokyo (UTC+9)
    const userTokyo = await User.create({
      name: 'User Tokyo',
      email: 'tokyo@reminder_test.local',
      password: 'StrongPassword123!',
      timezone: 'Asia/Tokyo',
      telegramSettings: { enabled: false },
    });

    const taskTokyo = await Task.create({
      title: '[ReminderTest] Tokyo Task',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userTokyo._id,
      assignedTo: userTokyo._id,
      status: 'todo',
    });

    // Reference time: 2026-10-23 23:30:00 UTC
    // In Tokyo (UTC+9), this is 2026-10-24 08:30:00 AM (hour is 8, which is < 9 AM)
    const earlyTokyoRef = new Date('2026-10-23T23:30:00.000Z');
    const earlyEligible = await findEligibleReminders(earlyTokyoRef);
    const tokyoEarlyEligible = earlyEligible.find((e) => e.task._id.toString() === taskTokyo._id.toString());
    assert(!tokyoEarlyEligible, 'Tokyo task must NOT be eligible at 08:30 AM local time');

    // Reference time: 2026-10-24 00:30:00 UTC
    // In Tokyo (UTC+9), this is 2026-10-24 09:30:00 AM (hour is 9, which is >= 9 AM)
    const tokyoEligibleRef = new Date('2026-10-24T00:30:00.000Z');
    const nineAmEligible = await findEligibleReminders(tokyoEligibleRef);
    const tokyoNineAmEligible = nineAmEligible.find((e) => e.task._id.toString() === taskTokyo._id.toString());
    assert(tokyoNineAmEligible, 'Tokyo task MUST be eligible at 09:30 AM local time');
    console.log('  10.1 IANA Timezone Local 09:00 AM Boundary Check: PASS');

    console.log('\n[11] Timezone Synchronization API Endpoint:');
    const updateTzRes = await fetch(`${baseUrl}/api/auth/timezone`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokensUserB.accessToken}`,
      },
      body: JSON.stringify({ timezone: 'Europe/Paris' }),
    });
    const updateTzData = await updateTzRes.json();
    assert(updateTzRes.status === 200, 'PATCH /api/auth/timezone should return 200');
    assert(updateTzData.data?.user?.timezone === 'Europe/Paris', 'User timezone should be updated to Europe/Paris');

    const invalidTzRes = await fetch(`${baseUrl}/api/auth/timezone`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokensUserB.accessToken}`,
      },
      body: JSON.stringify({ timezone: 'Mars/Phobos' }),
    });
    assert(invalidTzRes.status === 400, 'Invalid timezone should be rejected with 400');
    console.log('  11.1 Protected Timezone Sync Endpoint: PASS');

    console.log('\n--- ALL 11 TASK REMINDER & SMART ROUTING TEST SUITES PASSED SUCCESSFULLY ---');
  } finally {
    // Restore global fetch
    global.fetch = originalFetch;
    await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.connection.close();
  }
};

runReminderTests().catch((err) => {
  console.error('\n❌ REMINDER TEST FAILED:\n', err);
  process.exit(1);
});
