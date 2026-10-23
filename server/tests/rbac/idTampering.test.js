import mongoose from 'mongoose';
import { assert } from './helpers.js';

/**
 * Scenario 5:
 * Guessed, forged, or malformed IDs must not bypass access control.
 */
export async function testIdTampering({ authFetch, tokens }) {
  console.log('[Scenario 5] ID Tampering, Guessing, and Format Checks:');

  const { aliceToken } = tokens;

  // 5.1 Malformed Task ID -> 400 Bad Request
  const badTaskIdRes = await authFetch('/api/tasks/not-a-valid-id-123', aliceToken);
  assert(badTaskIdRes.status === 400, `Expected 400 for malformed ID, got ${badTaskIdRes.status}`);
  console.log('  ✓ 5.1 Malformed Task ID returns 400: PASS');

  // 5.2 Non-existent Task ID (valid ObjectId format) -> 404 Not Found
  const nonExistentTaskId = new mongoose.Types.ObjectId();
  const notFoundTaskRes = await authFetch(`/api/tasks/${nonExistentTaskId}`, aliceToken);
  assert(notFoundTaskRes.status === 404, `Expected 404 for non-existent task, got ${notFoundTaskRes.status}`);
  console.log('  ✓ 5.2 Non-existent Task ID returns 404: PASS');

  // 5.3 Malformed Organization ID -> 400 Bad Request
  const badOrgIdRes = await authFetch('/api/organizations/invalid-org-id/members', aliceToken);
  assert(badOrgIdRes.status === 400, `Expected 400 for malformed org ID, got ${badOrgIdRes.status}`);
  console.log('  ✓ 5.3 Malformed Org ID returns 400: PASS');

  // 5.4 Non-existent Organization ID -> 403 Forbidden (membership verification fails)
  const nonExistentOrgId = new mongoose.Types.ObjectId();
  const notFoundOrgRes = await authFetch(`/api/organizations/${nonExistentOrgId}/members`, aliceToken);
  assert(notFoundOrgRes.status === 403, `Expected 403 for non-member org, got ${notFoundOrgRes.status}`);
  console.log('  ✓ 5.4 Non-existent/unjoined Org ID blocked with 403: PASS\n');
}
