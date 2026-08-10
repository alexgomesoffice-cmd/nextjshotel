// src/lib/validations/room-type.ts
import { z } from 'zod'

// Room Type is a pure classification now — name + description only.
// Price/occupancy/beds/facilities all live on room_variants, not here.
export const createRoomTypeSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional().nullable(),
  amenity_ids: z.array(z.number().int().positive()).optional().default([]),
})

export const updateRoomTypeSchema = z.object({
  name: z.string().min(2).max(150).optional(),
  description: z.string().max(2000).optional().nullable(),
  amenity_ids: z.array(z.number().int().positive()).optional(),
  is_active: z.boolean().optional(),
})

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>