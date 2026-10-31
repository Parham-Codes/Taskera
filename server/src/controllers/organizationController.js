import mongoose from 'mongoose';
import { Organization, OrganizationMember, ORG_ROLES, User, ActivityLog, ACTIVITY_ACTIONS } from '../models/index.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { sendTelegramRemovalApprovalRequest } from '../services/telegramService.js';

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
        removalRequest:
          m.removalRequest && m.removalRequest.status === 'pending'
            ? {
                requestId: m.removalRequest.requestId,
                status: m.removalRequest.status,
                requestedAt: m.removalRequest.requestedAt,
                requestedBy: m.removalRequest.requestedBy,
              }
            : null,
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

/**
 * Remove an organization member directly (Owner only)
 */
export const removeMemberDirectly = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return errorResponse(res, {
        message: 'Invalid member ID format',
        statusCode: 400,
      });
    }

    const membership = await OrganizationMember.findOne({
      organizationId: req.organizationId,
      $or: [{ userId: memberId }, { _id: memberId }],
    }).populate('userId', 'name email');

    if (!membership) {
      return errorResponse(res, {
        message: 'Member not found in this organization',
        statusCode: 404,
      });
    }

    // Owner cannot remove self
    const targetUserId = String(membership.userId?._id || membership.userId);
    if (targetUserId === String(req.user._id)) {
      return errorResponse(res, {
        message: 'Organization owner cannot remove themselves from the organization',
        statusCode: 400,
      });
    }

    // Owner membership cannot be removed
    if (membership.role === ORG_ROLES.OWNER) {
      return errorResponse(res, {
        message: 'Cannot remove organization owner',
        statusCode: 400,
      });
    }

    await OrganizationMember.deleteOne({ _id: membership._id });

    await ActivityLog.create({
      organizationId: req.organizationId,
      actorId: req.user._id,
      action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
      details: {
        targetUserId,
        targetUserName: membership.userId?.name || '',
        method: 'direct_owner',
      },
    });

    return successResponse(res, {
      message: 'Member removed from organization successfully',
      data: {
        memberId: targetUserId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a member removal request (Manager for Member only, or Owner)
 */
export const createMemberRemovalRequest = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return errorResponse(res, {
        message: 'Invalid member ID format',
        statusCode: 400,
      });
    }

    const membership = await OrganizationMember.findOne({
      organizationId: req.organizationId,
      $or: [{ userId: memberId }, { _id: memberId }],
    }).populate('userId', 'name email');

    if (!membership) {
      return errorResponse(res, {
        message: 'Member not found in this organization',
        statusCode: 404,
      });
    }

    const targetUserId = String(membership.userId?._id || membership.userId);
    if (targetUserId === String(req.user._id)) {
      return errorResponse(res, {
        message: 'Cannot request removal of yourself',
        statusCode: 400,
      });
    }

    if (membership.role === ORG_ROLES.OWNER) {
      return errorResponse(res, {
        message: 'Cannot request removal of organization owner',
        statusCode: 400,
      });
    }

    // Manager can only request removal of standard 'member' role
    if (req.orgMember.role === ORG_ROLES.MANAGER && membership.role !== ORG_ROLES.MEMBER) {
      return errorResponse(res, {
        message: 'Managers can only request removal of standard members (not owners or other managers)',
        statusCode: 403,
      });
    }

    // Check if an active pending request already exists
    if (membership.removalRequest && membership.removalRequest.status === 'pending') {
      return errorResponse(res, {
        message: 'A pending removal request already exists for this member',
        statusCode: 409,
      });
    }

    const requestId = new mongoose.Types.ObjectId().toString();

    membership.removalRequest = {
      requestId,
      status: 'pending',
      requestedBy: req.user._id,
      requestedAt: new Date(),
      reviewedBy: null,
      reviewedAt: null,
    };

    await membership.save();

    await ActivityLog.create({
      organizationId: req.organizationId,
      actorId: req.user._id,
      action: ACTIVITY_ACTIONS.MEMBER_REMOVAL_REQUESTED,
      details: {
        targetUserId,
        targetUserName: membership.userId?.name || '',
        requestId,
      },
    });

    // Send Telegram approval message with inline buttons to the organization Owner
    let telegramSent = false;
    let telegramError = null;

    try {
      const organization = await Organization.findById(req.organizationId).lean();
      if (organization?.owner) {
        const ownerUser = await User.findById(organization.owner)
          .select('name email telegramSettings')
          .lean();

        if (ownerUser?.telegramSettings?.chatId) {
          const tgResult = await sendTelegramRemovalApprovalRequest({
            ownerChatId: ownerUser.telegramSettings.chatId,
            orgName: organization.name,
            orgId: organization._id,
            requesterName: req.user.name,
            memberName: membership.userId?.name || 'عضو',
            memberRole: membership.role,
            requestId,
          });
          telegramSent = Boolean(tgResult?.success);
          if (!tgResult?.success) {
            telegramError = tgResult?.reason || 'Failed to dispatch telegram notification';
          }
        }
      }
    } catch (err) {
      console.warn('[OrganizationController] Error sending Telegram removal request:', err?.message || err);
      telegramError = err?.message || 'Telegram notification failed';
    }

    return successResponse(res, {
      message: 'Removal request submitted successfully and awaiting owner approval',
      statusCode: 201,
      data: {
        requestId,
        status: 'pending',
        targetUserId,
        telegramSent,
        telegramError,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all pending removal requests for the organization
 */
export const getMemberRemovalRequests = async (req, res, next) => {
  try {
    const pendingMembers = await OrganizationMember.find({
      organizationId: req.organizationId,
      'removalRequest.status': 'pending',
    })
      .populate('userId', 'name email avatar')
      .populate('removalRequest.requestedBy', 'name email avatar')
      .lean();

    const requests = pendingMembers
      .filter((m) => m.userId && m.removalRequest)
      .map((m) => ({
        requestId: m.removalRequest.requestId,
        status: m.removalRequest.status,
        requestedAt: m.removalRequest.requestedAt,
        requestedBy: m.removalRequest.requestedBy
          ? {
              id: m.removalRequest.requestedBy._id,
              name: m.removalRequest.requestedBy.name,
              email: m.removalRequest.requestedBy.email,
              avatar: m.removalRequest.requestedBy.avatar,
            }
          : null,
        member: {
          id: m.userId._id,
          memberId: m._id,
          name: m.userId.name,
          email: m.userId.email,
          avatar: m.userId.avatar,
          role: m.role,
          joinedAt: m.createdAt,
        },
      }));

    return successResponse(res, {
      message: 'Pending removal requests fetched successfully',
      data: { requests },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve a pending member removal request (Owner or authorized Manager)
 */
export const approveMemberRemovalRequest = async (req, res, next) => {
  try {
    const { memberId, requestId } = req.params;

    const membership = await OrganizationMember.findOne({
      organizationId: req.organizationId,
      $or: [{ userId: memberId }, { _id: memberId }],
      'removalRequest.requestId': requestId,
      'removalRequest.status': 'pending',
    }).populate('userId', 'name email');

    if (!membership) {
      return errorResponse(res, {
        message: 'Pending removal request not found or already processed',
        statusCode: 404,
      });
    }

    // Requester cannot approve their own request
    if (String(membership.removalRequest.requestedBy) === String(req.user._id)) {
      return errorResponse(res, {
        message: 'You cannot approve your own removal request',
        statusCode: 403,
      });
    }

    // Manager can only approve removal of standard members
    if (req.orgMember.role === ORG_ROLES.MANAGER && membership.role !== ORG_ROLES.MEMBER) {
      return errorResponse(res, {
        message: 'Managers can only approve removal of standard members',
        statusCode: 403,
      });
    }

    const targetUserId = String(membership.userId?._id || membership.userId);
    const targetUserName = membership.userId?.name || '';
    const requesterId = membership.removalRequest.requestedBy;

    const deletedDoc = await OrganizationMember.findOneAndDelete({
      _id: membership._id,
      organizationId: req.organizationId,
      'removalRequest.requestId': requestId,
      'removalRequest.status': 'pending',
    });

    if (!deletedDoc) {
      return errorResponse(res, {
        message: 'Pending removal request not found or already processed',
        statusCode: 404,
      });
    }

    await ActivityLog.create({
      organizationId: req.organizationId,
      actorId: req.user._id,
      action: ACTIVITY_ACTIONS.MEMBER_REMOVED,
      details: {
        targetUserId,
        targetUserName,
        requestedBy: requesterId,
        approvedBy: req.user._id,
        method: 'app_approved',
        requestId,
      },
    });

    return successResponse(res, {
      message: 'Removal request approved and member removed from organization',
      data: {
        requestId,
        targetUserId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject a pending member removal request (Owner or authorized Manager)
 */
export const rejectMemberRemovalRequest = async (req, res, next) => {
  try {
    const { memberId, requestId } = req.params;

    const membership = await OrganizationMember.findOne({
      organizationId: req.organizationId,
      $or: [{ userId: memberId }, { _id: memberId }],
      'removalRequest.requestId': requestId,
      'removalRequest.status': 'pending',
    }).populate('userId', 'name email');

    if (!membership) {
      return errorResponse(res, {
        message: 'Pending removal request not found or already processed',
        statusCode: 404,
      });
    }

    const targetUserId = String(membership.userId?._id || membership.userId);

    const updatedDoc = await OrganizationMember.findOneAndUpdate(
      {
        _id: membership._id,
        organizationId: req.organizationId,
        'removalRequest.requestId': requestId,
        'removalRequest.status': 'pending',
      },
      {
        $set: {
          'removalRequest.status': 'rejected',
          'removalRequest.reviewedBy': req.user._id,
          'removalRequest.reviewedAt': new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!updatedDoc) {
      return errorResponse(res, {
        message: 'Pending removal request not found or already processed',
        statusCode: 404,
      });
    }

    await ActivityLog.create({
      organizationId: req.organizationId,
      actorId: req.user._id,
      action: ACTIVITY_ACTIONS.MEMBER_REMOVAL_REJECTED,
      details: {
        targetUserId,
        targetUserName: membership.userId?.name || '',
        requestId,
        rejectedBy: req.user._id,
      },
    });

    return successResponse(res, {
      message: 'Removal request rejected successfully',
      data: {
        requestId,
        targetUserId,
      },
    });
  } catch (error) {
    next(error);
  }
};
