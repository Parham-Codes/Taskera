import mongoose from 'mongoose';
import { Organization, OrganizationMember, ORG_ROLES, User, ActivityLog, ACTIVITY_ACTIONS } from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Helper to generate a clean URL-friendly slug
const generateSlug = (name) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base || 'org'}-${Math.floor(1000 + Math.random() * 9000)}`;
};

/**
 * Create a new Organization / Team Space
 */
export const createOrganization = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { name, description } = req.body;
    const slug = generateSlug(name);

    const [organization] = await Organization.create(
      [
        {
          name,
          slug,
          description: description || '',
          owner: req.user._id,
        },
      ],
      { session }
    );

    // Auto-assign creator as the Owner in members
    await OrganizationMember.create(
      [
        {
          organizationId: organization._id,
          userId: req.user._id,
          role: ORG_ROLES.OWNER,
        },
      ],
      { session }
    );

    // Record initial activity
    await ActivityLog.create(
      [
        {
          organizationId: organization._id,
          actorId: req.user._id,
          action: ACTIVITY_ACTIONS.MEMBER_JOINED,
          details: { role: ORG_ROLES.OWNER },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, {
      message: 'Organization created successfully',
      statusCode: 201,
      data: {
        organization: {
          id: organization._id,
          name: organization.name,
          slug: organization.slug,
          description: organization.description,
          role: ORG_ROLES.OWNER,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    next(error);
  }
};

/**
 * List all organizations the user belongs to (for Workspace Switcher)
 */
export const getMyOrganizations = async (req, res, next) => {
  try {
    const memberships = await OrganizationMember.find({ userId: req.user._id })
      .populate('organizationId', 'name slug description createdAt')
      .lean();

    const organizations = memberships
      .filter((m) => m.organizationId) // Guard against any deleted orgs
      .map((m) => ({
        id: m.organizationId._id,
        name: m.organizationId.name,
        slug: m.organizationId.slug,
        description: m.organizationId.description,
        role: m.role,
        joinedAt: m.createdAt,
      }));

    return successResponse(res, {
      message: 'Organizations fetched successfully',
      data: { organizations },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all members of the active organization (for assigning tasks)
 */
export const getOrganizationMembers = async (req, res, next) => {
  try {
    const members = await OrganizationMember.find({ organizationId: req.organizationId })
      .populate('userId', 'name email avatar')
      .lean();

    const formattedMembers = members
      .filter((m) => m.userId)
      .map((m) => ({
        id: m.userId._id,
        name: m.userId.name,
        email: m.userId.email,
        avatar: m.userId.avatar,
        role: m.role,
        joinedAt: m.createdAt,
      }));

    return successResponse(res, {
      message: 'Organization members fetched successfully',
      data: { members: formattedMembers },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add / Invite a registered employee to the organization
 */
export const addMember = async (req, res, next) => {
  try {
    const { email, role } = req.body;

    const targetUser = await User.findOne({ email }).select('_id name email').lean();
    if (!targetUser) {
      return errorResponse(res, {
        message: 'No registered user found with this email',
        statusCode: 404,
      });
    }

    const existingMember = await OrganizationMember.findOne({
      organizationId: req.organizationId,
      userId: targetUser._id,
    }).lean();

    if (existingMember) {
      return errorResponse(res, {
        message: 'This user is already a member of this organization',
        statusCode: 409,
      });
    }

    const newMember = await OrganizationMember.create({
      organizationId: req.organizationId,
      userId: targetUser._id,
      role: role || ORG_ROLES.MEMBER,
    });

    await ActivityLog.create({
      organizationId: req.organizationId,
      actorId: req.user._id,
      action: ACTIVITY_ACTIONS.MEMBER_JOINED,
      details: {
        addedUserId: targetUser._id,
        addedUserName: targetUser.name,
        role: newMember.role,
      },
    });

    return successResponse(res, {
      message: 'Member added to organization successfully',
      statusCode: 201,
      data: {
        member: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: newMember.role,
          joinedAt: newMember.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update member role (e.g. promote member to manager)
 */
export const updateMemberRole = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body;

    const membership = await OrganizationMember.findOne({
      organizationId: req.organizationId,
      userId: memberId,
    });

    if (!membership) {
      return errorResponse(res, {
        message: 'Member not found in this organization',
        statusCode: 404,
      });
    }

    if (membership.role === ORG_ROLES.OWNER) {
      return errorResponse(res, {
        message: 'Cannot change the role of the organization owner',
        statusCode: 400,
      });
    }

    membership.role = role;
    await membership.save();

    await ActivityLog.create({
      organizationId: req.organizationId,
      actorId: req.user._id,
      action: ACTIVITY_ACTIONS.ROLE_UPDATED,
      details: {
        targetUserId: memberId,
        newRole: role,
      },
    });

    return successResponse(res, {
      message: 'Member role updated successfully',
      data: {
        memberId,
        role,
      },
    });
  } catch (error) {
    next(error);
  }
};
