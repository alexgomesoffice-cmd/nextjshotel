// src/lib/validations/room.ts
import { z } from 'zod'

// Physical room creation schema
export const createRoomSchema = z.object({
  room_type_id: z.number().int().positive('Room type is required'),
  prefix: z.string().optional(),
  room_number: z.string().min(1, 'Room number is required'),
  floor: z.number().int().min(0).default(0),
  price: z.number().positive('Price must be positive'),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE']).default('AVAILABLE'),
  room_size: z.string().max(50).optional().nullable(),
  ac: z.boolean().default(true),
  smoking_allowed: z.boolean().default(false),
  pet_allowed: z.boolean().default(false),
  notes: z.string().optional(),
})

// Bulk room creation schema
export const bulkCreateRoomSchema = z.object({
  room_type_id: z.number().int().positive(),
  prefix: z.string().optional(),
  start_number: z.number().int().min(1),
  end_number: z.number().int().min(1),
  floor: z.number().int().min(0).default(0),
  price: z.number().positive(),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE']).default('AVAILABLE'),
  room_size: z.string().max(50).optional().nullable(),
  ac: z.boolean().default(true),
  smoking_allowed: z.boolean().default(false),
  pet_allowed: z.boolean().default(false),
  notes: z.string().optional(),
}).refine((data) => data.end_number > data.start_number, {
  message: "End number must be greater than start number",
  path: ["end_number"],
})

// Room update schema
export const updateRoomSchema = createRoomSchema.partial()

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type BulkCreateRoomInput = z.infer<typeof bulkCreateRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>