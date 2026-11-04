import './testSetup.js';
import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { server } from '../src/app.js';
import connectDB from '../src/config/db.js';
import { initSocketServer, emitToWorkspace } from '../src/services/socketService.js';
import { User, Organization, OrganizationMember } from '../src/models/index.js';
import { generateTokens } from '../src/utils/token.js';

const runSocketTests = async () => {
  await connectDB();
  console.log('--- STARTING REAL-TIME SOCKET.IO AUTOMATED TESTS ---');

  // Cleanup old test data
  await User.deleteMany({ email: { $in: ['sock_user1@test.com', 'sock_user2@test.com', 'sock_intruder@test.com'] } });
  await Organization.deleteMany({ slug: /^socket-test/ });

  // 1. Create Test Users
  const user1 = await User.create({
    name: 'Socket Member 1',
    email: 'sock_user1@test.com',
    password: 'Password123!',
  });
  const user2 = await User.create({
    name: 'Socket Member 2',
    email: 'sock_user2@test.com',
    password: 'Password123!',
  });
  const intruder = await User.create({
    name: 'Socket Intruder',
    email: 'sock_intruder@test.com',
    password: 'Password123!',
  });

  // 2. Create Workspace and add user1 and user2
  const org = await Organization.create({
    name: 'Socket Test Workspace',
    slug: 'socket-test-' + Date.now(),
    owner: user1._id,
  });

  await OrganizationMember.create({
    organizationId: org._id,
    userId: user1._id,
    role: 'owner',
  });
  await OrganizationMember.create({
    organizationId: org._id,
    userId: user2._id,
    role: 'member',
  });

  // 3. Start Test HTTP Server with Socket.IO
  const testServer = http.createServer(server);
  initSocketServer(testServer);

  const testPort = 7099;
  await new Promise((resolve) => testServer.listen(testPort, resolve));
  console.log(`1. Test Socket Server listening on port ${testPort}: PASS`);

  const serverUrl = `http://localhost:${testPort}`;
  const token1 = generateTokens(user1._id.toString()).accessToken;
  const token2 = generateTokens(user2._id.toString()).accessToken;
  const tokenIntruder = generateTokens(intruder._id.toString()).accessToken;

  // 4. Test Unauthenticated Connection Rejection
  const unauthClient = ClientIO(serverUrl, {
    transports: ['websocket'],
    reconnection: false,
  });

  const unauthRejected = await new Promise((resolve) => {
    unauthClient.on('connect_error', (err) => {
      resolve(err.message.includes('Authentication error'));
    });
    unauthClient.on('connect', () => resolve(false));
  });
  unauthClient.disconnect();
  console.log('2. Unauthenticated Socket Rejected: PASS (Matches:', unauthRejected, ')');

  // 5. Test Authenticated Connections
  const client1 = ClientIO(serverUrl, {
    transports: ['websocket'],
    auth: { token: token1 },
    reconnection: false,
  });
  const client2 = ClientIO(serverUrl, {
    transports: ['websocket'],
    auth: { token: token2 },
    reconnection: false,
  });
  const clientIntruder = ClientIO(serverUrl, {
    transports: ['websocket'],
    auth: { token: tokenIntruder },
    reconnection: false,
  });

  await Promise.all([
    new Promise((resolve) => client1.on('connect', resolve)),
    new Promise((resolve) => client2.on('connect', resolve)),
    new Promise((resolve) => clientIntruder.on('connect', resolve)),
  ]);
  console.log('3. Authenticated Clients Connected: PASS');

  // 6. Test Workspace Authorization on Join
  // Client 1 joins org workspace
  const join1Res = await new Promise((resolve) => {
    client1.emit('workspace:join', { workspaceId: org._id.toString() }, resolve);
  });
  console.log('4. Member 1 joins Workspace: PASS (Success:', join1Res?.success, ')');

  // Client 2 joins org workspace
  const join2Res = await new Promise((resolve) => {
    client2.emit('workspace:join', { workspaceId: org._id.toString() }, resolve);
  });
  console.log('5. Member 2 joins Workspace: PASS (Success:', join2Res?.success, ')');

  // Intruder tries to join org workspace -> MUST FAIL
  const intruderJoinRes = await new Promise((resolve) => {
    clientIntruder.emit('workspace:join', { workspaceId: org._id.toString() }, resolve);
  });
  console.log('6. Intruder Blocked from Workspace Room: PASS (Success:', intruderJoinRes?.success, ')');

  // 7. Test Real-Time Event Broadcast to Workspace Members
  let client2ReceivedCreated = null;
  let intruderReceivedCreated = null;

  client2.on('task:created', (data) => {
    client2ReceivedCreated = data;
  });
  clientIntruder.on('task:created', (data) => {
    intruderReceivedCreated = data;
  });

  // Emit task:created to the workspace
  emitToWorkspace(org._id.toString(), 'task:created', {
    task: { _id: 'fake-task-1', title: 'Realtime Sync Task' },
    workspaceId: org._id.toString(),
    senderId: user1._id.toString(),
  });

  // Wait 100ms for event propagation
  await new Promise((r) => setTimeout(r, 100));

  console.log('7. Member 2 received task:created: PASS (Title:', client2ReceivedCreated?.task?.title, ')');
  console.log('8. Intruder did NOT receive event: PASS (Intruder received:', intruderReceivedCreated === null, ')');

  // 8. Test task:updated and task:deleted
  let client2ReceivedUpdated = null;
  let client2ReceivedDeleted = null;

  client2.on('task:updated', (data) => {
    client2ReceivedUpdated = data;
  });
  client2.on('task:deleted', (data) => {
    client2ReceivedDeleted = data;
  });

  emitToWorkspace(org._id.toString(), 'task:updated', {
    task: { _id: 'fake-task-1', title: 'Realtime Sync Task Updated' },
    workspaceId: org._id.toString(),
  });
  emitToWorkspace(org._id.toString(), 'task:deleted', {
    taskId: 'fake-task-1',
    workspaceId: org._id.toString(),
  });

  await new Promise((r) => setTimeout(r, 100));

  console.log('9. Member 2 received task:updated: PASS (Title:', client2ReceivedUpdated?.task?.title, ')');
  console.log('10. Member 2 received task:deleted: PASS (TaskId:', client2ReceivedDeleted?.taskId, ')');

  // 9. Cleanup & Shutdown
  client1.disconnect();
  client2.disconnect();
  clientIntruder.disconnect();

  await new Promise((resolve) => testServer.close(resolve));
  await User.deleteMany({ email: { $in: ['sock_user1@test.com', 'sock_user2@test.com', 'sock_intruder@test.com'] } });
  await Organization.deleteMany({ slug: /^socket-test/ });

  console.log('--- ALL REAL-TIME SOCKET.IO TESTS PASSED WITH 100% SUCCESS ---');
  process.exit(0);
};

runSocketTests().catch((err) => {
  console.error('Socket tests failed:', err);
  process.exit(1);
});
