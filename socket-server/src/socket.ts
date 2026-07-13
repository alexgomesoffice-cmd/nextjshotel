import { Server, Socket } from "socket.io";
import { SOCKET_EVENTS, buildBookingRoom, buildHotelAdminRoom, buildHotelAvailabilityRoom } from "./lib/socket-constants.js";
import { joinBookingSchema, joinHotelAdminSchema, joinHotelSchema } from "./lib/socket-schemas.js";
import type { AuthenticatedUser } from "./types/socket.js";

/**
 * Registers all Socket.IO event handlers for a connected, authenticated socket.
 *
 * Room auto-joining by role happens in server.ts (on connection).
 * This file handles explicit joins requested by the client (e.g. joining a
 * hotel page or a specific booking's channel) and any other client-driven events.
 */
const rateLimitWindowMs = 15_000;
const rateLimitMaxEvents = 20;

function isRateLimited(socket: Socket, eventName: string): boolean {
  const limiterKey = `${socket.id}:${eventName}`;
  const now = Date.now();
  const existing = (socket as Socket & { __rateLimit?: Record<string, { count: number; resetAt: number }> }).__rateLimit?.[limiterKey];

  if (!existing || existing.resetAt <= now) {
    const next = { count: 1, resetAt: now + rateLimitWindowMs };
    (socket as Socket & { __rateLimit?: Record<string, { count: number; resetAt: number }> }).__rateLimit = {
      ...(socket as Socket & { __rateLimit?: Record<string, { count: number; resetAt: number }> }).__rateLimit,
      [limiterKey]: next,
    };
    return false;
  }

  if (existing.count >= rateLimitMaxEvents) {
    return true;
  }

  existing.count += 1;
  return false;
}

export function initSocketHandlers(io: Server, socket: Socket) {
  const user = socket.data?.user as AuthenticatedUser | undefined;
  if (!user) {
    console.warn(`[socket] Missing authenticated user on socket ${socket.id}`);
    return;
  }
  const { userId, actor_id, actor_type, hotel_id } = user;

  console.log(
    `[socket] Connected: actor_id=${actor_id} type=${actor_type} hotel_id=${hotel_id ?? "—"} socket=${socket.id}`
  );

  // ── Client-initiated room joins ──────────────────────────────────────────

  /**
   * join:hotel — called by any browser tab showing a hotel detail page.
   * Adds this socket to `hotel:{hotelId}:availability` so it receives
   * `room:availability_changed`, `room:updated`, and `room_type:updated` events.
   */
  socket.on(SOCKET_EVENTS.joinHotel, (rawHotelId: unknown) => {
    if (isRateLimited(socket, SOCKET_EVENTS.joinHotel)) return;

    const parsed = joinHotelSchema.safeParse({ hotelId: rawHotelId });
    if (!parsed.success) return;

    const { hotelId } = parsed.data;
    socket.join(buildHotelAvailabilityRoom(hotelId));
    console.log(`[socket] ${userId} joined ${buildHotelAvailabilityRoom(hotelId)}`);
  });

  /**
   * join:hotel-admin — called by hotel admin dashboards and bookings pages.
   * Adds this socket to `hotel-admin:{hotelId}` so it receives
   * reservation and booking lifecycle events for that hotel.
   */
  socket.on(SOCKET_EVENTS.joinHotelAdmin, (rawHotelId: unknown) => {
    if (isRateLimited(socket, SOCKET_EVENTS.joinHotelAdmin)) return;

    const parsed = joinHotelAdminSchema.safeParse({ hotelId: rawHotelId });
    if (!parsed.success) return;

    const { hotelId } = parsed.data;

    const isPrivileged = ["SYSTEM_ADMIN", "HOTEL_ADMIN", "HOTEL_SUB_ADMIN"].includes(actor_type);
    if (!isPrivileged) {
      return;
    }

    if (hotelId === "all") {
      socket.join("hotel-admin:all");
      console.log(`[socket] ${userId} joined hotel-admin:all`);
      return;
    }

    if (hotel_id && hotelId !== hotel_id) {
      return;
    }

    socket.join(buildHotelAdminRoom(hotelId));
    socket.join("hotel-admin:all");
    console.log(`[socket] ${userId} joined ${buildHotelAdminRoom(hotelId)}`);
  });

  /**
   * join:booking — called by reservation/booking detail pages.
   * Adds this socket to `booking:{reference}` so it receives
   * `booking:status_changed` events for that specific booking.
   */
  socket.on(SOCKET_EVENTS.joinBooking, (rawReference: unknown) => {
    if (isRateLimited(socket, SOCKET_EVENTS.joinBooking)) return;

    const parsed = joinBookingSchema.safeParse({ reference: rawReference });
    if (!parsed.success) return;

    const { reference } = parsed.data;
    socket.join(buildBookingRoom(reference));
    console.log(`[socket] ${userId} joined ${buildBookingRoom(reference)}`);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[socket] Disconnected: actor_id=${actor_id} reason=${reason}`);
  });
}
