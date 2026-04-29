// src/lib/validations/room.ts
import { z } from 'zod'

// Physical room creation schema
export const createRoomSchema = z.object({
  room_type_id: z.number().int().positive('Room type is required'),
  room_number: z.string().min(1, 'Room number is required'),
  floor: z.number().int().min(0).default(0),
  price: z.number().positive('Price must be positive'),
  ac: z.boolean().default(true),
  smoking_allowed: z.boolean().default(false),
  pet_allowed: z.boolean().default(false),
  notes: z.string().optional(),
})

// Bulk room creation schema
export const bulkCreateRoomSchema = z.object({
  room_type_id: z.number().int().positive(),
  prefix: z.string().min(1),
  start_number: z.number().int().min(1).max(99),
  end_number: z.number().int().min(1).max(99),
  floor: z.number().int().min(0).default(0),
  price: z.number().positive(),
  ac: z.boolean().default(true),
  smoking_allowed: z.boolean().default(false),
  pet_allowed: z.boolean().default(false),
  notes: z.string().optional(),
})

// Room update schema
export const updateRoomSchema = createRoomSchema.partial()

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type BulkCreateRoomInput = z.infer<typeof bulkCreateRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>