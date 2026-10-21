import { z } from 'zod';
import { ORG_ROLES } from '../models/OrganizationMember.js';

export const createOrganizationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Organization name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    description: z.string().trim().max(500).optional(),
  }),
});

export const addMemberSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Member email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address format'),
    role: z
      .enum([ORG_ROLES.MANAGER, ORG_ROLES.MEMBER], {
        errorMap: () => ({ message: 'Role must be either manager or member' }),
      })
      .default(ORG_ROLES.MEMBER),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum([ORG_ROLES.MANAGER, ORG_ROLES.MEMBER], {
      errorMap: () => ({ message: 'Role must be either manager or member' }),
    }),
  }),
});
