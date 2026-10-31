import express from 'express';
import {
  createOrganization,
  getMyOrganizations,
  getOrganizationMembers,
  addMember,
  updateMemberRole,
  removeMemberDirectly,
  createMemberRemovalRequest,
  getMemberRemovalRequests,
  approveMemberRemovalRequest,
  rejectMemberRemovalRequest,
} from '../controllers/organizationController.js';
import { protectAuth } from '../middlewares/auth.js';
import { requireOrgMember, requireOrgRole } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import {
  createOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from '../validators/organizationValidators.js';
import { ORG_ROLES } from '../models/OrganizationMember.js';

const router = express.Router();

// Apply auth protection to all organization routes
router.use(protectAuth);

// Personal workspace list & creation
router.post('/', validate(createOrganizationSchema), createOrganization);
router.get('/my', getMyOrganizations);

// Organization-specific member management
router.get('/:orgId/members', requireOrgMember, getOrganizationMembers);
router.post(
  '/:orgId/members',
  requireOrgMember,
  requireOrgRole([ORG_ROLES.OWNER, ORG_ROLES.MANAGER]),
  validate(addMemberSchema),
  addMember
);
router.patch(
  '/:orgId/members/:memberId/role',
  requireOrgMember,
  requireOrgRole([ORG_ROLES.OWNER]),
  validate(updateMemberRoleSchema),
  updateMemberRole
);

// Member Removal Endpoints
// 1. Direct member removal by Organization Owner
router.delete(
  '/:orgId/members/:memberId',
  requireOrgMember,
  requireOrgRole([ORG_ROLES.OWNER]),
  removeMemberDirectly
);

// 2. Submit member removal request (Manager for member, or Owner)
router.post(
  '/:orgId/members/:memberId/removal-request',
  requireOrgMember,
  requireOrgRole([ORG_ROLES.OWNER, ORG_ROLES.MANAGER]),
  createMemberRemovalRequest
);

// 3. List all pending removal requests for the organization
router.get(
  '/:orgId/member-removal-requests',
  requireOrgMember,
  requireOrgRole([ORG_ROLES.OWNER, ORG_ROLES.MANAGER]),
  getMemberRemovalRequests
);

// 4. Approve pending removal request
router.post(
  '/:orgId/members/:memberId/removal-request/:requestId/approve',
  requireOrgMember,
  requireOrgRole([ORG_ROLES.OWNER, ORG_ROLES.MANAGER]),
  approveMemberRemovalRequest
);

// 5. Reject pending removal request
router.post(
  '/:orgId/members/:memberId/removal-request/:requestId/reject',
  requireOrgMember,
  requireOrgRole([ORG_ROLES.OWNER, ORG_ROLES.MANAGER]),
  rejectMemberRemovalRequest
);

export default router;
