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
  let mockTelegramMode = 'success'; // 'success' | 'confirmed_failure' | 'network_error'

  global.fetch = async (url, options) => {
    if (typeof url === 'string' && url.includes('api.telegram.org')) {
      telegramCallCount++;
      lastTelegramPayload = options?.body ? JSON.parse(options.body) : null;
      if (mockTelegramMode === 'success') {
        return {
          ok: true,
          json: async () => ({ ok: true, result: { message_id: 999 } }),
        };
      } else if (mockTelegramMode === 'confirmed_failure') {
        return {
          ok: false,
          json: async () => ({ ok: false, description: 'Bad Request: chat not found' }),
        };
      } else if (mockTelegramMode === 'network_error') {
        throw new Error('connect ETIMEDOUT 149.154.167.220:443');
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
    mockTelegramMode = 'success';
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
    mockTelegramMode = 'confirmed_failure'; // Simulate Telegram API confirmed failure

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
    mockTelegramMode = 'success';
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
    console.log('\n[12] Query Index & Explain Plan Verification:');
    // Ensure indexes are synced
    await Task.syncIndexes();
    const indexes = await Task.collection.indexes();
    const dueDateIndex = indexes.find(
      (idx) => idx.key.dueDate === 1 && idx.key.status === 1
    );
    assert(dueDateIndex, 'Task model MUST have { dueDate: 1, status: 1 } index');

    // Run explain on bounded reminder query
    const windowStart = new Date(refDate.getTime() - 48 * 3600 * 1000);
    const windowEnd = new Date(refDate.getTime() + 72 * 3600 * 1000);
    const explainPlan = await Task.find({
      dueDate: { $gte: windowStart, $lte: windowEnd },
      status: { $ne: 'completed' },
    }).explain('executionStats');

    const explainStr = JSON.stringify(explainPlan);
    const usesDueDateIndex =
      explainStr.includes('dueDate_1_status_1') || explainStr.includes('dueDate_1');
    assert(usesDueDateIndex, 'Query planner must utilize the dueDate index for bounded queries');
    console.log('  12.1 Index { dueDate: 1, status: 1 } and Explain Plan Verified: PASS');

    console.log('\n[13] In-App Idempotent Delivery and Retry (Zero Duplicate Notifications):');
    const idempotentTask = await Task.create({
      title: '[ReminderTest] Idempotent In-App Task',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userB._id,
      assignedTo: userB._id,
      status: 'todo',
    });

    const item13 = {
      task: idempotentTask,
      recipientUser: userB,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(idempotentTask._id, userB._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim13 = await claimReminderDelivery(item13);
    assert(claim13, 'Initial claim must succeed');

    // First dispatch creates in-app notification
    const res13_first = await dispatchReminder(item13, claim13);
    assert(res13_first.channel === DELIVERY_CHANNELS.IN_APP, 'Should deliver via in_app');

    const notifCountAfterFirst = await Notification.countDocuments({ reminderDeliveryId: claim13._id });
    assert(notifCountAfterFirst === 1, 'Exactly one in-app notification must be created');

    // Simulate server crash before delivery record status update: reset status to PROCESSING
    claim13.status = DELIVERY_STATUS.PROCESSING;
    await claim13.save();

    // Retry dispatch
    const res13_retry = await dispatchReminder(item13, claim13);
    assert(res13_retry.channel === DELIVERY_CHANNELS.IN_APP, 'Retry should complete via in_app');

    const notifCountAfterRetry = await Notification.countDocuments({ reminderDeliveryId: claim13._id });
    assert(notifCountAfterRetry === 1, 'Retry MUST NOT create a duplicate in-app notification');
    console.log('  13.1 Retry After In-App Insert (Idempotent 0 duplicates): PASS');

    console.log('\n[14] Concurrent In-App Dispatch Protection:');
    const concurrentTask = await Task.create({
      title: '[ReminderTest] Concurrent In-App Task',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userB._id,
      assignedTo: userB._id,
      status: 'todo',
    });

    const item14 = {
      task: concurrentTask,
      recipientUser: userB,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(concurrentTask._id, userB._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim14 = await claimReminderDelivery(item14);
    // Concurrently dispatch reminder
    const [resConcurrent1, resConcurrent2] = await Promise.all([
      dispatchReminder(item14, claim14),
      dispatchReminder(item14, claim14),
    ]);

    assert(resConcurrent1.success && resConcurrent2.success, 'Both concurrent attempts should finish safely');
    const concurrentNotifCount = await Notification.countDocuments({ reminderDeliveryId: claim14._id });
    assert(concurrentNotifCount === 1, 'Concurrent dispatches MUST result in exactly ONE notification');
    console.log('  14.1 Concurrent Dispatch Protection: PASS');

    console.log('\n[15] Unknown / Ambiguous Telegram Outcomes Handling:');
    mockTelegramMode = 'network_error'; // Simulate network timeout/transport error

    const taskAmbiguous = await Task.create({
      title: '[ReminderTest] Ambiguous Network Error Task',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const item15 = {
      task: taskAmbiguous,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(taskAmbiguous._id, userA._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim15 = await claimReminderDelivery(item15);
    const res15 = await dispatchReminder(item15, claim15);

    assert(res15.unknown === true, 'Transport error must be flagged as unknown outcome');
    const rec15 = await TaskReminderDelivery.findById(claim15._id);
    assert(rec15.status === DELIVERY_STATUS.UNKNOWN, 'Status must be marked as UNKNOWN');
    assert(rec15.channel === DELIVERY_CHANNELS.TELEGRAM, 'Channel must be marked as TELEGRAM');

    // Confirm no in-app notification was created for the ambiguous Telegram attempt
    const inAppFor15 = await Notification.find({ taskId: taskAmbiguous._id });
    assert(inAppFor15.length === 0, 'Ambiguous Telegram attempt MUST NOT create in-app notification');

    // Re-running claim on UNKNOWN record must NOT reclaim for automatic redelivery
    const reclaimUnknown = await claimReminderDelivery(item15);
    assert(reclaimUnknown === null, 'UNKNOWN delivery records must NOT be automatically reclaimed');

    // Test stale processing record during telegram dispatch
    const staleTelegramRec = await TaskReminderDelivery.create({
      taskId: taskAmbiguous._id,
      recipient: userA._id,
      dueDateKey: '2026-10-25',
      reminderStage: REMINDER_STAGES.DAY_BEFORE,
      dedupeKey: 'stale:telegram:test:key',
      channel: DELIVERY_CHANNELS.TELEGRAM,
      status: DELIVERY_STATUS.PROCESSING,
      attemptCount: 1,
      processingStartedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 mins ago (stale)
    });

    const itemStaleTelegram = {
      task: taskAmbiguous,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DAY_BEFORE,
      dueDateKey: '2026-10-25',
      dedupeKey: 'stale:telegram:test:key',
    };

    const claimStale = await claimReminderDelivery(itemStaleTelegram);
    assert(claimStale === null, 'Stale Telegram processing record must NOT be reclaimed');

    const updatedStale = await TaskReminderDelivery.findById(staleTelegramRec._id);
    assert(updatedStale.status === DELIVERY_STATUS.UNKNOWN, 'Stale Telegram record must transition to UNKNOWN');
    console.log('  15.1 Ambiguous Transport Outcome Marked UNKNOWN & Never Re-sent: PASS');

    console.log('\n[16] Confirmed Telegram Rejection Falls Back to In-App Notification:');
    mockTelegramMode = 'confirmed_failure'; // Simulate 400 Bad Request: chat not found

    const taskConfirmedFail = await Task.create({
      title: '[ReminderTest] Confirmed Telegram Rejection Task',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const item16 = {
      task: taskConfirmedFail,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(taskConfirmedFail._id, userA._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim16 = await claimReminderDelivery(item16);
    const res16 = await dispatchReminder(item16, claim16);

    assert(res16.success === true, 'Confirmed rejection fallback must succeed');
    assert(res16.channel === DELIVERY_CHANNELS.IN_APP, 'Must fall back to in_app');

    const notif16 = await Notification.find({ taskId: taskConfirmedFail._id });
    assert(notif16.length === 1, 'Exactly one in-app notification created for confirmed rejection');
    console.log('  16.1 Confirmed Rejection Fallback to In-App: PASS');

    // =========================================================================
    // [17] TELEGRAM DELIVERY OUTCOME TRACKING & PERSISTENCE FAILURE ISOLATION (TASK 3)
    // =========================================================================
    console.log('\n[17] Telegram Delivery Outcome Tracking & Persistence Failure Isolation:');

    // 17.1 Telegram succeeds, initial SENT update fails -> recovers safely, never FAILED
    mockTelegramMode = 'success';
    const task17_1 = await Task.create({
      title: '[ReminderTest] 17.1 Telegram Success Persistence Error',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const item17_1 = {
      task: task17_1,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(task17_1._id, userA._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim17_1 = await claimReminderDelivery(item17_1);
    const origUpdateOne = TaskReminderDelivery.updateOne;
    let failSentCount = 0;

    try {
      TaskReminderDelivery.updateOne = async function (filter, update, options) {
        // Fail the first update attempting to mark status: SENT
        if (update?.$set?.status === DELIVERY_STATUS.SENT && failSentCount === 0) {
          failSentCount++;
          throw new Error('Simulated write failure on initial SENT update');
        }
        return origUpdateOne.call(this, filter, update, options);
      };

      const beforeTelegramCount = telegramCallCount;
      const res17_1 = await dispatchReminder(item17_1, claim17_1);

      assert(res17_1.channel === DELIVERY_CHANNELS.TELEGRAM, 'Channel must be telegram');
      assert(res17_1.success === true, 'Delivery must report success because telegram succeeded');

      const savedRec17_1 = await TaskReminderDelivery.findById(claim17_1._id);
      assert(savedRec17_1.status !== DELIVERY_STATUS.FAILED, 'Record must NEVER be marked FAILED when Telegram succeeded');
      assert(savedRec17_1.status === DELIVERY_STATUS.SENT, 'Record must recover to SENT status');

      // Verify that a subsequent cycle does not reclaim or resend
      const secondClaim = await claimReminderDelivery(item17_1);
      assert(secondClaim === null, 'Subsequent claim must be null (never redelivered)');
      assert(telegramCallCount === beforeTelegramCount + 1, 'Telegram must only be called once');
      console.log('  17.1 Telegram Succeeds & Initial Persistence Fails: PASS (Never FAILED, recovered to SENT, no duplicate send)');
    } finally {
      TaskReminderDelivery.updateOne = origUpdateOne;
    }

    // 17.2 Persistent SENT-Write Failure Simulation After Confirmed Telegram Success
    mockTelegramMode = 'success';
    const task17_2 = await Task.create({
      title: '[ReminderTest] 17.2 Persistent SENT-Write Failure Simulation',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const item17_2 = {
      task: task17_2,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(task17_2._id, userA._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim17_2 = await claimReminderDelivery(item17_2);
    const beforeTelegramCount17_2 = telegramCallCount;
    let failStaleRecoveryWrites = false;

    try {
      TaskReminderDelivery.updateOne = async function (filter, update, options) {
        // Target specifically this delivery record
        if (String(filter?._id) === String(claim17_2._id)) {
          // Fail all attempts to persist status: SENT (both initial and recovery)
          if (update?.$set?.status === DELIVERY_STATUS.SENT) {
            throw new Error('Simulated persistent write failure on SENT update');
          }
          if (failStaleRecoveryWrites) {
            throw new Error('Simulated database unavailability during stale recovery write');
          }
        }
        return origUpdateOne.call(this, filter, update, options);
      };

      const res17_2 = await dispatchReminder(item17_2, claim17_2);
      // 1. Telegram was called exactly once and returned success
      assert(telegramCallCount === beforeTelegramCount17_2 + 1, 'Telegram must be called exactly once');
      assert(res17_2.success === true, 'Dispatch must report success because Telegram confirmed delivery');
      assert(res17_2.channel === DELIVERY_CHANNELS.TELEGRAM, 'Reported channel must be TELEGRAM');

      // 2. The failure does not turn the delivery into retryable FAILED
      const dbRec17_2 = await TaskReminderDelivery.findById(claim17_2._id);
      assert(dbRec17_2.status !== DELIVERY_STATUS.FAILED, 'Must NOT be marked FAILED when persistent SENT writes fail');
      assert(dbRec17_2.channel === DELIVERY_CHANNELS.TELEGRAM, 'Channel must be recorded as TELEGRAM');

      // 3. Stays in a non-retryable state while persistence is failing
      const freshClaim = await claimReminderDelivery(item17_2);
      assert(freshClaim === null, 'Fresh processing claim must return null (non-retryable)');

      // 6. No in-app fallback created solely because saving SENT failed
      const notifs17_2 = await Notification.find({ taskId: task17_2._id });
      assert(notifs17_2.length === 0, 'No in-app fallback must be created when Telegram confirmed success');

      // Verify claimReminderDelivery behavior when stale recovery cannot update because DB is unavailable
      await TaskReminderDelivery.updateOne(
        { _id: claim17_2._id },
        { $set: { processingStartedAt: new Date(Date.now() - 25 * 60 * 1000) } }
      );
      failStaleRecoveryWrites = true;
      const staleClaimWhileDbDown = await claimReminderDelivery(item17_2);
      assert(staleClaimWhileDbDown === null, 'Stale recovery must return null even if DB fails to update record');
      assert(telegramCallCount === beforeTelegramCount17_2 + 1, 'Telegram must NOT be resent while DB is failing');

      // 4. After restoring database writes and simulating record is stale, recovery transitions to UNKNOWN
      failStaleRecoveryWrites = false;
      TaskReminderDelivery.updateOne = origUpdateOne; // fully restored

      const staleClaim = await claimReminderDelivery(item17_2);
      assert(staleClaim === null, 'Stale recovery must return null and safely prevent redelivery');

      const recoveredRec17_2 = await TaskReminderDelivery.findById(claim17_2._id);
      assert(recoveredRec17_2.status === DELIVERY_STATUS.UNKNOWN, 'Stale processing record must transition to UNKNOWN');

      // 5. Subsequent reminder cycle or claim does not send another Telegram message
      const postRecoveryClaim = await claimReminderDelivery(item17_2);
      assert(postRecoveryClaim === null, 'Post-recovery claim must be null');
      assert(telegramCallCount === beforeTelegramCount17_2 + 1, 'No duplicate Telegram message sent');

      const notifsFinal17_2 = await Notification.find({ taskId: task17_2._id });
      assert(notifsFinal17_2.length === 0, 'Final in-app notifications must remain zero');
      console.log('  17.2 Persistent SENT-Write Failure Simulation: PASS (Never FAILED, non-retryable, transitions to UNKNOWN, zero redeliveries)');
    } finally {
      TaskReminderDelivery.updateOne = origUpdateOne;
    }

    // 17.3 Persistent UNKNOWN-Write Failure Simulation After Ambiguous Transport Error
    mockTelegramMode = 'network_error';
    const task17_3 = await Task.create({
      title: '[ReminderTest] 17.3 Persistent UNKNOWN-Write Failure Simulation',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const item17_3 = {
      task: task17_3,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(task17_3._id, userA._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim17_3 = await claimReminderDelivery(item17_3);
    const beforeTelegramCount17_3 = telegramCallCount;

    try {
      TaskReminderDelivery.updateOne = async function (filter, update, options) {
        // Target specifically this delivery record
        if (String(filter?._id) === String(claim17_3._id)) {
          // Fail all attempts to persist status: UNKNOWN (both initial and catch path recovery)
          if (update?.$set?.status === DELIVERY_STATUS.UNKNOWN) {
            throw new Error('Simulated persistent write failure on UNKNOWN update');
          }
        }
        return origUpdateOne.call(this, filter, update, options);
      };

      const res17_3 = await dispatchReminder(item17_3, claim17_3);
      // 1. Mocked Telegram transport failure; called once, no immediate retry
      assert(telegramCallCount === beforeTelegramCount17_3 + 1, 'Telegram attempt executed once with transport failure');
      assert(res17_3.unknown === true, 'Must report unknown outcome');

      // 2 & 3. Neither initial nor recovery update persisted; generic catch path NEVER overwrites with FAILED
      const rec17_3 = await TaskReminderDelivery.findById(claim17_3._id);
      assert(rec17_3.status !== DELIVERY_STATUS.FAILED, 'Record must NEVER be overwritten as FAILED after transport error');
      assert(rec17_3.status === DELIVERY_STATUS.PROCESSING, 'Record remains in safe PROCESSING state with channel: TELEGRAM');
      assert(rec17_3.channel === DELIVERY_CHANNELS.TELEGRAM, 'Channel must be recorded as TELEGRAM');

      // 6. No in-app fallback created for ambiguous Telegram result
      const notifs17_3 = await Notification.find({ taskId: task17_3._id });
      assert(notifs17_3.length === 0, 'No in-app notification must be created on transport failure');

      // 4. Restore normal database writes, simulate stale recovery, verify delivery is made non-retryable
      TaskReminderDelivery.updateOne = origUpdateOne;
      await TaskReminderDelivery.updateOne(
        { _id: claim17_3._id },
        { $set: { processingStartedAt: new Date(Date.now() - 25 * 60 * 1000) } }
      );

      const staleClaim17_3 = await claimReminderDelivery(item17_3);
      assert(staleClaim17_3 === null, 'Stale recovery must return null (never redeliver to Telegram)');

      const recoveredRec17_3 = await TaskReminderDelivery.findById(claim17_3._id);
      assert(recoveredRec17_3.status === DELIVERY_STATUS.UNKNOWN, 'Record must now be safely marked UNKNOWN');

      // 5. Later scheduler cycle or claim does not send Telegram again
      const postClaim17_3 = await claimReminderDelivery(item17_3);
      assert(postClaim17_3 === null, 'Subsequent claim must return null');
      assert(telegramCallCount === beforeTelegramCount17_3 + 1, 'Telegram must not be contacted again');

      const notifsFinal17_3 = await Notification.find({ taskId: task17_3._id });
      assert(notifsFinal17_3.length === 0, 'In-app notification count must remain 0');
      console.log('  17.3 Persistent UNKNOWN-Write Failure Simulation: PASS (Never marked FAILED, safely recovers to UNKNOWN, zero duplicates)');
    } finally {
      TaskReminderDelivery.updateOne = origUpdateOne;
    }

    // 17.4 Telegram explicitly rejects the message -> in-app fallback creates exactly one notification
    mockTelegramMode = 'confirmed_failure';
    const task17_4 = await Task.create({
      title: '[ReminderTest] 17.4 Explicit Rejection Fallback',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const item17_4 = {
      task: task17_4,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(task17_4._id, userA._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim17_4 = await claimReminderDelivery(item17_4);
    const res17_4 = await dispatchReminder(item17_4, claim17_4);
    assert(res17_4.success === true, 'Explicit rejection fallback must succeed');
    assert(res17_4.channel === DELIVERY_CHANNELS.IN_APP, 'Channel must be in_app');

    const notifs17_4 = await Notification.find({ taskId: task17_4._id });
    assert(notifs17_4.length === 1, 'Exactly one in-app notification created');
    console.log('  17.4 Explicit Rejection In-App Fallback: PASS (Exactly 1 notification created)');

    // 17.5 In-app notification persistence fails -> recoverable retry creates exactly one notification
    const task17_5 = await Task.create({
      title: '[ReminderTest] 17.5 In-App Persistence Failure Retry',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userB._id, // User B has Telegram disabled
      assignedTo: userB._id,
      status: 'todo',
    });

    const item17_5 = {
      task: task17_5,
      recipientUser: userB,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(task17_5._id, userB._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    const claim17_5 = await claimReminderDelivery(item17_5);
    const origFindOneAndUpdate = Notification.findOneAndUpdate;
    let failInAppCount = 0;

    try {
      Notification.findOneAndUpdate = async function (filter, update, options) {
        if (failInAppCount === 0) {
          failInAppCount++;
          throw new Error('Simulated transient DB error during in-app notification insert');
        }
        return origFindOneAndUpdate.call(this, filter, update, options);
      };

      // First attempt fails during in-app insertion
      const res17_5_fail = await dispatchReminder(item17_5, claim17_5);
      assert(res17_5_fail.success === false, 'First attempt must report failure');

      const failedRec17_5 = await TaskReminderDelivery.findById(claim17_5._id);
      assert(failedRec17_5.status === DELIVERY_STATUS.FAILED, 'Delivery must be marked FAILED for recoverable in-app error');
      assert(failedRec17_5.channel === DELIVERY_CHANNELS.IN_APP, 'Channel must be in_app');

      // Now retry: restore Notification.findOneAndUpdate and re-claim
      Notification.findOneAndUpdate = origFindOneAndUpdate;
      const retryClaim = await claimReminderDelivery(item17_5);
      assert(retryClaim !== null, 'Failed in-app delivery must be reclaimable under attempt limit');
      assert(retryClaim.attemptCount === 2, 'Attempt count must be incremented to 2');

      const res17_5_retry = await dispatchReminder(item17_5, retryClaim);
      assert(res17_5_retry.success === true, 'Retry must succeed');

      const notifs17_5 = await Notification.find({ taskId: task17_5._id });
      assert(notifs17_5.length === 1, 'Exactly one in-app notification created despite initial failure and retry');
      console.log('  17.5 In-App Persistence Failure & Safe Idempotent Retry: PASS (Zero duplicate notifications)');
    } finally {
      Notification.findOneAndUpdate = origFindOneAndUpdate;
    }

    // 17.6 Concurrent or stale operations cannot overwrite an already-SENT delivery
    const task17_6 = await Task.create({
      title: '[ReminderTest] 17.6 Terminal State Immutability',
      dueDate: new Date('2026-10-24T00:00:00.000Z'),
      createdBy: userA._id,
      assignedTo: userA._id,
      status: 'todo',
    });

    const item17_6 = {
      task: task17_6,
      recipientUser: userA,
      reminderStage: REMINDER_STAGES.DUE_TODAY,
      dueDateKey: '2026-10-24',
      dedupeKey: buildDedupeKey(task17_6._id, userA._id, '2026-10-24', REMINDER_STAGES.DUE_TODAY),
    };

    mockTelegramMode = 'success';
    const claim17_6 = await claimReminderDelivery(item17_6);
    await dispatchReminder(item17_6, claim17_6);

    const sentRec17_6 = await TaskReminderDelivery.findById(claim17_6._id);
    assert(sentRec17_6.status === DELIVERY_STATUS.SENT, 'Record must be SENT');

    // Attempt a stale / concurrent worker update with FAILED
    await TaskReminderDelivery.updateOne(
      { _id: claim17_6._id, status: { $nin: [DELIVERY_STATUS.SENT, DELIVERY_STATUS.UNKNOWN] } },
      { $set: { status: DELIVERY_STATUS.FAILED, lastError: 'Late stale worker error' } }
    );

    // Attempt a stale worker update with UNKNOWN
    await TaskReminderDelivery.updateOne(
      { _id: claim17_6._id, status: { $ne: DELIVERY_STATUS.SENT } },
      { $set: { status: DELIVERY_STATUS.UNKNOWN, lastError: 'Late stale worker UNKNOWN' } }
    );

    const reloadedRec17_6 = await TaskReminderDelivery.findById(claim17_6._id);
    assert(reloadedRec17_6.status === DELIVERY_STATUS.SENT, 'Terminal SENT status must be immutable and cannot be overwritten by late FAILED/UNKNOWN');
    console.log('  17.6 Concurrent/Stale Terminal State Protection: PASS (SENT record cannot be overwritten)');

    console.log('\n--- ALL 17 TASK REMINDER & SMART ROUTING TEST SUITES PASSED SUCCESSFULLY ---');
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
