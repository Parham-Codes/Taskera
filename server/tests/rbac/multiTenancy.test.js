import { assert } from './helpers.js';
import { Task } from '../../src/models/index.js';

/**
 * Scenario 2:
 * Membership in one team alone does NOT grant access to another team (Tenant Boundary Isolation).
 */
export async function testMultiTenancy({ authFetch, users, tokens, orgs }) {
  console.log('[Scenario 2] Multi-Tenant Boundary Isolation:');

  const { alice, charlie, dave } = users;
  const { aliceToken, daveToken } = tokens;
  const { org1 } = orgs;

  // Create a task inside Org 1
  const org1Task = await Task.create({
    title: '[RBAC_TEST] Org 1 Roadmap Plan',
    createdBy: alice._id,
    assignedTo: charlie._id,
    organizationId: org1._id,
    status: 'todo',
    priority: 'high',
  });

  // 2.1 Dave (Org 2 owner/member) attempts to query Org 1 tasks -> 403 Forbidden
  const daveQueryOrg1Res = await authFetch(`/api/tasks?organizationId=${org1._id}`, daveToken);
  assert(daveQueryOrg1Res.status === 403, `Expected 403, got ${daveQueryOrg1Res.status}`);
  console.log('  ✓ 2.1 Cross-tenant task query blocked with 403: PASS');

  // 2.2 Dave attempts to create task inside Org 1 -> 403 Forbidden
  const daveCreateOrg1Res = await authFetch('/api/tasks', daveToken, {
    method: 'POST',
    body: JSON.stringify({
      title: '[RBAC_TEST] Intruder Task in Org1',
      organizationId: org1._id.toString(),
    }),
  });
  assert(daveCreateOrg1Res.status === 403, `Expected 403, got ${daveCreateOrg1Res.status}`);
  console.log('  ✓ 2.2 Cross-tenant task creation blocked with 403: PASS');

  // 2.3 Dave attempts to read Org 1 task by ID -> 403 Forbidden
  const daveReadTaskRes = await authFetch(`/api/tasks/${org1Task._id}`, daveToken);
  assert(daveReadTaskRes.status === 403, `Expected 403, got ${daveReadTaskRes.status}`);
  console.log('  ✓ 2.3 Cross-tenant single task read blocked with 403: PASS');

  // 2.4 Dave attempts to update Org 1 task -> 403 Forbidden
  const daveUpdateTaskRes = await authFetch(`/api/tasks/${org1Task._id}`, daveToken, {
    method: 'PATCH',
    body: JSON.stringify({ title: '[RBAC_TEST] Dave Hacked Org1 Task' }),
  });
  assert(daveUpdateTaskRes.status === 403, `Expected 403, got ${daveUpdateTaskRes.status}`);
  console.log('  ✓ 2.4 Cross-tenant task update blocked with 403: PASS');

  // 2.5 Dave attempts to delete Org 1 task -> 403 Forbidden
  const daveDeleteTaskRes = await authFetch(`/api/tasks/${org1Task._id}`, daveToken, {
    method: 'DELETE',
  });
  assert(daveDeleteTaskRes.status === 403, `Expected 403, got ${daveDeleteTaskRes.status}`);
  console.log('  ✓ 2.5 Cross-tenant task delete blocked with 403: PASS');

  // 2.6 Dave attempts to view Org 1 members -> 403 Forbidden
  const daveListMembersRes = await authFetch(`/api/organizations/${org1._id}/members`, daveToken);
  assert(daveListMembersRes.status === 403, `Expected 403, got ${daveListMembersRes.status}`);
  console.log('  ✓ 2.6 Cross-tenant member list blocked with 403: PASS');

  // 2.7 Alice attempts to assign an Org 1 task to Dave (not a member of Org 1) -> 400 Bad Request
  const crossAssignRes = await authFetch('/api/tasks', aliceToken, {
    method: 'POST',
    body: JSON.stringify({
      title: '[RBAC_TEST] Invalid External Assignment',
      organizationId: org1._id.toString(),
      assignedTo: dave._id.toString(),
    }),
  });
  assert(crossAssignRes.status === 400, `Expected 400 when assigning to non-member, got ${crossAssignRes.status}`);
  console.log('  ✓ 2.7 Assigning team task to external non-member rejected with 400: PASS\n');
}
