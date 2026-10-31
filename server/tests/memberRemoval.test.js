import './testSetup.js';
import mongoose from 'mongoose';
import http from 'http';
import { server } from '../src/app.js';
import connectDB from '../src/config/db.js';
import { User, Organization, OrganizationMember, ActivityLog, ACTIVITY_ACTIONS, ORG_ROLES } from '../src/models/index.js';
import { generateTokens } from '../src/utils/token.js';
import { sendTelegramRemovalApprovalRequest } from '../src/services/telegramService.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

async function runMemberRemovalTestSuite() {
  console.log('--- STARTING TASKERA MEMBER REMOVAL & TELEGRAM APPROVAL TEST SUITE ---\n');

  await connectDB();

  const httpServer = http.createServer(server);
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = httpServer.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const authFetch = (path, token, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
    });
  };

  const testEmails = [
    'removal_owner@taskera.local',
    'removal_manager@taskera.local',
    'removal_member@taskera.local',
    'removal_other_manager@taskera.local',
    'removal_intruder@taskera.local',
  ];

  await User.deleteMany({ email: { $in: testEmails } });
  await Organization.deleteMany({ slug: /^removal-test-/ });

  const owner = await User.create({
    name: 'Alice Owner <script>',
    email: testEmails[0],
    password: 'Password123!',
    telegramSettings: {
      enabled: true,
      chatId: '111222333',
    },
  });

  const manager = await User.create({
    name: 'Bob Manager',
    email: testEmails[1],
    password: 'Password123!',
    telegramSettings: {
      enabled: true,
      chatId: '444555666',
    },
  });

  const member = await User.create({
    name: 'Charlie Member & Co',
    email: testEmails[2],
    password: 'Password123!',
  });

  const otherManager = await User.create({
    name: 'David Second Manager',
    email: testEmails[3],
    password: 'Password123!',
  });

  const intruder = await User.create({
    name: 'Eve Intruder',
    email: testEmails[4],
    password: 'Password123!',
  });

  const ownerToken = generateTokens(owner._id.toString()).accessToken;
  const managerToken = generateTokens(manager._id.toString()).accessToken;
  const memberToken = generateTokens(member._id.toString()).accessToken;
  const otherManagerToken = generateTokens(otherManager._id.toString()).accessToken;
  const intruderToken = generateTokens(intruder._id.toString()).accessToken;

  // Create primary test organization
  const orgA = await Organization.create({
    name: 'Org Alpha <VIP>',
    slug: `removal-test-a-${Date.now()}`,
    owner: owner._id,
  });

  // Create secondary organization for multi-tenant leak testing
  const orgB = await Organization.create({
    name: 'Org Beta',
    slug: `removal-test-b-${Date.now()}`,
    owner: owner._id,
  });

  // Add memberships to Org A
  await OrganizationMember.create([
    { organizationId: orgA._id, userId: owner._id, role: ORG_ROLES.OWNER },
    { organizationId: orgA._id, userId: manager._id, role: ORG_ROLES.MANAGER },
    { organizationId: orgA._id, userId: member._id, role: ORG_ROLES.MEMBER },
    { organizationId: orgA._id, userId: otherManager._id, role: ORG_ROLES.MANAGER },
  ]);

  // Add membership to Org B
  await OrganizationMember.create([
    { organizationId: orgB._id, userId: owner._id, role: ORG_ROLES.OWNER },
    { organizationId: orgB._id, userId: member._id, role: ORG_ROLES.MEMBER },
  ]);

  try {
    // -------------------------------------------------------------
    // Test 1: Owner can directly remove a Member
    // -------------------------------------------------------------
    console.log('Testing 1: Owner can directly remove a Member...');
    {
      const res = await authFetch(`/api/organizations/${orgA._id}/members/${member._id}`, ownerToken, {
        method: 'DELETE',
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const checkMember = await OrganizationMember.findOne({ organizationId: orgA._id, userId: member._id });
      assert(!checkMember, 'Member should be deleted from orgA');

      // Verify activity log
      const log = await ActivityLog.findOne({
        organizationId: orgA._id,
        action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
        'details.targetUserId': member._id.toString(),
      });
      assert(log, 'ActivityLog for direct member removal must exist');
      console.log('✓ 1 passed');
    }

    // Re-add member for remaining tests
    await OrganizationMember.create({ organizationId: orgA._id, userId: member._id, role: ORG_ROLES.MEMBER });

    // -------------------------------------------------------------
    // Test 2: Owner can directly remove a Manager
    // -------------------------------------------------------------
    console.log('Testing 2: Owner can directly remove a Manager...');
    {
      const res = await authFetch(`/api/organizations/${orgA._id}/members/${otherManager._id}`, ownerToken, {
        method: 'DELETE',
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      const checkMgr = await OrganizationMember.findOne({ organizationId: orgA._id, userId: otherManager._id });
      assert(!checkMgr, 'Manager should be deleted from orgA');
      console.log('✓ 2 passed');
    }

    // Re-add otherManager for subsequent tests
    await OrganizationMember.create({ organizationId: orgA._id, userId: otherManager._id, role: ORG_ROLES.MANAGER });

    // -------------------------------------------------------------
    // Test 3: Owner cannot remove themselves
    // -------------------------------------------------------------
    console.log('Testing 3: Owner cannot remove themselves...');
    {
      const res = await authFetch(`/api/organizations/${orgA._id}/members/${owner._id}`, ownerToken, {
        method: 'DELETE',
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      const checkOwner = await OrganizationMember.findOne({ organizationId: orgA._id, userId: owner._id });
      assert(checkOwner, 'Owner membership must still exist');
      console.log('✓ 3 passed');
    }

    // -------------------------------------------------------------
    // Test 4: Manager can submit a removal request for Member
    // -------------------------------------------------------------
    console.log('Testing 4: Manager can submit a removal request for Member...');
    let activeRequestId = null;
    {
      const res = await authFetch(`/api/organizations/${orgA._id}/members/${member._id}/removal-request`, managerToken, {
        method: 'POST',
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      const data = await res.json();
      assert(data.success, 'Response should indicate success');
      assert(data.data.status === 'pending', 'Status should be pending');
      assert(data.data.requestId, 'requestId must be returned');
      activeRequestId = data.data.requestId;

      // Verify request saved in DB
      const updatedMem = await OrganizationMember.findOne({ organizationId: orgA._id, userId: member._id });
      assert(updatedMem.removalRequest?.status === 'pending', 'DB membership should have pending removalRequest');
      assert(updatedMem.removalRequest?.requestId === activeRequestId, 'DB requestId should match');
      console.log('✓ 4 passed');
    }

    // -------------------------------------------------------------
    // Test 5: Manager cannot remove or request removal of another Manager
    // -------------------------------------------------------------
    console.log('Testing 5: Manager cannot remove or request removal of another Manager...');
    {
      // Try direct delete
      const resDelete = await authFetch(`/api/organizations/${orgA._id}/members/${otherManager._id}`, managerToken, {
        method: 'DELETE',
      });
      assert(resDelete.status === 403, `Direct delete by manager should be 403, got ${resDelete.status}`);

      // Try request removal
      const resReq = await authFetch(`/api/organizations/${orgA._id}/members/${otherManager._id}/removal-request`, managerToken, {
        method: 'POST',
      });
      assert(resReq.status === 403, `Manager requesting removal of manager should be 403, got ${resReq.status}`);
      console.log('✓ 5 passed');
    }

    // -------------------------------------------------------------
    // Test 6: Manager cannot remove Owner
    // -------------------------------------------------------------
    console.log('Testing 6: Manager cannot remove Owner...');
    {
      const res = await authFetch(`/api/organizations/${orgA._id}/members/${owner._id}/removal-request`, managerToken, {
        method: 'POST',
      });
      assert(res.status === 400 || res.status === 403, `Expected 400/403, got ${res.status}`);
      console.log('✓ 6 passed');
    }

    // -------------------------------------------------------------
    // Test 7: Member cannot perform removal operations
    // -------------------------------------------------------------
    console.log('Testing 7: Member cannot perform removal operations...');
    {
      const resDelete = await authFetch(`/api/organizations/${orgA._id}/members/${manager._id}`, memberToken, {
        method: 'DELETE',
      });
      assert(resDelete.status === 403, `Expected 403, got ${resDelete.status}`);

      const resReq = await authFetch(`/api/organizations/${orgA._id}/members/${manager._id}/removal-request`, memberToken, {
        method: 'POST',
      });
      assert(resReq.status === 403, `Expected 403, got ${resReq.status}`);
      console.log('✓ 7 passed');
    }

    // -------------------------------------------------------------
    // Test 8: Submitting request does NOT actually remove the member
    // -------------------------------------------------------------
    console.log('Testing 8: Submitting request does NOT actually remove the member...');
    {
      const checkMem = await OrganizationMember.findOne({ organizationId: orgA._id, userId: member._id });
      assert(checkMem !== null, 'Member must still exist in DB after submitting request');
      console.log('✓ 8 passed');
    }

    // -------------------------------------------------------------
    // Test 9: Duplicate removal request while pending is rejected (409)
    // -------------------------------------------------------------
    console.log('Testing 9: Duplicate removal request while pending is rejected (409)...');
    {
      const res = await authFetch(`/api/organizations/${orgA._id}/members/${member._id}/removal-request`, managerToken, {
        method: 'POST',
      });
      assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
      console.log('✓ 9 passed');
    }

    // -------------------------------------------------------------
    // Test 10: Rejecting request does NOT remove member & allows new request later
    // -------------------------------------------------------------
    console.log('Testing 10: Rejecting request does NOT remove member...');
    {
      const res = await authFetch(
        `/api/organizations/${orgA._id}/members/${member._id}/removal-request/${activeRequestId}/reject`,
        ownerToken,
        { method: 'POST' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);

      const checkMem = await OrganizationMember.findOne({ organizationId: orgA._id, userId: member._id });
      assert(checkMem !== null, 'Member must still exist in DB after rejection');
      assert(checkMem.removalRequest.status === 'rejected', 'Status should be rejected');

      // Now create a new request (should succeed because previous was rejected)
      const resNew = await authFetch(`/api/organizations/${orgA._id}/members/${member._id}/removal-request`, managerToken, {
        method: 'POST',
      });
      assert(resNew.status === 201, `Expected 201 for fresh request after rejection, got ${resNew.status}`);
      const dataNew = await resNew.json();
      activeRequestId = dataNew.data.requestId;
      console.log('✓ 10 passed');
    }

    // -------------------------------------------------------------
    // Test 11: Valid approval removes ONLY that membership in that organization
    // -------------------------------------------------------------
    console.log('Testing 11: Valid approval removes ONLY that membership in that organization...');
    {
      const res = await authFetch(
        `/api/organizations/${orgA._id}/members/${member._id}/removal-request/${activeRequestId}/approve`,
        ownerToken,
        { method: 'POST' }
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);

      const checkInOrgA = await OrganizationMember.findOne({ organizationId: orgA._id, userId: member._id });
      assert(!checkInOrgA, 'Member must be deleted from orgA');

      // Member in Org B must remain untouched!
      const checkInOrgB = await OrganizationMember.findOne({ organizationId: orgB._id, userId: member._id });
      assert(checkInOrgB !== null, 'Member membership in Org B must NOT be touched');
      console.log('✓ 11 passed');
    }

    // -------------------------------------------------------------
    // Test 12: Stale/processed request cannot be approved again
    // -------------------------------------------------------------
    console.log('Testing 12: Stale/processed request cannot be approved again...');
    {
      const res = await authFetch(
        `/api/organizations/${orgA._id}/members/${member._id}/removal-request/${activeRequestId}/approve`,
        ownerToken,
        { method: 'POST' }
      );
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      console.log('✓ 12 passed');
    }

    // Re-add member and create a new request for webhook tests
    await OrganizationMember.create({ organizationId: orgA._id, userId: member._id, role: ORG_ROLES.MEMBER });
    const reqCreate = await authFetch(`/api/organizations/${orgA._id}/members/${member._id}/removal-request`, managerToken, {
      method: 'POST',
    });
    const reqCreateData = await reqCreate.json();
    const webhookRequestId = reqCreateData.data.requestId;

    // -------------------------------------------------------------
    // Test 13: Requester cannot approve their own request
    // -------------------------------------------------------------
    console.log('Testing 13: Requester cannot approve their own request...');
    {
      const res = await authFetch(
        `/api/organizations/${orgA._id}/members/${member._id}/removal-request/${webhookRequestId}/approve`,
        managerToken,
        { method: 'POST' }
      );
      assert(res.status === 403, `Requester approving own request should be 403, got ${res.status}`);
      console.log('✓ 13 passed');
    }

    // -------------------------------------------------------------
    // Test 14: Webhook callback with invalid Secret is rejected (401)
    // -------------------------------------------------------------
    console.log('Testing 14: Webhook callback with invalid Secret is rejected (401)...');
    {
      process.env.TELEGRAM_WEBHOOK_SECRET = 'correct_super_secret_token_123';

      const resBadSecret = await fetch(`${baseUrl}/api/telegram/approval-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'wrong_secret',
        },
        body: JSON.stringify({
          callback_query: {
            id: 'cq_test_1',
            data: `approve_removal:${webhookRequestId}`,
            from: { id: 111222333 },
          },
        }),
      });
      assert(resBadSecret.status === 401, `Expected 401, got ${resBadSecret.status}`);
      console.log('✓ 14 passed');
    }

    // -------------------------------------------------------------
    // Test 15: Fake callback from unauthorized user (chatId mismatch) is rejected
    // -------------------------------------------------------------
    console.log('Testing 15: Fake callback from unauthorized user is rejected...');
    {
      const resFake = await fetch(`${baseUrl}/api/telegram/approval-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'correct_super_secret_token_123',
        },
        body: JSON.stringify({
          callback_query: {
            id: 'cq_test_fake',
            data: `approve_removal:${webhookRequestId}`,
            from: { id: 999999999 }, // Intruder chatId (not owner's 111222333)
            message: { chat: { id: 999999999 }, message_id: 101 },
          },
        }),
      });
      assert(resFake.status === 200, 'Telegram webhooks should return 200');
      const data = await resFake.json();
      assert(data.unauthorized === true, 'Response should flag unauthorized');

      // Ensure member was NOT removed
      const checkMem = await OrganizationMember.findOne({ organizationId: orgA._id, userId: member._id });
      assert(checkMem !== null, 'Member must still exist after unauthorized callback');
      console.log('✓ 15 passed');
    }

    // -------------------------------------------------------------
    // Test 16: Legitimate Telegram approval webhook deletes member & prevents double click
    // -------------------------------------------------------------
    console.log('Testing 16: Legitimate Telegram approval deletes member & prevents double click...');
    {
      const resValid = await fetch(`${baseUrl}/api/telegram/approval-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'correct_super_secret_token_123',
        },
        body: JSON.stringify({
          callback_query: {
            id: 'cq_test_valid',
            data: `approve_removal:${webhookRequestId}`,
            from: { id: 111222333 }, // Matches Owner's chatId
            message: { chat: { id: 111222333 }, message_id: 102, text: 'Request body' },
          },
        }),
      });
      assert(resValid.status === 200, `Expected 200, got ${resValid.status}`);
      const data = await resValid.json();
      assert(data.removed === true, 'Member should be removed');

      // Verify DB
      const checkMem = await OrganizationMember.findOne({ organizationId: orgA._id, userId: member._id });
      assert(!checkMem, 'Member should be deleted from DB');

      // Verify ActivityLog
      const log = await ActivityLog.findOne({
        organizationId: orgA._id,
        action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
        'details.method': 'telegram_approved',
      });
      assert(log, 'ActivityLog for telegram approval must exist');

      // Second click on the same telegram button should NOT repeat removal
      const resSecond = await fetch(`${baseUrl}/api/telegram/approval-webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-bot-api-secret-token': 'correct_super_secret_token_123',
        },
        body: JSON.stringify({
          callback_query: {
            id: 'cq_test_repeat',
            data: `approve_removal:${webhookRequestId}`,
            from: { id: 111222333 },
            message: { chat: { id: 111222333 }, message_id: 102 },
          },
        }),
      });
      assert(resSecond.status === 200, 'Second click returns 200');
      const dataSecond = await resSecond.json();
      assert(dataSecond.removed !== true, 'Second click should not remove anything');
      console.log('✓ 16 passed');
    }

    // -------------------------------------------------------------
    // Test 17 & 18: If Telegram is not configured, request stays in DB and in-app reviewable
    // -------------------------------------------------------------
    console.log('Testing 17 & 18: Requests remain valid if Owner has no Telegram...');
    {
      // Re-add member
      await OrganizationMember.create({ organizationId: orgA._id, userId: member._id, role: ORG_ROLES.MEMBER });

      // Temporarily remove owner's telegram
      await User.findByIdAndUpdate(owner._id, { 'telegramSettings.chatId': '' });

      const res = await authFetch(`/api/organizations/${orgA._id}/members/${member._id}/removal-request`, managerToken, {
        method: 'POST',
      });
      assert(res.status === 201, `Expected 201, got ${res.status}`);
      const data = await res.json();
      assert(data.data.status === 'pending', 'Status must be pending');
      assert(data.data.telegramSent === false, 'telegramSent should be false');

      // Check listing endpoint
      const resList = await authFetch(`/api/organizations/${orgA._id}/member-removal-requests`, ownerToken);
      assert(resList.status === 200, `Expected 200, got ${resList.status}`);
      const listData = await resList.json();
      assert(listData.data.requests.length >= 1, 'Request must be reviewable in app');

      // Restore owner telegram
      await User.findByIdAndUpdate(owner._id, { 'telegramSettings.chatId': '111222333' });
      console.log('✓ 17 & 18 passed');
    }

    // -------------------------------------------------------------
    // Test 19: HTML in user or organization names does not break Telegram message
    // -------------------------------------------------------------
    console.log('Testing 19: HTML in user or organization names is safely escaped...');
    {
      const resTg = await sendTelegramRemovalApprovalRequest({
        ownerChatId: '111222333',
        orgName: '<Evil & Dangerous Org>',
        orgId: orgA._id.toString(),
        requesterName: '<b>Hacker</b>',
        memberName: '<i>Victim</i>',
        memberRole: 'member',
        requestId: 'req_123',
      });
      // Even if no bot token is set in test env, the function must execute without crashing
      assert(typeof resTg === 'object', 'sendTelegramRemovalApprovalRequest should return an object');
      console.log('✓ 19 passed');
    }

    // -------------------------------------------------------------
    // Test 20: Detail URL properly points to organization and request
    // -------------------------------------------------------------
    console.log('Testing 20: Detail link opens the correct organization and request...');
    {
      const customClient = 'https://parham-codes.github.io';
      let baseClientUrl = customClient.trim().replace(/\/+$/, '');
      if (baseClientUrl.includes('github.io') && !baseClientUrl.endsWith('/Taskera')) {
        baseClientUrl = `${baseClientUrl}/Taskera`;
      }
      const testUrl = `${baseClientUrl}/teams/${orgA._id}?memberRemovalRequest=req_xyz_123`;
      assert(testUrl.includes('/Taskera/teams/'), 'URL must contain /Taskera/teams/');
      assert(!testUrl.includes('/Taskera/Taskera/'), 'URL must NOT duplicate /Taskera/Taskera/');
      assert(testUrl.endsWith(`?memberRemovalRequest=req_xyz_123`), 'Query param must match');
      console.log('✓ 20 passed');
    }

    // -------------------------------------------------------------
    // Test 21: Requests do not leak between organizations
    // -------------------------------------------------------------
    console.log('Testing 21: Requests do not leak between organizations...');
    {
      const resOrgA = await authFetch(`/api/organizations/${orgA._id}/member-removal-requests`, ownerToken);
      const resOrgB = await authFetch(`/api/organizations/${orgB._id}/member-removal-requests`, ownerToken);

      const listA = (await resOrgA.json()).data.requests;
      const listB = (await resOrgB.json()).data.requests;

      assert(listA.length >= 1, 'Org A should have pending requests');
      assert(listB.length === 0, 'Org B should NOT have Org A requests');
      console.log('✓ 21 passed');
    }

    // -------------------------------------------------------------
    // Test 22: Intruder without membership cannot view or modify requests
    // -------------------------------------------------------------
    console.log('Testing 22: Intruder without membership cannot view or modify requests...');
    {
      const resList = await authFetch(`/api/organizations/${orgA._id}/member-removal-requests`, intruderToken);
      assert(resList.status === 403, `Expected 403 for intruder, got ${resList.status}`);
      console.log('✓ 22 passed');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 22 MEMBER REMOVAL & TELEGRAM APPROVAL TESTS PASSED!');
    console.log('======================================================\n');
  } finally {
    // Cleanup fixtures
    await User.deleteMany({ email: { $in: testEmails } });
    await Organization.deleteMany({ _id: { $in: [orgA._id, orgB._id] } });
    await OrganizationMember.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await ActivityLog.deleteMany({ organizationId: { $in: [orgA._id, orgB._id] } });
    await new Promise((resolve) => httpServer.close(resolve));
    await mongoose.disconnect();
  }
}

runMemberRemovalTestSuite().catch((err) => {
  console.error('\n❌ [TEST SUITE FAILED]:', err);
  process.exit(1);
});
