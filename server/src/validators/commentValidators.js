import { z } from 'zod';

export const addCommentSchema = z.object({
  body: z.object({
    content: z
      .string({ required_error: 'Comment content cannot be empty' })
      .trim()
      .min(1, 'Comment content cannot be empty')
      .max(2000, 'Comment content cannot exceed 2000 characters'),
  }),
});
