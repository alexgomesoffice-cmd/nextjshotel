# Socket Server and Client Architecture

This document explains the Hotel Project socket architecture in depth. It covers both the separate `socket-server` process and the `hotel-booking` Next.js client application, including authentication, room joins, event emissions, and the key files involved.

---

## Overview

The app uses a separate Socket.IO server at `socket-server/` to broadcast real-time events for hotel availability, booking lifecycle changes, and admin dashboard updates.

The Next.js client at `hotel-booking/` connects to this socket server from the browser using a JWT token taken from the same authentication cookies created by the app.

This architecture has three main pieces:

1. Socket server connection and auth (`socket-server/src`)
2. Client socket provider and auth bridge (`hotel-booking/src/hooks/useSocket.tsx`, `hotel-booking/src/app/api/socket-auth/route.ts`)
3. Event emitters and listeners that keep the UI in sync (`hotel-booking/src/lib/socket-emit.ts`, hooks under `hotel-booking/src/hooks/`)

---

## Socket Server Architecture

### `socket-server/src/server.ts`

This is the socket server entrypoint.

Responsibilities:

- Creates an HTTP server and attaches Socket.IO to it.
- Exposes an internal `POST /broadcast` endpoint used by Next.js API routes to emit socket events.
- Verifies socket auth using `verifySocketAuth` middleware.
- Auto-joins sockets into role-based rooms on connection.
- Loads the client-driven join handlers from `initSocketHandlers`.

Details:

- `io.use(verifySocketAuth)` ensures every socket is authenticated with a valid JWT.
- When a socket connects and is authenticated:
  - It always joins `user:{actor_id}`.
  - Hotel admins join `hotel-admin:all` and `hotel-admin:{hotel_id}`.
- The `/broadcast` endpoint accepts an object with `room`, `event`, and `payload`, then emits that event into the given room.
- The broadcast endpoint is protected by `SOCKET_SECRET`.

### `socket-server/src/middleware/auth.ts`

This middleware authenticates Socket.IO connections.

Important behavior:

- It supports authentication via `socket.handshake.auth.token`.
- If the client does not provide a token in `auth`, it falls back to cookies from the socket request headers.
- It also supports an Authorization header with `Bearer <token>`.
- The token is validated with `verifyToken` from the shared JWT library.
- If validation succeeds, `socket.data.user` is populated with decoded payload.

Why this matters:

- The same JWT can be created by the Next.js app and reused by the socket connection.
- This enables seamless auth for user, hotel admin, and system admin participants.

### `socket-server/src/socket.ts`

This file defines client-driven socket join handlers.

Key events:

- `join:hotel` → joins `hotel:{hotelId}:availability`
- `join:hotel-admin` → joins `hotel-admin:{hotelId}` and `hotel-admin:all`
- `join:booking` → joins `booking:{reference}`

The room design:

- `hotel:{hotelId}:availability` is used for hotel availability and room updates.
- `hotel-admin:{hotelId}` is used for hotel admin dashboards and hotel-specific admin events.
- `hotel-admin:all` is used for admin-wide events or fallback if hotel id is missing.
- `booking:{reference}` is used for realtime updates on a specific booking.

The server logs every join and disconnect for debugging.

### `socket-server/src/config/env.ts`

Contains environment config keys.

Important values:

- `PORT` — socket server port, defaults to `4001`
- `ALLOWED_ORIGIN` — CORS origin that can connect to the socket server
- `SOCKET_SECRET` — shared secret used by the Next.js app to authenticate internal broadcast requests

---

## Client Architecture

### `hotel-booking/src/app/layout.tsx`

This root layout wraps the entire app with `SocketProvider`.

That means every page in the client can access the shared socket connection through React context.

### `hotel-booking/src/hooks/useSocket.tsx`

This is the core client socket provider and hook.

How it works:

- On mount, it fetches `/api/socket-auth` with `credentials: 'include'`.
- If auth succeeds, it receives the JWT token from the app cookies.
- It then connects to the Socket.IO server using `io(url, { auth: { token } })`.
- It supports websocket and polling transports, with automatic reconnection.
- The socket instance is stored in context and exposed via `useSocket()`.

Why this is important:

