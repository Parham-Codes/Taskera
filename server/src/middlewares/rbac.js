import mongoose from 'mongoose';
import { OrganizationMember, ORG_ROLES } from '../models/index.js';
import { errorResponse } from '../utils/apiResponse.js';

/**
 * Extracts organizationId from params, headers, query, or body
 */
const resolveOrganizationId = (req) => {
  return (
    req.params.orgId ||
    req.params.organizationId ||
    req.headers['x-organization-id'] ||
    req.query.organizationId ||
    req.body.organizationId ||
    null
  );
};

/**
 * Verifies that the authenticated user is a verified member of the requested organization
 * Enforces strict multi-tenancy boundary to avoid data leakage
 */
export const requireOrgMember = async (req, res, next) => {
  try {
    const orgId = resolveOrganizationId(req);

    if (!orgId) {
      return errorResponse(res, {
        message: 'Organization ID is required for this action',
        statusCode: 400,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      return errorResponse(res, {
        message: 'Invalid Organization ID format',
        statusCode: 400,
      });
    }

    // High performance indexed query
    const member = await OrganizationMember.findOne({
      organizationId: orgId,
      userId: req.user._id,
    }).lean();

    if (!member) {
      return errorResponse(res, {
        message: 'Access denied: You are not a member of this organization',
        statusCode: 403,
      });
    }

    req.organizationId = orgId;
    req.orgMember = member;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Factory middleware to enforce Role-Based Access Control (RBAC) within an organization
 * @param {Array<string>} allowedRoles e.g. ['owner', 'manager']
 */
export const requireOrgRole = (allowedRoles = [ORG_ROLES.OWNER, ORG_ROLES.MANAGER]) => {
  return (req, res, next) => {
    if (!req.orgMember) {
      return errorResponse(res, {
        message: 'Organization membership context missing',
        statusCode: 403,
      });
    }

    if (!allowedRoles.includes(req.orgMember.role)) {
      return errorResponse(res, {
        message: `Forbidden: This action requires one of the following roles: [${allowedRoles.join(', ')}]`,
        statusCode: 403,
      });
    }

    next();
  };
};
