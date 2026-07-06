// src/lib/validations/booking.ts
import { z } from 'zod'

// Booking reserve schema
export const reserveBookingSchema = z.object({
  hotel_id: z.number().int().positive(),
  check_in: z.string().refine((val) => !isNaN(Date.parse(val))),
  check_out: z.string().refine((val) => !isNaN(Date.parse(val))),
  guests: z.number().int().positive(),
  room_selections: z.array(z.object({
    room_type_id: z.number().int().positive(),
    variant_id: z.number().int().positive(),
    quantity: z.number().int().positive(),
  })).min(1, 'At least one room required'),
  special_request: z.string().optional(),
})

// Booking confirm schema (payment)
export const confirmBookingSchema = z.object({
  payment_method: z.string().min(1, 'Payment method required'),
  transaction_id: z.string().min(1, 'Transaction ID required'),
})

// Booking cancel schema
export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
})

export type ReserveBookingInput = z.infer<typeof reserveBookingSchema>
export type ConfirmBookingInput = z.infer<typeof confirmBookingSchema>
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>