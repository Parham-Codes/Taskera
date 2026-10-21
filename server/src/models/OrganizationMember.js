import mongoose from 'mongoose';

export const ORG_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  MEMBER: 'member',
};

const organizationMemberSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role: {
      type: String,
      enum: {
        values: Object.values(ORG_ROLES),
        message: '{VALUE} is not a valid organization role',
      },
      default: ORG_ROLES.MEMBER,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate membership of a user in the same organization
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

// Optimize querying all organizations a user belongs to
organizationMemberSchema.index({ userId: 1, role: 1 });

const OrganizationMember = mongoose.models.OrganizationMember || mongoose.model('OrganizationMember', organizationMemberSchema);

export default OrganizationMember;
