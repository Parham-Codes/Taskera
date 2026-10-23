import { assert } from './helpers.js';
import { Task, OrganizationMember, ORG_ROLES } from '../../src/models/index.js';

/**
 * Scenario 3:
 * Permissions for `owner`, `manager`, and `member` according to actual project policies.
 */
export async function testTeamRoles({ authFetch, users, tokens, orgs }) {
  console.log('[Scenario 3] Organization Role Permissions (Owner vs Manager vs Member):');

  const { alice, bob, charlie, eva } = users;
  const { aliceToken, bobToken, charlieToken } = tokens;
  const { org1 } = orgs;

  // 3.1 Regular Member (Charlie) CANNOT add members -> 403 Forbidden
  const charlieAddMemberRes = await authFetch(`/api/organizations/${org1._id}/members`, charlieToken, {
    method: 'POST',
    body: JSON.stringify({ email: eva.email, role: 'member' }),
  });
  assert(charlieAddMemberRes.status === 403, `Expected 403 for member adding member, got ${charlieAddMemberRes.status}`);
  console.log('  ✓ 3.1 Member role cannot invite/add new members: PASS (403)');

  // 3.2 Manager (Bob) CAN add members -> 201 Created
  const bobAddMemberRes = await authFetch(`/api/organizations/${org1._id}/members`, bobToken, {
    method: 'POST',
    body: JSON.stringify({ email: eva.email, role: 'member' }),
  });
  assert(bobAddMemberRes.status === 201, `Expected 201 for manager adding member, got ${bobAddMemberRes.status}`);
  console.log('  ✓ 3.2 Manager role can add new members: PASS (201)');

  // 3.3 Manager (Bob) CANNOT change member roles -> 403 Forbidden
  const bobChangeRoleRes = await authFetch(`/api/organizations/${org1._id}/members/${charlie._id}/role`, bobToken, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'manager' }),
  });
  assert(bobChangeRoleRes.status === 403, `Expected 403 for manager updating role, got ${bobChangeRoleRes.status}`);
  console.log('  ✓ 3.3 Manager role cannot promote or change roles: PASS (403)');

  // 3.4 Owner (Alice) CAN change member roles -> 200 OK
  const aliceChangeRoleRes = await authFetch(`/api/organizations/${org1._id}/members/${charlie._id}/role`, aliceToken, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'manager' }),
  });
  assert(aliceChangeRoleRes.status === 200, `Expected 200 for owner updating role, got ${aliceChangeRoleRes.status}`);
  console.log('  ✓ 3.4 Owner role can promote/change member roles: PASS (200)');

  // 3.5 Demoting Owner is blocked -> 400 Bad Request
  const demoteOwnerRes = await authFetch(`/api/organizations/${org1._id}/members/${alice._id}/role`, aliceToken, {
    method: 'PATCH',
    body: JSON.stringify({ role: 'member' }),
  });
  assert(demoteOwnerRes.status === 400, `Expected 400 when demoting owner, got ${demoteOwnerRes.status}`);
  console.log('  ✓ 3.5 Changing owner role is forbidden: PASS (400)');

  // Reset Charlie back to regular member for task testing
  await OrganizationMember.findOneAndUpdate(
    { organizationId: org1._id, userId: charlie._id },
    { role: ORG_ROLES.MEMBER }
  );

  // --- Task Operations within Team Space ---
  console.log('\n  --- Team Task Permissions ---');

  // Team task created by Alice, assigned to Charlie
  const teamTask = await Task.create({
    title: '[RBAC_TEST] Critical Backend Refactor',
    description: 'Optimize DB indices',
    createdBy: alice._id,
    assignedTo: charlie._id,
    organizationId: org1._id,
    status: 'todo',
    priority: 'high',
  });

  // 3.6 Charlie (Member) cannot modify full details (title, priority, assignee) of task he did not create
  const charlieFullEditRes = await authFetch(`/api/tasks/${teamTask._id}`, charlieToken, {
    method: 'PATCH',
    body: JSON.stringify({ title: '[RBAC_TEST] Charlie Unauthorized Rename', priority: 'low' }),
  });
  assert(charlieFullEditRes.status === 403, `Expected 403 for member editing full task, got ${charlieFullEditRes.status}`);
  console.log('  ✓ 3.6 Regular member cannot edit full task details created by manager/owner: PASS (403)');

  // 3.7 Charlie (Assignee) CAN transition task status of his assigned task
  const charlieStatusRes = await authFetch(`/api/tasks/${teamTask._id}`, charlieToken, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'in-progress' }),
  });
  assert(charlieStatusRes.status === 200, `Expected 200 for assignee transitioning status, got ${charlieStatusRes.status}`);
  console.log('  ✓ 3.7 Assignee can update status of assigned team task: PASS (200)');

  // 3.8 Charlie (Member) cannot delete team task created by Alice
  const charlieDeleteRes = await authFetch(`/api/tasks/${teamTask._id}`, charlieToken, {
    method: 'DELETE',
  });
  assert(charlieDeleteRes.status === 403, `Expected 403 for member deleting task, got ${charlieDeleteRes.status}`);
  console.log('  ✓ 3.8 Member cannot delete team task created by others: PASS (403)');

  // 3.9 Bob (Manager) CAN edit full details of any task in the organization
  const bobEditRes = await authFetch(`/api/tasks/${teamTask._id}`, bobToken, {
    method: 'PATCH',
    body: JSON.stringify({ title: '[RBAC_TEST] Manager Updated Title', priority: 'urgent' }),
  });
  assert(bobEditRes.status === 200, `Expected 200 for manager updating task, got ${bobEditRes.status}`);
  console.log('  ✓ 3.9 Manager can update any task in organization: PASS (200)');

  // 3.10 Member CAN create and delete their own task in organization
  const charlieOwnTaskRes = await authFetch('/api/tasks', charlieToken, {
    method: 'POST',
    body: JSON.stringify({
      title: '[RBAC_TEST] Charlie Self-Created Task',
      organizationId: org1._id.toString(),
    }),
  });
  assert(charlieOwnTaskRes.status === 201, `Expected 201, got ${charlieOwnTaskRes.status}`);
  const charlieOwnTaskData = await charlieOwnTaskRes.json();
  const charlieTaskId = charlieOwnTaskData.data.task._id;

  const charlieDeleteOwnRes = await authFetch(`/api/tasks/${charlieTaskId}`, charlieToken, {
    method: 'DELETE',
  });
  assert(charlieDeleteOwnRes.status === 200, `Expected 200, got ${charlieDeleteOwnRes.status}`);
  console.log('  ✓ 3.10 Member can manage/delete tasks they created themselves: PASS (200)');

  // 3.11 Manager CAN delete team task
  const bobDeleteRes = await authFetch(`/api/tasks/${teamTask._id}`, bobToken, {
    method: 'DELETE',
  });
  assert(bobDeleteRes.status === 200, `Expected 200 for manager deleting task, got ${bobDeleteRes.status}`);
  console.log('  ✓ 3.11 Manager can delete team task: PASS (200)\n');
}
