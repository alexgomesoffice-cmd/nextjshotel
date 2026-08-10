// src/lib/validations/room.ts
import { z } from 'zod'

const bedTypeSchema = z.object({
  bed_type_id: z.number().int().positive(),
  count: z.number().int().positive().min(1),
})

// Every field here except room_number/floor/notes is variant-defining —
// changing any of them (on edit) triggers signature re-matching.
export const createRoomSchema = z.object({
  room_type_id: z.number().int().positive('Room type is required'),
  room_number: z.string().min(1, 'Room number is required').max(50),
  floor: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),

  // Variant-defining fields
  price: z.number().positive('Price must be positive'),
  room_size: z.string().max(50).optional().nullable(),
  max_occupancy: z.number().int().positive().optional().nullable(),
  facility_ids: z.array(z.number().int().positive()).optional().default([]),
  bed_types: z.array(bedTypeSchema).optional().default([]),
})

export const bulkCreateRoomSchema = z.object({
  room_type_id: z.number().int().positive(),
  room_numbers: z.string().min(1, 'Room numbers are required'), // e.g. "301-305" or "301,302,305"
  floor: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),

  price: z.number().positive(),
  room_size: z.string().max(50).optional().nullable(),
  max_occupancy: z.number().int().positive().optional().nullable(),
  facility_ids: z.array(z.number().int().positive()).optional().default([]),
  bed_types: z.array(bedTypeSchema).optional().default([]),
})

// Edit: room_number/floor/notes are physical-only (never trigger
// re-matching). price/room_size/max_occupancy/facility_ids/bed_types are
// variant-defining — if any of them are present in the payload, the API
// recalculates the signature and moves the room to the matching variant.
export const updateRoomSchema = z.object({
  room_number: z.string().min(1).max(50).optional(),
  floor: z.number().int().min(0).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),

  price: z.number().positive().optional(),
  room_size: z.string().max(50).optional().nullable(),
  max_occupancy: z.number().int().positive().optional().nullable(),
  facility_ids: z.array(z.number().int().positive()).optional(),
  bed_types: z.array(bedTypeSchema).optional(),
})

// Operational status — deliberately separate, immediate, never touches
// variant matching.
export const updateRoomStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'MAINTENANCE']),
})

export type CreateRoomInput = z.infer<typeof createRoomSchema>
export type BulkCreateRoomInput = z.infer<typeof bulkCreateRoomSchema>
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>