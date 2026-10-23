import { assert } from './helpers.js';
import { Task } from '../../src/models/index.js';

/**
 * Scenario 1:
 * Users cannot view, edit, delete, or comment on another user's personal (solo) tasks.
 */
export async function testPersonalTasks({ authFetch, users, tokens }) {
  console.log('[Scenario 1] Personal Task Space Isolation:');

  const { alice, bob } = users;
  const { aliceToken, bobToken } = tokens;

  // Alice creates personal task
  const alicePersonalTask = await Task.create({
    title: '[RBAC_TEST] Alice Secret Notes',
    createdBy: alice._id,
    assignedTo: alice._id,
    organizationId: null,
  });

  // Bob creates personal task
  const bobPersonalTask = await Task.create({
    title: '[RBAC_TEST] Bob Financial Goals',
    createdBy: bob._id,
    assignedTo: bob._id,
    organizationId: null,
  });

  // 1.1 Alice fetches personal tasks -> should only see her own
  const aliceListRes = await authFetch('/api/tasks', aliceToken);
  const aliceListData = await aliceListRes.json();
  assert(aliceListRes.status === 200, `Expected 200, got ${aliceListRes.status}`);
  const taskIds = aliceListData.data.tasks.map((t) => t._id.toString());
  assert(taskIds.includes(alicePersonalTask._id.toString()), 'Alice must see her own personal task');
  assert(!taskIds.includes(bobPersonalTask._id.toString()), 'Alice must NOT see Bob personal task in listing');
  console.log('  ✓ 1.1 Listing personal tasks strictly filters by creator: PASS');

  // 1.2 Bob tries to read Alice's personal task directly by ID -> 403 Forbidden
  const bobReadAliceRes = await authFetch(`/api/tasks/${alicePersonalTask._id}`, bobToken);
  const bobReadAliceData = await bobReadAliceRes.json();
  assert(bobReadAliceRes.status === 403, `Expected 403, got ${bobReadAliceRes.status}`);
  assert(bobReadAliceData.message.includes('personal task'), 'Expected personal task access denied message');
  console.log('  ✓ 1.2 Direct read of another user personal task blocked with 403: PASS');

  // 1.3 Bob tries to edit Alice's personal task -> 403 Forbidden
  const bobEditAliceRes = await authFetch(`/api/tasks/${alicePersonalTask._id}`, bobToken, {
    method: 'PATCH',
    body: JSON.stringify({ title: '[RBAC_TEST] Tampered by Bob' }),
  });
  assert(bobEditAliceRes.status === 403, `Expected 403, got ${bobEditAliceRes.status}`);
  console.log('  ✓ 1.3 Update of another user personal task blocked with 403: PASS');

  // 1.4 Bob tries to delete Alice's personal task -> 403 Forbidden
  const bobDeleteAliceRes = await authFetch(`/api/tasks/${alicePersonalTask._id}`, bobToken, {
    method: 'DELETE',
  });
  assert(bobDeleteAliceRes.status === 403, `Expected 403, got ${bobDeleteAliceRes.status}`);
  console.log('  ✓ 1.4 Deletion of another user personal task blocked with 403: PASS');

  // 1.5 Bob tries to comment on Alice's personal task -> 403 Forbidden
  const bobCommentAliceRes = await authFetch(`/api/tasks/${alicePersonalTask._id}/comments`, bobToken, {
    method: 'POST',
    body: JSON.stringify({ content: 'Spam comment on personal task' }),
  });
  assert(bobCommentAliceRes.status === 403, `Expected 403, got ${bobCommentAliceRes.status}`);
  console.log('  ✓ 1.5 Commenting on another user personal task blocked with 403: PASS');

  // 1.6 Bob tries to track time on Alice's personal task -> 403 Forbidden
  const bobTimeTrackRes = await authFetch(`/api/tasks/${alicePersonalTask._id}/time/start`, bobToken, {
    method: 'POST',
  });
  assert(bobTimeTrackRes.status === 403, `Expected 403, got ${bobTimeTrackRes.status}`);
  console.log('  ✓ 1.6 Time tracking on another user personal task blocked with 403: PASS\n');
}
