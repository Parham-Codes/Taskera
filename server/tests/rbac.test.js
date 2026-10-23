import './testSetup.js';
import mongoose from 'mongoose';
import { setupTestEnvironment, seedRBACFixtures } from './rbac/helpers.js';
import { testUnauthenticated } from './rbac/unauthenticated.test.js';
import { testPersonalTasks } from './rbac/personalTasks.test.js';
import { testMultiTenancy } from './rbac/multiTenancy.test.js';
import { testTeamRoles } from './rbac/teamRoles.test.js';
import { testIdTampering } from './rbac/idTampering.test.js';

const runAllRBACTests = async () => {
  console.log('--- STARTING MODULAR AUTHORIZATION & RBAC TEST SUITE ---\n');

  const { httpServer, authFetch, close } = await setupTestEnvironment();
  const fixture = await seedRBACFixtures();

  try {
    const testContext = {
      authFetch,
      users: fixture.users,
      tokens: fixture.tokens,
      orgs: fixture.orgs,
    };

    // Scenario 4: Request without auth or insufficient permissions
    await testUnauthenticated(testContext);

    // Scenario 1: Personal task space isolation
    await testPersonalTasks(testContext);

    // Scenario 2: Multi-tenant boundary isolation
    await testMultiTenancy(testContext);

    // Scenario 3: Organization role permissions (Owner, Manager, Member)
    await testTeamRoles(testContext);

    // Scenario 5: ID tampering, non-existent and malformed IDs
    await testIdTampering(testContext);

    console.log('✓ All 5 authorization scenarios verified successfully.');
    console.log('--- ALL AUTHORIZATION & RBAC SUITES COMPLETED WITH ZERO ERRORS ---\n');
    process.exit(0);
  } finally {
    await fixture.cleanup();
    await close();
    await mongoose.disconnect();
  }
};

runAllRBACTests().catch((err) => {
  console.error('\n[RBAC TEST SUITE FAILED]:', err);
  process.exit(1);
});
