# Real-Time Live Updates (Socket.IO) — Full Plan

This document maps every place in the current codebase that is showing stale
data today (full page reload / manual refresh required to see a change made
by someone else), proposes the exact real-time event for each, and gives a
complete, step-by-step guide to wiring up Socket.IO end-to-end.

Codebase reviewed: full `src/` tree (Next.js 16 App Router, Prisma 7 +
MariaDB, JWT cookie auth, Vercel deployment via `vercel.json`).

---

## Table of contents

1. [Why this matters — what's stale today](#1-why-this-matters--what-stale-today)
2. [Architecture decision: where can Socket.IO actually live](#2-architecture-decision-where-can-socketio-actually-live)
3. [Full list of live-update opportunities](#3-full-list-of-live-update-opportunities)
4. [Event catalog (quick reference table)](#4-event-catalog-quick-reference-table)
5. [Step-by-step setup guide](#5-step-by-step-setup-guide)
6. [Testing plan](#6-testing-plan)
7. [Production notes](#7-production-notes)

---

## 1. Why this matters — what's stale today

A few concrete signals already in the code show this gap:

- `src/app/(public)/hotels/[slug]/page.tsx` has
  `export const dynamic = 'force-dynamic'` with the comment
  *"Force fresh DB read on every request — availability data must be live"*.
  That only makes each **new** page load fresh — it does nothing for a
  browser tab that's already open when someone else books a room.
- `src/components/booking/reservation-timer.tsx` counts down purely on the
  client from a timestamp received once at page load. It has no way to know
  if the booking was actually confirmed, cancelled by an admin, or expired
  server-side by the cron job before the local timer hits zero.
- `src/app/api/cron/expire-bookings/route.ts` runs on a schedule (every 5
  minutes per `vercel.json`) and silently frees up rooms in the database —
  nobody looking at the hotel page at that moment finds out until they
  refresh.
- Hotel-admin and system-admin dashboards (`dashboard/hotel/*`,
  `dashboard/system/*`) are all fetch-on-mount / fetch-on-pagination. A new
  booking, a new check-in, or a newly submitted hotel doesn't appear for an
  admin unless they manually reload.
- `src/components/layout/notification-panel.tsx` exists as an empty,
  unused file — a notification center was clearly planned but never wired to
  anything.

All of the below are places where **pushing** a small event to already-open
clients replaces a "hope they refresh" experience with an accurate one.

---

## 2. Architecture decision: where can Socket.IO actually live

This is the most important decision to make before writing any code, because
it changes several of the steps later.

`vercel.json` shows this project deploys (or intends to deploy) to Vercel.
**Vercel's standard Next.js hosting runs your API routes as short-lived
serverless functions — they cannot hold a persistent WebSocket connection
open, and Socket.IO needs a long-running Node process to work properly.**
`next dev` / `next start` locally can hold sockets open fine (there's no
serverless boundary), but that won't reflect production on Vercel.

You have two workable paths. Pick one before starting Step 5.

### Path A — Separate standalone Socket.IO server (recommended, keeps Vercel for the Next.js app)

Run a small, dedicated Node.js process that does nothing but hold socket
connections and broadcast events. Deploy it separately on a platform that
supports long-running processes (Render, Railway, Fly.io, a small VPS,
or a Docker container — anything that isn't Vercel serverless). The Next.js
app keeps deploying to Vercel exactly as it does now.

The Next.js API routes (`reserve`, `cancel`, `confirm`, `status`, the cron
job, room/room-type CRUD, etc.) talk to this server by publishing to **Redis
pub/sub** (via `ioredis`), and the socket server subscribes to Redis and
rebroadcasts to the right connected clients. This also means the socket
server can be scaled to multiple instances later without losing messages.

```
Browser  <--WebSocket-->  Socket.IO server (Render/Railway/Fly)
                                   ^
                                   | subscribes
                                Redis (pub/sub)
                                   ^
                                   | publishes after DB commit
Next.js API routes (Vercel, serverless)
```

### Path B — Managed real-time service (least infra to run yourself)

Use a hosted pub/sub service designed for serverless backends — e.g. Ably,
Pusher Channels, or Supabase Realtime. Your Next.js API routes call the
service's REST API to publish an event after a DB commit (works fine from a
serverless function, no persistent connection needed on your side); the
client SDK (their JS library, not raw `socket.io-client`) subscribes directly
from the browser. You get channels/rooms, presence, and reconnection handling
for free, at the cost of a subscription and vendor lock-in.

This document is written primarily against **Path A** (actual Socket.IO,
since that's what you asked for), but every event/channel/payload defined in
Section 3 maps 1:1 onto Path B if you go that route instead — just swap
"Socket.IO room" for "channel" and "`io.to(room).emit(...)`" for the vendor's
publish call.

---

## 3. Full list of live-update opportunities

Each entry: what's stale today → the event to push → who receives it → which
files emit it → which files/components consume it.

### 3.1 Room/variant availability on the hotel detail page

- **Stale today:** `app/(public)/hotels/[slug]/page.tsx` computes
  `room_variants` (via `groupRoomVariants`) once per server render. A second
  visitor with the same tab open won't see a variant's `available_count` drop
  when someone else reserves it, or rise again when the cron expires it.
- **Event:** `room:availability_changed`
- **Payload:** `{ hotel_id, room_type_id, variant_id, available_count }`
- **Channel:** `hotel:{hotel_id}:availability`
- **Emit from:**
  - `app/api/bookings/reserve/route.ts` — after the transaction that creates
    `room_trackers` commits (a room just became unavailable for those dates).
  - `app/api/cron/expire-bookings/route.ts` — after deleting the expired
    booking's trackers (rooms just became available again).
  - `app/api/bookings/[reference]/cancel/route.ts` and the hotel-admin
    booking status route (check-in/check-out/no-show/cancel) — any status
    change that frees or (re-)locks a room.
- **Consume in:**
  - `src/components/booking/room-selector.tsx` /
    `src/components/room/rooms-section-client.tsx` /
    `src/components/room/room-type-card.tsx` — join the hotel's channel on
    mount, patch the matching variant's `available_count` in local state
    when an event arrives (this is exactly the `available` prop already
    rendered by `room-type-card.tsx`, including its new "Unavailable for
    selected dates" state — no new UI needed, just a live-updated number).
  - `src/app/api/public/hotels/[slug]/availability/route.ts` consumers (same
    data, same channel) if that endpoint is polled anywhere.

### 3.2 The reservation countdown timer

- **Stale today:** `reservation-timer.tsx` only knows the clock, not the real
  booking status. If the booking is expired by the cron job, cancelled, or
  (once the payment page is built) confirmed, the timer has no idea.
- **Event:** `booking:status_changed`
- **Payload:** `{ reference, status, reserved_until? }`
- **Channel:** `booking:{reference}`
- **Emit from:**
  - `app/api/cron/expire-bookings/route.ts` (status → `EXPIRED`)
  - `app/api/bookings/[reference]/confirm/route.ts` (status → `BOOKED`)
  - `app/api/bookings/[reference]/cancel/route.ts` (status → `CANCELLED`)
  - The hotel-admin booking status route (check-in/check-out/no-show)
- **Consume in:**
  - `reservation-timer.tsx` — join `booking:{reference}` on mount; on
    `EXPIRED`/`CANCELLED` show the existing expired state immediately
    (instead of waiting for the local countdown to hit zero); on `BOOKED`
    swap to a confirmed state.
  - `app/(user)/bookings/[reference]/page.tsx` — the whole status badge and
    page content can subscribe to the same channel so a user watching their
    own booking page sees a hotel-admin's check-in/cancel action the instant
    it happens.

### 3.3 New booking created → hotel admin dashboard

- **Stale today:** a hotel admin/sub-admin has to reload
  `dashboard/hotel/bookings` (or the main dashboard `page.tsx`) to see a
  booking a customer just made.
- **Event:** `booking:created`
- **Payload:** `{ reference, hotel_id, room_type_name, check_in, check_out, guest_name, status }`
- **Channel:** `hotel-admin:{hotel_id}`
- **Emit from:** `app/api/bookings/reserve/route.ts`, after commit.
- **Consume in:**
  - `app/dashboard/hotel/bookings/page.tsx` — prepend the new row live, plus a
    toast/badge.
  - `app/dashboard/hotel/page.tsx` (main overview) — bump "today's bookings"
    counters live.
  - `app/dashboard/sub/rooms/page.tsx` and any sub-admin booking view —
    sub-admins are scoped to the same `hotel_id`, so they join the same
    channel.

### 3.4 Booking status changes → hotel admin dashboard

- **Stale today:** same dashboard doesn't reflect a cancellation, no-show, or
  the cron-driven expiry without a manual refresh.
- **Event:** reuse `booking:status_changed` from 3.2 (same payload)
- **Channel:** `hotel-admin:{hotel_id}` (in addition to `booking:{reference}`
  — emit to both so the single-booking page *and* the admin list both update)
- **Emit from:** same four routes listed in 3.2.
- **Consume in:** `app/dashboard/hotel/bookings/page.tsx`,
  `app/dashboard/hotel/bookings/[reference]/page.tsx` (live status badge
  update while an admin is looking at it — useful if two staff accounts are
  open on the same booking).

### 3.5 Staff blocked/removed → force that session to react

- **Stale today:** `dashboard/hotel/staff/page.tsx` blocks/deletes a
  `hotel_sub_admin`, but if that sub-admin already has a dashboard tab open,
  their session stays usable until their JWT naturally expires or they hit an
  API call that gets rejected.
- **Event:** `staff:blocked` / `staff:deleted`
- **Payload:** `{ actor_id }`
- **Channel:** `user:{actor_id}` (a personal channel, see 3.7)
- **Emit from:** `app/api/hotel-admin/staff/[id]/block/route.ts` and
  `.../delete/route.ts` (once the Promise-params bug there is fixed).
- **Consume in:** a small global listener (e.g. in the dashboard layout,
  `hotel-sub-admin-layout.tsx`) that logs the user out and redirects to
  `/login` immediately on receiving this on their own personal channel.

### 3.6 Room / room-type changes visible to anyone currently browsing that hotel

- **Stale today:** if a hotel admin changes a room's price, marks a room
  `MAINTENANCE`, or deactivates a room type while a customer has that hotel
  page open, the customer can still try to select stale pricing/availability.
- **Event:** `room:updated` / `room_type:updated`
- **Payload:** `{ hotel_id, room_type_id, room_detail_id? }` (a change
  notice — client re-fetches or re-groups rather than trying to diff every
  field over the wire)
- **Channel:** `hotel:{hotel_id}:availability` (same channel as 3.1 — one
  subscription covers all "this hotel's bookable inventory changed" cases)
- **Emit from:** `app/api/hotel-admin/rooms/route.ts` (create, and the
  `[id]/route.ts` PATCH/status endpoints), `app/api/hotel-admin/room-types/route.ts`
  and `[id]/route.ts`.
- **Consume in:** same components as 3.1 — on this event, simplest correct
  behavior is "re-fetch this room type's variants" rather than trying to
  patch fields manually.

### 3.7 A general per-user notification channel (revives the unused component)

- **Stale today:** `src/components/layout/notification-panel.tsx` is a
  0-byte file, imported nowhere. There's no notification system at all.
- **Event:** generic `notification:new`
- **Payload:** `{ id, type, title, body, link, created_at }`
- **Channel:** `user:{actor_id}` — every logged-in socket connection joins
  its own personal room based on the verified JWT (`actor_id` from
  `JwtPayload`), regardless of role.
- **Emit from:** anywhere you want to notify one specific person —
  natural first uses:
  - Booking confirmed/cancelled/expired → notify the `END_USER` who owns it.
  - New booking → notify the `HOTEL_ADMIN` (and any `HOTEL_SUB_ADMIN`s) of
    that hotel.
  - A hotel's `approval_status` changes (published/rejected) → notify that
    hotel's `HOTEL_ADMIN`. See `app/api/system-admin/hotels/[id]/route.ts`.
- **Consume in:** rebuild `notification-panel.tsx` as a real client
  component: connect once (probably in `navbar.tsx`, since it's already
  present on every authenticated layout), join `user:{actor_id}`, keep a
  running list in state, show an unread badge.

### 3.8 System admin — platform-wide live feed

- **Stale today:** `dashboard/system/page.tsx` (overview) and
  `dashboard/system/hotels/page.tsx` are fetch-on-load only. A system admin
  doesn't see a newly registered hotel pending approval, or a platform-wide
  new booking, without refreshing.
- **Event:** `admin:hotel_submitted`, `admin:stats_changed`
- **Payload:** `{ hotel_id, hotel_name }` for the first;
  `{ total_hotels?, total_bookings_today?, total_users? }` (whichever counters
  changed) for the second.
- **Channel:** `system-admin:global` — every connected socket with
  `actor_type === 'SYSTEM_ADMIN'` joins this on connect.
- **Emit from:** `app/api/system-admin/hotels/route.ts` (hotel creation),
  `app/api/bookings/reserve/route.ts` (bump a platform counter),
  `app/api/auth/register/route.ts` (new end-user signups, if you want that
  visible).
- **Consume in:** `dashboard/system/page.tsx` overview cards,
  `dashboard/system/hotels/page.tsx` list (prepend newly submitted hotels
  live, useful since that page is the approval queue).

### 3.9 Login-attempt / account-lock awareness (optional, lower priority)

- **Stale today:** `token-blacklist.ts` and the login-attempt lockout logic
  in `auth-middleware.ts`/login route work correctly already; this isn't a
  bug, just an optional real-time nicety.
- **Event:** `session:revoked`
- **Payload:** `{ actor_id }`
- **Channel:** `user:{actor_id}`
- **Emit from:** the logout route, or anywhere a token gets blacklisted
  server-side.
- **Consume in:** same personal-channel listener as 3.5/3.7 — force a
  redirect to `/login` the instant a session is revoked elsewhere, instead of
  waiting for the next API call to fail with 401.

---

## 4. Event catalog (quick reference table)

| Event | Channel | Emitted from | Consumed by |
|---|---|---|---|
| `room:availability_changed` | `hotel:{hotel_id}:availability` | `bookings/reserve`, `cron/expire-bookings`, `bookings/[reference]/cancel`, hotel-admin booking status route | `room-selector.tsx`, `rooms-section-client.tsx`, `room-type-card.tsx` |
| `booking:status_changed` | `booking:{reference}` + `hotel-admin:{hotel_id}` | `cron/expire-bookings`, `bookings/[reference]/confirm`, `bookings/[reference]/cancel`, hotel-admin status route | `reservation-timer.tsx`, `(user)/bookings/[reference]/page.tsx`, `dashboard/hotel/bookings/*` |
| `booking:created` | `hotel-admin:{hotel_id}` | `bookings/reserve` | `dashboard/hotel/bookings/page.tsx`, `dashboard/hotel/page.tsx`, `dashboard/sub/*` |
| `staff:blocked` / `staff:deleted` | `user:{actor_id}` | `hotel-admin/staff/[id]/block`, `.../delete` | dashboard layout auth listener |
| `room:updated` / `room_type:updated` | `hotel:{hotel_id}:availability` | `hotel-admin/rooms/*`, `hotel-admin/room-types/*` | same as `room:availability_changed` |
| `notification:new` | `user:{actor_id}` | booking lifecycle routes, hotel approval route | rebuilt `notification-panel.tsx` |
| `admin:hotel_submitted` | `system-admin:global` | `system-admin/hotels` (create) | `dashboard/system/hotels/page.tsx` |
| `admin:stats_changed` | `system-admin:global` | `bookings/reserve`, `auth/register` | `dashboard/system/page.tsx` |
| `session:revoked` | `user:{actor_id}` | logout / token blacklist | dashboard layout auth listener |

---

## 5. Step-by-step setup guide

This assumes **Path A** from Section 2 (standalone Socket.IO server + Redis).

### Step 1 — Provision Redis

Any small Redis instance works (Upstash, Redis Cloud free tier, or a Redis
add-on on whichever platform hosts the socket server). You'll get one
`REDIS_URL` to use in both places below.

### Step 2 — Build the standalone socket server

New, separate deployable — doesn't live inside the Next.js app's `src/`
build.

```
socket-server/
  package.json
  server.ts
```

```ts
// socket-server/server.ts
import { createServer } from "http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { verifyToken } from "./jwt"; // copy of src/lib/jwt.ts's verifyToken

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: process.env.APP_ORIGIN, credentials: true },
});

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await pubClient.connect();
await subClient.connect();
io.adapter(createAdapter(pubClient, subClient));

// Auth on handshake — read the same JWT cookie the Next.js app issues
io.use(async (socket, next) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie ?? "";
    const token = parseCookie(cookieHeader, "token");
    const payload = await verifyToken(token);
    socket.data.user = payload; // { actor_id, actor_type, hotel_id? }
    next();
  } catch {
    next(new Error("unauthorized"));
  }
});

io.on("connection", (socket) => {
  const { actor_id, actor_type, hotel_id } = socket.data.user;

  // Everyone gets a personal channel
  socket.join(`user:${actor_id}`);

  if (actor_type === "SYSTEM_ADMIN") {
    socket.join("system-admin:global");
  }
  if (actor_type === "HOTEL_ADMIN" || actor_type === "HOTEL_SUB_ADMIN") {
    socket.join(`hotel-admin:${hotel_id}`);
  }

  // Public availability + booking-reference channels are joined explicitly
  // by the client after connecting, since they depend on which page the
  // user is viewing, not their role:
  socket.on("join:hotel", (hotelId: number) => {
    socket.join(`hotel:${hotelId}:availability`);
  });
  socket.on("join:booking", (reference: string) => {
    socket.join(`booking:${reference}`);
  });
});

// This process also subscribes to a Redis channel that the Next.js app
// publishes plain "please broadcast this" messages to, so the two codebases
// don't need to share Socket.IO internals — just a small JSON contract.
await subClient.subscribe("broadcast", (message) => {
  const { room, event, payload } = JSON.parse(message);
  io.to(room).emit(event, payload);
});

httpServer.listen(process.env.PORT || 4000);
```

Deploy this to Render/Railway/Fly (each supports "run this Node process,
keep it alive" out of the box). Set `REDIS_URL`, `APP_ORIGIN` (your Next.js
app's public URL, for CORS), and `JWT_SECRET` (must match the Next.js app's
`JWT_SECRET` exactly, since it verifies the same cookie).

### Step 3 — Add the emit helper inside the Next.js app

```ts
// src/lib/socket-emit.ts
import { createClient } from "redis";

let publisher: ReturnType<typeof createClient> | null = null;

async function getPublisher() {
  if (!publisher) {
    publisher = createClient({ url: process.env.REDIS_URL });
    await publisher.connect();
  }
  return publisher;
}

export async function emitToRoom(room: string, event: string, payload: unknown) {
  const client = await getPublisher();
  await client.publish("broadcast", JSON.stringify({ room, event, payload }));
}
```

This is the only new piece of shared infrastructure the API routes need to
import. It talks to Redis directly — it does not call the socket server over
HTTP, so there's no coupling beyond the Redis connection string.

### Step 4 — Wire emit calls into the API routes

Add one `emitToRoom(...)` call after each successful commit, per the table
in Section 4. Example, in `app/api/bookings/reserve/route.ts` right after
the transaction resolves successfully:

```ts
import { emitToRoom } from "@/lib/socket-emit";

// ...after tx.$transaction(...) succeeds, for each affected variant:
await emitToRoom(
  `hotel:${hotel_id}:availability`,
  "room:availability_changed",
  { hotel_id, room_type_id: selection.room_type_id, variant_id: selection.variant_id, available_count: newCount }
);

await emitToRoom(`hotel-admin:${hotel_id}`, "booking:created", {
  reference: booking.reference,
  hotel_id,
  status: booking.status,
});
```

Do the same in:
- `app/api/cron/expire-bookings/route.ts`
- `app/api/bookings/[reference]/confirm/route.ts`
- `app/api/bookings/[reference]/cancel/route.ts`
- the hotel-admin booking status route (check-in/check-out/no-show)
- `app/api/hotel-admin/staff/[id]/block/route.ts` and `.../delete/route.ts`
- `app/api/hotel-admin/rooms/route.ts` and `[id]/route.ts`
- `app/api/hotel-admin/room-types/route.ts` and `[id]/route.ts`
- `app/api/system-admin/hotels/route.ts`

### Step 5 — Client hook

```ts
// src/hooks/use-socket.ts
"use client";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function useSocket() {
  const ref = useRef<Socket | null>(null);
  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, { withCredentials: true });
    }
    ref.current = socket;
  }, []);
  return ref.current;
}
```

Then a thin, purpose-built hook per use case, e.g.:

```ts
// src/hooks/use-hotel-availability.ts
"use client";
import { useEffect, useState } from "react";
import { useSocket } from "./use-socket";

export function useHotelAvailability(hotelId: number, initialRoomTypes: RoomType[]) {
  const socket = useSocket();
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes);

  useEffect(() => {
    if (!socket) return;
    socket.emit("join:hotel", hotelId);

    const onAvailability = (e: { room_type_id: number; variant_id: number; available_count: number }) => {
      setRoomTypes(prev => prev.map(rt =>
        rt.id !== e.room_type_id ? rt : {
          ...rt,
          room_variants: rt.room_variants.map(v =>
            v.id === e.variant_id ? { ...v, available_count: e.available_count } : v
          ),
        }
      ));
    };

    socket.on("room:availability_changed", onAvailability);
    return () => { socket.off("room:availability_changed", onAvailability); };
  }, [socket, hotelId]);

  return roomTypes;
}
```

### Step 6 — Wire into components

- `room-selector.tsx`: replace the plain `roomTypes` prop usage with
  `useHotelAvailability(hotelId, roomTypes)`.
- `reservation-timer.tsx`: add a `useBookingStatus(reference)` hook following
  the same pattern, listening for `booking:status_changed`.
- `dashboard/hotel/bookings/page.tsx`: `useHotelAdminFeed(hotelId)` joining
  `hotel-admin:{hotel_id}` for `booking:created` / `booking:status_changed`.
- `notification-panel.tsx`: rebuild it to join `user:{actor_id}` and render
  `notification:new` events.
- `dashboard/system/page.tsx` and `dashboard/system/hotels/page.tsx`: join
  `system-admin:global`.

### Step 7 — Env vars to add

| Var | Where | Purpose |
|---|---|---|
| `REDIS_URL` | Next.js app + socket server | shared pub/sub |
| `JWT_SECRET` | socket server | must match the Next.js app's, to verify the `token` cookie |
| `APP_ORIGIN` | socket server | CORS allow-list |
| `NEXT_PUBLIC_SOCKET_URL` | Next.js app | public URL of the deployed socket server, used by the browser client |

---

## 6. Testing plan

1. Open the same hotel page in two browser windows (or one normal + one
   incognito, logged in as two different end users). Reserve the last unit
   of a 1-room variant in window A. Confirm window B's "available" count
   updates without a refresh.
2. Start a reservation, then manually trigger `cron/expire-bookings` (or wait
   for the schedule). Confirm `reservation-timer.tsx` immediately shows the
   expired state in the open tab, rather than waiting for the local countdown.
3. As a hotel admin, watch `dashboard/hotel/bookings` while a customer (a
   second browser) completes a reservation. Confirm the new booking appears
   live.
4. Block a hotel sub-admin's account from the hotel-admin staff page while
   that sub-admin has a dashboard tab open elsewhere. Confirm they're logged
   out immediately.
5. Kill the Redis connection or the socket server temporarily and confirm the
   Next.js app and its API routes keep working normally (real-time is an
   enhancement layer — a publish failure should be caught and logged, never
   thrown back to the user as a booking failure).

## 7. Production notes

- **Never trust a client-supplied `hotel_id`/`actor_id` for anything other
  than *which room to join*.** All authorization (can this socket even see
  this hotel's admin events) is decided once, at handshake time, from the
  verified JWT — exactly like `auth-middleware.ts` already does for HTTP.
- **Reconnection gaps:** if a client's socket drops for a few seconds, it can
  miss an event. On reconnect, have each hook re-fetch its underlying data
  once (e.g. call the existing `/api/public/hotels/[slug]/availability`
  endpoint) rather than assuming the socket delivered everything — sockets
  here are a freshness *optimization*, not the source of truth.
- **Broadcast storms:** a popular hotel page with many open tabs during a
  flash sale means every reservation broadcasts to every viewer. This is
  fine at the scale of a single hotel's room count, but if this grows,
  consider debouncing identical `room:availability_changed` events per
  `variant_id` within a short window before broadcasting.
- **Scaling the socket server:** the Redis adapter (already included above)
  is what lets you run more than one instance of the socket server behind a
  load balancer later without losing cross-instance broadcasts.
- **Local development:** run the socket server on `localhost:4000` and point
  `NEXT_PUBLIC_SOCKET_URL` at it; `next dev` and the socket server are two
  separate `npm run dev` processes side by side.