- Socket auth and front-end auth use the same JWT token.
- The socket is only created once for the entire app.
- The code retries connecting if the auth endpoint initially fails.

### `hotel-booking/src/app/api/socket-auth/route.ts`

This API route bridges browser auth cookies to the socket client.

Behavior:

- Reads cookies from the request.
- Looks for any of these tokens:
  - `token_user`
  - `token_hotel_admin`
  - `token_system_admin`
  - `token`
- Verifies the token with `verifyToken`.
- Returns the same token to the client if valid.

This allows the socket client to connect even though it runs from the browser and needs a token in `auth`.

### `hotel-booking/src/lib/socket-emit.ts`

This utility is used by Next.js server-side API routes to broadcast socket events.

How it works:

- Sends a `POST` request to `SOCKET_SERVER_URL/broadcast`.
- Includes `room`, `event`, and `payload`.
- Uses `Authorization: Bearer ${SOCKET_SECRET}`.
- Errors are caught and logged, but do not break the API route.

This is the main server-to-socket path for pushing real-time updates after database transactions.

---

## Client Socket Hooks and Event Usage

### `hotel-booking/src/hooks/use-hotel-availability.ts`

Used by hotel public pages to keep room availability fresh.

Behavior:

- Calls `socket.emit('join:hotel', hotelId)` when the hotel page mounts.
- Listens for:
  - `room:availability_changed`
  - `room:updated`
  - `room_type:updated`
- On those events, it calls the supplied `onRefreshNeeded()` callback.
- This keeps availability data in sync when rooms are reserved, cancelled, or modified.

### `hotel-booking/src/hooks/use-hotel-admin-feed.ts`

Used by hotel admin dashboards and booking management pages.

Behavior:

- Calls `socket.emit('join:hotel-admin', hotelId)` and `socket.emit('join:hotel', hotelId)` for hotel-specific admin pages.
- For non-hotel pages, it joins `hotel-admin:all`.
- Listens for:
  - `booking:created`
  - `booking:status_changed`
  - `room:updated`
  - `room_type:updated`
  - `room:availability_changed`
- Runs `onRefresh()` for dashboard refresh and `onStatusChange()` for booking status state.

This hook ensures hotel admin pages get live updates for both booking lifecycle changes and inventory/availability changes.

### `hotel-booking/src/hooks/use-booking-status.ts`

Used by booking detail pages to monitor a single booking reference.

Behavior:

- Calls `socket.emit('join:booking', reference)`.
- Listens for `booking:status_changed`.
- Updates local status state when the event contains the same booking reference.

This is useful for showing live booking confirmation status and for reflecting state changes made by staff or cron expiration.

---

## Event Flow and Room Design

The architecture uses socket rooms and event names to separate concerns.

### Rooms

- `user:{userId}`
  - Personal channel for user-specific events (e.g. booking status updates, session revocation).

- `hotel-admin:{hotelId}`
  - Hotel admin dashboard events for a specific hotel.

- `hotel-admin:all`
  - Admin-wide events or default admin room.

- `hotel:{hotelId}:availability`
  - Hotel availability and room updates for public hotel pages.

- `booking:{reference}`
  - Booking detail updates for a specific reservation.

### Common Event Names

- `booking:created`
  - Emitted when a new reservation is made.
  - Used by admin dashboards to refresh recent bookings.

- `booking:status_changed`
  - Emitted when a booking is confirmed, cancelled, expired, or otherwise updated.
  - Used by booking detail pages and admin status trackers.

- `room:availability_changed`
  - Emitted when room availability changes through reservation, cancellation, or expiry.
  - Used by hotel public pages and admin dashboards.

- `room:updated`
  - Emitted when a room record is changed by hotel admin actions.

- `room_type:updated`
  - Emitted when a room type is changed by hotel admin actions.

- `staff:blocked` / `staff:deleted`
  - Emitted when staff accounts are changed.

---

## Server-Side Emitters

Several server-side routes emit events after a DB transaction:

- Reservation creation (`/api/bookings/reserve`)
  - Emits `room:availability_changed` to `hotel:{hotel_id}:availability`
  - Emits `booking:created` to `hotel-admin:{hotel_id}` and `hotel-admin:all`

