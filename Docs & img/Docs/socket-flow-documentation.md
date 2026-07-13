# Socket Flow Documentation

This document explains the full socket architecture used in this project, file by file, from the client side to the server side and the API routes that trigger real-time updates.

---

## 1. Overall architecture

The project uses a split architecture:

- Next.js app = source of truth for database changes and business logic
- Socket.IO server = authentication, room membership, and real-time delivery
- API routes in Next.js = trigger real-time events after database transactions

In short:

1. A browser page connects to the socket server.
2. The socket server authenticates the user using the HTTP-only auth cookie.
3. The client joins one or more rooms such as hotel availability, hotel admin room, or booking room.
4. When an API route changes data in the database, it calls the socket broadcast helper.
5. The socket server emits the event to the matching room.
6. All connected clients listening to that room receive the update and refresh the UI.

---

## 2. Client entry point: app layout

File: hotel-booking/src/app/layout.tsx

What it does:
- Wraps the entire app with the SocketProvider.
- This means every page in the app can access the shared socket connection.

Why it matters:
- The socket connection is initialized once at app startup.
- Pages and hooks can then use the shared socket from context without manually creating a new connection every time.

---

## 3. Socket client provider

File: hotel-booking/src/hooks/useSocket.tsx

What it does:
- Creates a single Socket.IO client instance.
- Connects to the socket server URL from NEXT_PUBLIC_SOCKET_URL or falls back to http://localhost:4001.
- Uses credentials so cookies are sent during the handshake.
- Exposes the socket through React context.

Flow:
1. On mount, the provider creates a socket client.
2. The client connects to the socket server.
3. The socket is stored in React state.
4. Components can call useSocket() to access that same socket instance.

Why it matters:
- This is the main bridge between browser pages and the socket server.
- The browser does not expose the JWT directly to JavaScript; it relies on the cookie-based handshake.

---

## 4. Page-level usage: user bookings page

File: hotel-booking/src/app/(user)/bookings/page.tsx

What it does:
- Uses the shared socket connection to listen for booking status changes.
- When the socket receives booking:status_changed, it refreshes the bookings list.

Flow:
1. The page loads.
2. It fetches the user’s bookings through the Next.js API.
3. It subscribes to booking:status_changed events.
4. When a booking status update is emitted, the page refreshes its data.

Why it matters:
- This is an example of a UI reacting to real-time backend events without needing a page refresh.

---

## 5. Page-level usage: sub-admin layout

File: hotel-booking/src/components/layout/hotel-sub-admin-layout.tsx

What it does:
- Listens for staff:blocked and staff:deleted events.
- If one of these events arrives, it logs the sub-admin out immediately.

Flow:
1. The layout mounts.
2. It registers listeners for staff:blocked and staff:deleted.
3. When the server emits one of those events, the layout triggers a logout flow.

Why it matters:
- This shows that sockets are used not only for UI refreshes but also for immediate security actions.

---

## 6. Hook: booking status subscription

File: hotel-booking/src/hooks/use-booking-status.ts

What it does:
- Joins a booking-specific room by emitting join:booking with the booking reference.
- Listens for booking:status_changed and updates the local status state.

Flow:
1. The hook mounts with a booking reference.
2. It emits join:booking to the server.
3. The server adds this socket to the booking room.
4. The hook listens for updates related to that booking.

Why it matters:
- This keeps the socket subscription focused on one booking rather than the entire app.

---

## 7. Hook: hotel admin feed

File: hotel-booking/src/hooks/use-hotel-admin-feed.ts

What it does:
- Joins admin rooms for hotel-specific or global admin views.
- Listens for booking and room events that should refresh the dashboard UI.

Flow:
1. If a hotel ID is present, it emits join:hotel-admin and join:hotel.
2. If no hotel ID is present, it joins the global admin room.
3. It listens for booking:created, booking:status_changed, room:updated, room_type:updated, and room:availability_changed.
4. On these events, it calls the provided refresh handlers.

Why it matters:
- Hotel admin pages use this hook to keep their dashboards current without reloading.

---

## 8. Hook: hotel availability subscription

File: hotel-booking/src/hooks/use-hotel-availability.ts

What it does:
- Joins the hotel availability room.
- Listens for room availability and room update events.
- Refreshes the UI when availability changes.

Flow:
1. The hook mounts for a given hotel.
2. It emits join:hotel with the hotel ID.
3. The server adds the socket to the hotel availability room.
4. The hook listens for room availability and structural room changes.

Why it matters:
- This is how room availability updates appear immediately when another reservation happens.

---

## 9. Server entry point

File: socket-server/src/server.ts

What it does:
- Starts a single Node HTTP server that handles both:
  - Socket.IO WebSocket upgrades
  - Internal HTTP POST broadcasts from Next.js API routes

It has two main responsibilities:

1. Broadcast endpoint
- Handles POST /broadcast
- Validates the body
- Emits the event to the requested room

2. Socket connection handling
- Applies authentication middleware before allowing the connection
- Joins the socket into default rooms based on the authenticated user role

Why it matters:
- This file sits in the middle of the real-time system and is the server’s central hub.

---

## 10. Socket auth middleware

File: socket-server/src/middleware/auth.ts

What it does:
- Reads the JWT from the HTTP-only cookie sent by the browser.
- Verifies the token.
- Stores the verified user inside socket.data.user.

Flow:
1. The client connects with cookies included.
2. The middleware reads the cookie header.
3. It looks for the relevant auth cookie names such as token_user, token_hotel_admin, token_system_admin, or token.
4. It verifies the token.
5. If valid, it attaches the user object to the socket.

