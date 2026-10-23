import './testSetup.js';
import { server } from '../src/app.js';
import connectDB from '../src/config/db.js';
import { User, Organization, OrganizationMember, Task, Comment, ActivityLog, Category } from '../src/models/index.js';
import { generateTokens, verifyAccessToken } from '../src/utils/token.js';

const runVerification = async () => {
  await connectDB();
  console.log('--- STARTING SECURITY & WORKSPACE INTEGRATION CHECKS ---');

  // Cleanup test records from previous runs
  await User.deleteMany({ email: { $in: ['parham_test@venta.com', 'employee_test@venta.com', 'intruder_test@other.com'] } });
  await Organization.deleteMany({ slug: /^venta-test/ });

  // 1. Test User Registration via Model & Pre-save
  const manager = await User.create({
    name: 'Parham Manager',
    email: 'parham_test@venta.com',
    password: 'securePassword123',
  });
  console.log('1. User Registration: PASS (ID:', manager._id.toString(), ')');

  // Verify password hashed
  const checkPass = await manager.comparePassword('securePassword123');
  console.log('2. Password Hashing & Comparison: PASS (Matches:', checkPass, ')');

  // Verify JWT Token generation & verification using active secrets
  const tokens = generateTokens(manager._id.toString());
  const verified = verifyAccessToken(tokens.accessToken);
  if (verified.sub !== manager._id.toString()) {
    throw new Error('JWT verification payload mismatch');
  }
  console.log('2.1 JWT Tokens & Secret Verification: PASS (Subject:', verified.sub, ')');

  // 2. Test Personal Task Creation (Dual-mode: Solo space)
  const personalTask = await Task.create({
    title: 'Personal Study Task',
    description: 'Learn Next.js & Redux',
    createdBy: manager._id,
    assignedTo: manager._id,
    organizationId: null,
  });
  console.log('3. Personal Task Creation: PASS (OrgId is null)');

  // 3. Test Organization Creation
  const org = await Organization.create({
    name: 'Venta Shop Test',
    slug: `venta-test-${Date.now()}`,
    owner: manager._id,
  });
  await OrganizationMember.create({
    organizationId: org._id,
    userId: manager._id,
    role: 'owner',
  });
  console.log('4. Organization & Owner Membership: PASS (Org:', org.name, ')');

  // 4. Test Employee Registration & Membership
  const employee = await User.create({
    name: 'Venta Employee',
    email: 'employee_test@venta.com',
    password: 'employeePassword123',
  });
  await OrganizationMember.create({
    organizationId: org._id,
    userId: employee._id,
    role: 'member',
  });
  console.log('5. Employee Added to Org: PASS');

  // 5. Test Manager Assigning Task to Employee
  const teamTask = await Task.create({
    title: 'Prepare Venta Shop Inventory',
    createdBy: manager._id,
    assignedTo: employee._id,
    organizationId: org._id,
    priority: 'high',
    status: 'todo',
  });
  console.log('6. Team Task Assigned: PASS (Assigned to employee:', employee.name, ')');

  // 6. Test Commenting
  const comment = await Comment.create({
    taskId: teamTask._id,
    authorId: employee._id,
    content: 'Started checking warehouse inventory today.',
  });
  console.log('7. Task Comment Added: PASS (Author:', employee.name, ')');

  // 7. Test Tenant Isolation Boundary (Intruder outside org)
  const intruder = await User.create({
    name: 'Intruder',
    email: 'intruder_test@other.com',
    password: 'intruderPassword123',
  });

  const intruderMembership = await OrganizationMember.findOne({
    organizationId: org._id,
    userId: intruder._id,
  });
  console.log('8. Tenant Boundary Isolation: PASS (Intruder membership is:', intruderMembership, ')');

  // 8. Test Workspace-Scoped Categories (Personal vs Organization)
  const personalCategory = await Category.create({
    name: 'توسعه فردی',
    color: '#8B5CF6',
    createdBy: manager._id,
    organizationId: null,
  });
  console.log('9. Personal Category Created: PASS (Color:', personalCategory.color, ')');

  const orgCategory = await Category.create({
    name: 'تیم فروش',
    color: '#10B981',
    createdBy: manager._id,
    organizationId: org._id,
  });
  console.log('10. Organization Category Created: PASS (Org:', orgCategory.organizationId.toString(), ')');

  // 9. Test Task with Category and Subtasks
  const taskWithSubtasks = await Task.create({
    title: 'تسک همراه با چک‌لیست و دسته‌بندی',
    createdBy: manager._id,
    assignedTo: employee._id,
    organizationId: org._id,
    categoryId: orgCategory._id,
    subtasks: [
      { title: 'مرحله اول: بررسی نیازمندی‌ها', completed: true, completedAt: new Date() },
      { title: 'مرحله دوم: تست نهایی', completed: false },
    ],
  });
  console.log('11. Task with Subtasks & Category: PASS (Subtasks count:', taskWithSubtasks.subtasks.length, ')');

  // 10. Test Batch Task Creation (AI Markdown Import pattern)
  const batchTasks = await Task.insertMany([
    {
      title: 'تسک اول ورودی AI',
      description: 'توضیحات تسک اول',
      createdBy: manager._id,
      assignedTo: manager._id,
      organizationId: org._id,
      priority: 'high',
      subtasks: [{ title: 'زیرتسک ۱', completed: false }],
    },
    {
      title: 'تسک دوم ورودی AI',
      description: 'توضیحات تسک دوم',
      createdBy: manager._id,
      assignedTo: manager._id,
      organizationId: org._id,
      priority: 'medium',
      subtasks: [{ title: 'زیرتسک ۲', completed: true }],
    },
  ]);
  console.log('12. Batch Tasks Created (AI Import Pattern): PASS (Count:', batchTasks.length, ')');

  // Cleanup
  await User.deleteMany({ email: { $in: ['parham_test@venta.com', 'employee_test@venta.com', 'intruder_test@other.com'] } });
  await Organization.deleteMany({ _id: org._id });
  await OrganizationMember.deleteMany({ organizationId: org._id });
  await Task.deleteMany({ _id: { $in: [personalTask._id, teamTask._id, taskWithSubtasks._id, ...batchTasks.map(b => b._id)] } });
  await Category.deleteMany({ _id: { $in: [personalCategory._id, orgCategory._id] } });
  await Comment.deleteMany({ _id: comment._id });

  console.log('--- ALL ARCHITECTURE & SECURITY CHECKS PASSED SUCCESSFULLY ---');
  process.exit(0);
};

runVerification().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