- Booking cancellation / confirmation / expiration
  - Emits `booking:status_changed` to hotel admin and user booking channels
  - Emits `room:availability_changed` to hotel availability room

- Hotel admin room/room type updates
  - Emits `room:updated` and `room_type:updated` to `hotel:{hotelId}:availability`

- Cron expiration (`/api/cron/expire-bookings`)
  - Emits both booking status change and availability change when reservations expire.

---

## Authentication Flow

1. Browser loads the app and the root layout mounts.
2. `SocketProvider` calls `/api/socket-auth`.
3. `/api/socket-auth/route.ts` reads the auth cookie and verifies the JWT.
4. If valid, it returns the token to the browser.
5. `SocketProvider` connects to the socket server with that token.
6. The socket server runs `verifySocketAuth` to validate the token again.
7. If valid, the socket is accepted and the user is auto-joined into their base rooms.

This flow keeps the socket session aligned with the app session while avoiding direct cookie access in the socket client.

---

## Notes and Best Practices

- `socket-server` is intentionally separate from Next.js so real-time events are broadcast independently.
- The internal broadcast endpoint is only trusted by server-side code and secured by `SOCKET_SECRET`.
- Client socket code never uses the server secret; it only uses the JWT.
- Socket event failures are treated as best-effort: the data remains consistent in the database even if the socket delivery fails.

### Recommended room subscriptions

- Public hotel availability pages should join `hotel:{hotelId}:availability`.
- Hotel admin dashboards should join both `hotel-admin:{hotelId}` and `hotel:{hotelId}:availability`.
- Booking detail pages should join `booking:{reference}`.

### Why both `hotel-admin` and `hotel` rooms?

- `hotel-admin` rooms carry booking lifecycle events for admin views.
- `hotel` availability rooms carry room inventory updates that apply to public hotel pages.
- Joining both ensures hotel admin dashboards react to both types of changes.

---

## File Summary

### `socket-server/src/server.ts`
- Launches Socket.IO.
- Auto-joins authenticated sockets into base rooms.
- Handles internal `/broadcast` event emission.

### `socket-server/src/middleware/auth.ts`
- Validates JWTs on socket connection.
- Supports cookie-based auth and Authorization header.
- Populates `socket.data.user` on success.

### `socket-server/src/socket.ts`
- Defines client-driven join events.
- Maps join requests to socket rooms.

### `hotel-booking/src/app/layout.tsx`
- Wraps the app with `SocketProvider`.
- Ensures all pages can access the shared socket.

### `hotel-booking/src/hooks/useSocket.tsx`
- Authenticates the client with `/api/socket-auth`.
- Connects to the socket server with a JWT.
- Exposes a shared socket object.

### `hotel-booking/src/app/api/socket-auth/route.ts`
- Reads the auth cookie on the server.
- Verifies the JWT.
- Returns the JWT to the browser socket client.

### `hotel-booking/src/lib/socket-emit.ts`
- Emits socket events from server-side API routes.
- Uses `SOCKET_SECRET` to authenticate internal socket-server broadcast requests.

### `hotel-booking/src/hooks/use-hotel-availability.ts`
- Joins public hotel availability pages to live rooms.
- Refreshes availability data on socket events.

### `hotel-booking/src/hooks/use-hotel-admin-feed.ts`
- Joins hotel admin pages to admin and availability rooms.
- Refreshes stats on booking and room events.

### `hotel-booking/src/hooks/use-booking-status.ts`
- Joins booking detail pages to booking-specific rooms.
- Tracks live booking status changes.

---

## Troubleshooting

- If the admin overview does not refresh live, ensure `useHotelAdminFeed` joins both `hotel-admin` and `hotel` rooms.
- If socket auth fails, confirm the browser receives a valid JWT from `/api/socket-auth`.
- If server emits are not delivered, confirm the socket server is running on `SOCKET_SERVER_URL` and that `SOCKET_SECRET` matches.

---

## Summary

This project uses a separate Socket.IO server plus an auth bridge from Next.js. The client obtains a JWT via `/api/socket-auth`, connects to the socket server, joins rooms, listens for real-time events, and refreshes UI state when booking or inventory changes occur. Server-side API routes use `emitToRoom()` to broadcast updates using a shared secret.