Why it matters:
- This is the server-side authentication gate for every socket connection.
- The JWT is never exposed to browser JavaScript.

---

## 11. Socket constants

File: socket-server/src/lib/socket-constants.ts

What it does:
- Centralizes socket event names and room-builder helpers.

Events defined:
- join:hotel
- join:hotel-admin
- join:booking

Room builders:
- user:{id}
- hotel:{id}:availability
- hotel-admin:{id}
- booking:{reference}

Why it matters:
- This keeps room naming and event names consistent across the server and client hooks.

---

## 12. Socket validation schemas

File: socket-server/src/lib/socket-schemas.ts

What it does:
- Validates incoming socket payloads with Zod.

Schemas:
- joinHotelSchema for hotel join events
- joinHotelAdminSchema for admin room joins
- joinBookingSchema for booking room joins
- broadcastBodySchema for internal broadcast requests

Why it matters:
- Prevents malformed input from causing bad room joins or inconsistent behavior.

---

## 13. Socket handler registration

File: socket-server/src/socket.ts

What it does:
- Registers handlers for the client-driven join events.
- Validates the payload.
- Applies simple rate limiting.
- Checks authorization before privileged admin joins.
- Joins the socket to the correct room.

Main events handled:
- join:hotel
- join:hotel-admin
- join:booking

Flow for join:hotel:
1. The client emits join:hotel with a hotel ID.
2. The server validates it.
3. The server adds the socket to hotel:{hotelId}:availability.

Flow for join:hotel-admin:
1. The client emits join:hotel-admin with either a hotel ID or all.
2. The server validates it.
3. The server ensures the user is privileged.
4. The server joins the appropriate admin room.

Flow for join:booking:
1. The client emits join:booking with a booking reference.
2. The server validates it.
3. The server joins the booking room.

Why it matters:
- This is the server-side room subscription logic.
- It keeps the server in control of room membership rather than trusting the client fully.

---

## 14. API-side broadcast helper

File: hotel-booking/src/lib/socket-emit.ts

What it does:
- Sends a POST request to the socket server’s /broadcast endpoint.
- Uses a shared internal secret in the Authorization header.

Flow:
1. An API route completes a database transaction.
2. It calls emitToRoom(room, event, payload).
3. The helper POSTs to the socket server.
4. The socket server emits the event to the specified room.

Why it matters:
- This decouples the database transaction from the real-time notification process.
- The database remains the source of truth, while the socket server is only responsible for delivery.

---

## 15. API route: booking reservation

File: hotel-booking/src/app/api/bookings/reserve/route.ts

What it does:
- Creates a booking and related room tracker records.
- After the database transaction succeeds, it triggers socket events.

Emitted events:
- room:availability_changed to the hotel availability room
- booking:created to the hotel admin rooms

Why it matters:
- This is one of the main triggers for real-time UI updates when a reservation is made.

---

## 16. API route: booking confirmation

File: hotel-booking/src/app/api/bookings/[reference]/confirm/route.ts

What it does:
- Updates booking and room tracker status to BOOKED.
- Emits booking:status_changed to:
  - the hotel admin room
  - the end user’s personal room

Why it matters:
- This causes booking pages and dashboards to update instantly when a booking is confirmed.

---

## 17. API route: booking cancellation

File: hotel-booking/src/app/api/bookings/[reference]/cancel/route.ts

What it does:
- Cancels the booking and frees up room availability.
- Emits:
  - booking:status_changed to hotel admin and user rooms
  - room:availability_changed to the hotel availability room

Why it matters:
- This updates both booking views and room availability views at the same time.

---

## 18. API route: room creation

File: hotel-booking/src/app/api/hotel-admin/rooms/route.ts

What it does:
- Creates one or more rooms in the database.
- Emits room:updated to the hotel availability room.

Why it matters:
- Hotel availability pages refresh when rooms are created or changed.

---

## 19. API route: room type creation

File: hotel-booking/src/app/api/hotel-admin/room-types/route.ts

What it does:
- Creates a room type in the database.
- Emits room_type:updated to the hotel availability room.

Why it matters:
- Availability views update when room configuration changes.

---

## 20. API route: staff block and delete

Files:
- hotel-booking/src/app/api/hotel-admin/staff/[id]/block/route.ts
- hotel-booking/src/app/api/hotel-admin/staff/[id]/delete/route.ts

What they do:
- Update the staff record in the database.
- Emit staff:blocked or staff:deleted to the relevant user room.

Why it matters:
- The sub-admin layout listens for these events and logs the user out immediately.

---

## 21. End-to-end example

### Example: user views booking status
1. The user opens a booking page.
2. The page uses useBookingStatus.
3. The hook emits join:booking with the booking reference.
4. The socket server joins the socket into the booking room.
5. Later, an API route confirms or cancels the booking.
6. The API route calls emitToRoom for the booking room.
7. The socket server emits booking:status_changed to that room.
8. The booking page receives the event and updates the UI.

### Example: hotel admin sees room availability changes
1. The hotel admin opens the availability page.
2. The hook emits join:hotel for that hotel.
3. The server adds the socket to hotel:{hotelId}:availability.
4. A reservation API route changes availability in the database.
5. The API route emits room:availability_changed to that room.
6. The admin page listens and refreshes immediately.

---

## 22. Summary

The socket system works like this:

- The browser connects through the shared SocketProvider.
- The server authenticates the connection using the cookie-based JWT.
- The client joins rooms using join events.
- The API routes trigger broadcasts after database updates.
- The socket server delivers the event to the correct room.
- The listening UI components react immediately.

This design keeps the database as the source of truth and uses sockets only for real-time delivery.
