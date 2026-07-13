import { z } from "zod";

export const joinHotelSchema = z.object({
  hotelId: z.number().int().positive(),
});

export const joinHotelAdminSchema = z.union([
  z.object({ hotelId: z.number().int().positive() }),
  z.object({ hotelId: z.literal("all") }),
]);

export const joinBookingSchema = z.object({
  reference: z.string().trim().min(1),
});

export const broadcastBodySchema = z.object({
  room: z.string().trim().min(1),
  event: z.string().trim().min(1),
  payload: z.unknown().optional(),
});
