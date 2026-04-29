// src/lib/validations/hotel.ts
import { z } from 'zod'

// Hotel creation schema (system admin)
export const createHotelSchema = z.object({
  hotel: z.object({
    name: z.string().min(1, 'Hotel name is required'),
    city_id: z.number().int().positive('Valid city required'),
    hotel_type_id: z.number().int().positive('Valid hotel type required'),
    address: z.string().optional(),
    zip_code: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    emergency_contact1: z.string().optional(),
    emergency_contact2: z.string().optional(),
    owner_name: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
  details: z.object({
    description: z.string().optional(),
    short_description: z.string().max(500).optional(),
    check_in_time: z.string().default('14:00'),
    check_out_time: z.string().default('12:00'),
    advance_deposit_percent: z.number().int().min(0).max(100).default(0),
    cancellation_policy: z.enum(['FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM']).default('FLEXIBLE'),
    cancellation_hours: z.number().int().positive().optional(),
    refund_percent: z.number().int().min(0).max(100).optional(),
  }),
  admin: z.object({
    name: z.string().min(2, 'Admin name is required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),
})

// Hotel update schema
export const updateHotelSchema = z.object({
  name: z.string().min(1).optional(),
  city_id: z.number().int().positive().optional(),
  hotel_type_id: z.number().int().positive().optional(),
  address: z.string().optional(),
  zip_code: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  emergency_contact1: z.string().optional(),
  emergency_contact2: z.string().optional(),
  owner_name: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  short_description: z.string().max(500).optional(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
  advance_deposit_percent: z.number().int().min(0).max(100).optional(),
  cancellation_policy: z.enum(['FLEXIBLE', 'MODERATE', 'STRICT', 'CUSTOM']).optional(),
  cancellation_hours: z.number().int().positive().optional(),
  refund_percent: z.number().int().min(0).max(100).optional(),
})

export type CreateHotelInput = z.infer<typeof createHotelSchema>
export type UpdateHotelInput = z.infer<typeof updateHotelSchema>