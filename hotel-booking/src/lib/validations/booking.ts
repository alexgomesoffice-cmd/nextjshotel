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

// confirmBookingSchema removed — was payment_method/transaction_id, dead
// since the no-payment-system decision; confirmed zero importers before removal.

// Booking cancel schema
export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
})

export type ReserveBookingInput = z.infer<typeof reserveBookingSchema>
// ConfirmBookingInput type removed alongside confirmBookingSchema — was self-referencing only, zero external importers.
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>