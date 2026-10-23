import http from 'http';
import { server } from '../../src/app.js';
import connectDB from '../../src/config/db.js';
import { User, Organization, OrganizationMember, Task, ORG_ROLES } from '../../src/models/index.js';
import { generateTokens } from '../../src/utils/token.js';

export function assert(condition, message) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

export async function setupTestEnvironment() {
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

  return {
    httpServer,
    baseUrl,
    authFetch,
    close: () => new Promise((resolve) => httpServer.close(resolve)),
  };
}

export async function seedRBACFixtures() {
  const emails = [
    'alice_owner@taskera.local',
    'bob_manager@taskera.local',
    'charlie_member@taskera.local',
    'dave_intruder@taskera.local',
    'eva_new@taskera.local',
  ];

  await User.deleteMany({ email: { $in: emails } });
  await Task.deleteMany({ title: /^\[RBAC_TEST\]/ });
  await Organization.deleteMany({ slug: /^rbac-test-/ });

  const alice = await User.create({ name: 'Alice Owner', email: emails[0], password: 'Password123!' });
  const bob = await User.create({ name: 'Bob Manager', email: emails[1], password: 'Password123!' });
  const charlie = await User.create({ name: 'Charlie Member', email: emails[2], password: 'Password123!' });
  const dave = await User.create({ name: 'Dave Intruder', email: emails[3], password: 'Password123!' });
  const eva = await User.create({ name: 'Eva Candidate', email: emails[4], password: 'Password123!' });

  const aliceToken = generateTokens(alice._id.toString()).accessToken;
  const bobToken = generateTokens(bob._id.toString()).accessToken;
  const charlieToken = generateTokens(charlie._id.toString()).accessToken;
  const daveToken = generateTokens(dave._id.toString()).accessToken;
  const evaToken = generateTokens(eva._id.toString()).accessToken;

  const org1 = await Organization.create({
    name: 'Venta Core Team',
    slug: `rbac-test-org1-${Date.now()}`,
    owner: alice._id,
  });

  await OrganizationMember.create([
    { organizationId: org1._id, userId: alice._id, role: ORG_ROLES.OWNER },
    { organizationId: org1._id, userId: bob._id, role: ORG_ROLES.MANAGER },
    { organizationId: org1._id, userId: charlie._id, role: ORG_ROLES.MEMBER },
  ]);

  const org2 = await Organization.create({
    name: 'Rival External Team',
    slug: `rbac-test-org2-${Date.now()}`,
    owner: dave._id,
  });

  await OrganizationMember.create([
    { organizationId: org2._id, userId: dave._id, role: ORG_ROLES.OWNER },
  ]);

  const cleanup = async () => {
    await User.deleteMany({ email: { $in: emails } });
    await Task.deleteMany({ title: /^\[RBAC_TEST\]/ });
    await Organization.deleteMany({ slug: /^rbac-test-/ });
  };

  return {
    users: { alice, bob, charlie, dave, eva },
    tokens: { aliceToken, bobToken, charlieToken, daveToken, evaToken },
    orgs: { org1, org2 },
    cleanup,
  };
}
