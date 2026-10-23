import { assert } from './helpers.js';

/**
 * Scenario 4:
 * Requests without authentication or with insufficient tokens receive 401 Unauthorized.
 */
export async function testUnauthenticated({ authFetch }) {
  console.log('[Scenario 4] Unauthenticated Requests Rejection (401):');

  // 1. GET /api/tasks without token -> 401
  const noAuthGet = await authFetch('/api/tasks', null);
  assert(noAuthGet.status === 401, `Expected 401 on unauthenticated GET, got ${noAuthGet.status}`);

  // 2. POST /api/tasks without token -> 401
  const noAuthPost = await authFetch('/api/tasks', null, {
    method: 'POST',
    body: JSON.stringify({ title: '[RBAC_TEST] No Auth' }),
  });
  assert(noAuthPost.status === 401, `Expected 401 on unauthenticated POST, got ${noAuthPost.status}`);

  // 3. GET /api/organizations/my without token -> 401
  const noAuthOrg = await authFetch('/api/organizations/my', null);
  assert(noAuthOrg.status === 401, `Expected 401 on unauthenticated org fetch, got ${noAuthOrg.status}`);

  console.log('  ✓ 4.1 Endpoints correctly blocked with 401 when no token is present: PASS\n');
}
