// ✅ Regel 7: Explizite Input-Validierung mit hilfreichen Fehlermeldungen

import { z } from 'zod'

export const CreateTodoInputSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters'),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional()
})

export const UpdateTodoInputSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title must not exceed 200 characters').optional(),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'], {
    errorMap: () => ({ message: 'Status must be one of: PENDING, IN_PROGRESS, COMPLETED, ARCHIVED' })
  }).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format').optional()
})

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data)

  if (!result.success) {
    const fields = result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }))

    return {
      __typename: 'ValidationError',
      message: 'Input validation failed',
      code: 'VALIDATION_ERROR',
      fields
    }
  }

  return result.data
}
