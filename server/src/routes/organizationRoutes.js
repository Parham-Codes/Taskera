import express from 'express';
import {
  createOrganization,
  getMyOrganizations,
  getOrganizationMembers,
  addMember,
  updateMemberRole,
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

export default router;
