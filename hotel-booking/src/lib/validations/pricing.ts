import { z } from 'zod'

const dateOnly = z.coerce.date()

export const createPricingRuleSchema = z.object({
  room_variant_id: z.number().int().positive(),
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional().nullable(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  discount_value: z.number().positive('Discount must be greater than zero'),
  priority: z.number().int().min(0).default(0),
  start_date: dateOnly,
  end_date: dateOnly,
}).superRefine((data, ctx) => {
  if (data.discount_type === 'PERCENTAGE' && data.discount_value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discount_value'], message: 'Percentage discount cannot exceed 100.' })
  }
  if (data.end_date < data.start_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'End date cannot be before start date.' })
  }
})

export const updatePricingRuleSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).optional().nullable(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']).optional(),
  discount_value: z.number().positive().optional(),
  priority: z.number().int().min(0).optional(),
  start_date: dateOnly.optional(),
  end_date: dateOnly.optional(),
}).superRefine((data, ctx) => {
  if (data.discount_type === 'PERCENTAGE' && data.discount_value !== undefined && data.discount_value > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discount_value'], message: 'Percentage discount cannot exceed 100.' })
  }
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'End date cannot be before start date.' })
  }
})

export const updatePricingRuleStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED']),
})

export type CreatePricingRuleInput = z.infer<typeof createPricingRuleSchema>
export type UpdatePricingRuleInput = z.infer<typeof updatePricingRuleSchema>