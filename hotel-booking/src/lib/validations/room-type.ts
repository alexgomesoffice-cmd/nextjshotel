// src/lib/validations/room-type.ts
import { z } from 'zod'

// Room type creation schema
export const createRoomTypeSchema = z.object({
  name: z.string().min(1, 'Room type name is required'),
  description: z.string().optional(),
  base_price: z.number().positive('Base price must be positive'),
  max_occupancy: z.number().int().positive().min(1).default(1),
  room_size: z.number().positive().optional(),
  bed_types: z.array(z.object({
    bed_type_id: z.number().int().positive(),
    count: z.number().int().positive().min(1),
  })).optional(),
  amenities: z.array(z.number().int().positive()).optional(),
  cancellation_policy: z.enum(['FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM']).default('FLEXIBLE'),
  cancellation_hours: z.number().int().positive().optional(),
  refund_percent: z.number().int().min(0).max(100).optional(),
  check_in_override: z.string().optional(),
  check_out_override: z.string().optional(),
})

// Room type update schema
export const updateRoomTypeSchema = createRoomTypeSchema.partial()

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>