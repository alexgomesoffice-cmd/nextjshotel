import { Server, Socket } from "socket.io";

/**
 * Registers all Socket.IO event handlers for a connected, authenticated socket.
 *
 * Room auto-joining by role happens in server.ts (on connection).
 * This file handles explicit joins requested by the client (e.g. joining a
 * hotel page or a specific booking's channel) and any other client-driven events.
 */
export function initSocketHandlers(io: Server, socket: Socket) {
  const user = (socket as any).data?.user;
  if (!user) {
    console.warn(`[socket] Missing authenticated user on socket ${socket.id}`);
    return;
  }
  const { actor_id, actor_type, hotel_id } = user;

  console.log(
    `[socket] Connected: actor_id=${actor_id} type=${actor_type} hotel_id=${hotel_id ?? "—"} socket=${socket.id}`
  );

  // ── Client-initiated room joins ──────────────────────────────────────────

  /**
   * join:hotel — called by any browser tab showing a hotel detail page.
   * Adds this socket to `hotel:{hotelId}:availability` so it receives
   * `room:availability_changed`, `room:updated`, and `room_type:updated` events.
   */
  socket.on("join:hotel", (hotelId: number) => {
    if (typeof hotelId !== "number" || isNaN(hotelId)) return;
    socket.join(`hotel:${hotelId}:availability`);
    console.log(`[socket] ${actor_id} joined hotel:${hotelId}:availability`);
  });

  /**
   * join:hotel-admin — called by hotel admin dashboards and bookings pages.
   * Adds this socket to `hotel-admin:{hotelId}` so it receives
   * reservation and booking lifecycle events for that hotel.
   */
  socket.on("join:hotel-admin", (hotelId: number | "all") => {
    if (hotelId === "all") {
      socket.join("hotel-admin:all");
      console.log(`[socket] ${actor_id} joined hotel-admin:all`);
      return;
    }

    if (typeof hotelId !== "number" || isNaN(hotelId)) return;
    socket.join(`hotel-admin:${hotelId}`);
    socket.join("hotel-admin:all");
    console.log(`[socket] ${actor_id} joined hotel-admin:${hotelId}`);
  });

  /**
   * join:booking — called by reservation/booking detail pages.
   * Adds this socket to `booking:{reference}` so it receives
   * `booking:status_changed` events for that specific booking.
   */
  socket.on("join:booking", (reference: string) => {
    if (typeof reference !== "string" || !reference.trim()) return;
    socket.join(`booking:${reference}`);
    console.log(`[socket] ${actor_id} joined booking:${reference}`);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[socket] Disconnected: actor_id=${actor_id} reason=${reason}`);
  });
}
