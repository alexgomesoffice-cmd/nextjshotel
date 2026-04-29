# Project Context — Hotel Booking System
> This document is the single source of truth for VS Code Claude (or any AI assistant).
> Read this entire file before writing a single line of code.
> When in doubt about any decision, this file is the answer.

---

## What We Are Building

A production-ready hotel booking web application for Bangladesh. The app has two worlds:

**Public-facing:** Guests browse hotels, view room types, check availability, and see pricing — no login needed. When they attempt to reserve a room, they are redirected to login and then returned to exactly where they were with all parameters intact.

**Admin-facing:** System Admins manage the entire platform. Hotel Admins manage their single assigned hotel end-to-end. Hotel Sub Admins handle rooms and bookings only.

The core booking flow is: user selects rooms → 10-minute hold is created → user pays → booking confirmed. If payment does not happen within 10 minutes, the hold expires automatically and the rooms are freed.

---

## The Codebase Context

This project migrates the **frontend UI from an existing MERN project** (`glow-hotel-connect`) into a new **Next.js App Router project** with a completely new backend written from scratch. The MERN Express backend is NOT being ported — all API logic is rewritten as Next.js route handlers.

The MERN frontend had:
- React Router for routing (now replaced by Next.js file-based routing)
- Axios/fetch calling `http://localhost:3000/api/...` (now replaced by relative `/api/...`)
- JWT token in localStorage (now replaced by HttpOnly cookie set by server)
- shadcn/ui already installed and a dark glassmorphism theme in `src/index.css`
- All UI components, pages, and layouts that are being migrated with minimal JSX changes

---

## Tech Stack — Exact Packages

```bash
# Framework
Next.js 15, TypeScript, Tailwind CSS, App Router, src/ directory

# Database
prisma@^7  @prisma/client@^7  @prisma/adapter-mariadb  mariadb
# CRITICAL: Prisma 7 dropped built-in MySQL connector.
# The mariadb adapter is REQUIRED or PrismaClient will not work.

# Auth
jsonwebtoken  bcryptjs
@types/jsonwebtoken  @types/bcryptjs

# Validation & Utilities
zod  date-fns  uuid
@types/uuid

# UI
shadcn/ui (dark theme, CSS variables)  lucide-react

# Image Upload
multer  sharp
@types/multer
```

---

## Critical: Prisma 7 Setup

**Without this exact setup, PrismaClient will not instantiate.**

### `prisma/schema.prisma` — must have these at the top
```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### `src/lib/prisma.ts` — singleton with MariaDB adapter
```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import mariadb from 'mariadb'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined }

function createPrismaClient() {
  const pool = mariadb.createPool({
    uri: process.env.DATABASE_URL!,
    connectionLimit: 10,
    connectTimeout: 10_000,
  })
  const adapter = new PrismaMariaDb(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## Authentication — Custom JWT (NOT NextAuth)

**NextAuth is NOT used.** The schema has four separate actor tables — `system_admins`, `hotel_admins`, `hotel_sub_admins`, `end_users` — each with their own password, login-tracking, and token fields. NextAuth requires a single unified users table. The two are structurally incompatible.

### JWT Token payload shape
```typescript
type JwtPayload = {
  actor_id:   number
  actor_type: 'SYSTEM_ADMIN' | 'HOTEL_ADMIN' | 'HOTEL_SUB_ADMIN' | 'END_USER'
  hotel_id?:  number   // only for HOTEL_ADMIN and HOTEL_SUB_ADMIN
  iat:        number
  exp:        number
}
```

### Token storage
JWT is stored as an **HttpOnly cookie** named `token`. NOT in localStorage. Set-Cookie header on all login responses:
```
Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
```

### Token blacklist
On logout, the token hash is inserted into the `blacklisted_tokens` table. Every protected API route checks the blacklist via `requireAuth()`. Middleware does NOT check the blacklist (middleware must stay edge-compatible). Blacklist check only happens inside route handlers.

### Login endpoints — one per actor group
```
POST /api/auth/end-user/login
POST /api/auth/end-user/register
POST /api/auth/system-admin/login
POST /api/auth/hotel/login        ← checks hotel_admins first, then hotel_sub_admins
POST /api/auth/logout
GET  /api/auth/me
```

### Hotel login — single endpoint for both hotel admin and sub admin
The `/api/auth/hotel/login` endpoint checks the `hotel_admins` table first. If no match, checks `hotel_sub_admins`. This is why both roles share the same login page (`/hotel-login`). The returned token contains the correct `actor_type` (`HOTEL_ADMIN` or `HOTEL_SUB_ADMIN`) and `hotel_id`.

### Login guards (checked in every login handler)
```typescript
if (actor.deleted_at !== null)               → 401 'Account not found'
if (actor.is_blocked)                        → 403 'Account is blocked'
if (!actor.is_active)                        → 403 'Account is inactive'
if (actor.login_attempts >= 5
    && actor.locked_until > now)             → 423 'Account temporarily locked'
```

### `src/lib/auth-middleware.ts` — used in every API route handler
```typescript
export async function requireAuth(
  req: NextRequest,
  allowedRoles: JwtPayload['actor_type'][]
): Promise<{ payload: JwtPayload; error: null } | { payload: null; error: NextResponse }>
```

### Every protected API route pattern
```typescript
export async function GET(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error
  // payload.actor_id, payload.hotel_id, payload.actor_type now available
  // ALWAYS scope DB queries to payload.hotel_id — never trust hotel_id from request body
}
```

### `src/middleware.ts` — page route protection
```typescript
// Protects these route prefixes:
// /dashboard/system  → SYSTEM_ADMIN only
// /dashboard/hotel   → HOTEL_ADMIN only
// /dashboard/sub     → HOTEL_SUB_ADMIN only
// /profile           → END_USER only
// /bookings          → END_USER only
// Everything else is public (browsing works without login)
```

---

## The Five Actors

### 1. System Admin
- Lives in `system_admins` table
- Can create other system admins (self-reference via `created_by`)
- Creates hotels and hotel admin accounts simultaneously (one form)
- Can edit hotel-level info but NOT room types or physical rooms
- Can delete hotels (soft delete), suspend hotels, manage cities/hotel types/global amenities
- Sees everything on the platform: all hotels, all users, all bookings
- Login page: `/admin-login`
- Dashboard: `/dashboard/system`

### 2. Hotel Admin
- Lives in `hotel_admins` table
- One hotel admin per hotel (`@unique` on `hotel_id`)
- Created by system admin at the same time as the hotel
- Owns full management of their ONE hotel — details, images, amenities, room types, rooms, pricing, staff
- Can publish their hotel (DRAFT → PUBLISHED)
- Can create hotel sub admins for their hotel
- Can block/unblock or soft-delete sub admins
- Can view and manage bookings, manually set CHECKED_IN/CHECKED_OUT/NO_SHOW
- Cannot see any other hotel's data
- Login page: `/hotel-login`
- Dashboard: `/dashboard/hotel`

### 3. Hotel Sub Admin
- Lives in `hotel_sub_admins` table
- Created by hotel admin (`created_by` = hotel_admin.id, FK with `onDelete: SetNull`)
- Scoped to same hotel as their creator via `hotel_id`
- Can: create physical rooms (by selecting a room type), manage bookings, manually set booking status
- Cannot: create/edit room types, manage amenities/bed types, set pricing rules, manage other staff
- Login page: `/hotel-login` (same as hotel admin)
- Dashboard: `/dashboard/sub`
- Soft delete only — `deleted_at` set, row never hard-deleted

### 4. End User
- Lives in `end_users` table
- Registers with name, email, password
- `password` is nullable to support Google OAuth later (deferred)
- Can reserve rooms (10-min hold), view their bookings, cancel their bookings
- Can be blocked by hotel admin (cannot book at that hotel) or platform-wide by system admin
- Login page: `/login`

### 5. Guest (unauthenticated)
- No DB row — just an unauthenticated browser session
- Can browse all PUBLISHED hotels and view room types
- Clicking "Reserve" redirects to login with `callbackUrl` parameter preserving all search params
- After login, automatically returned to the original page

---

## Actors Are Separate Tables — Not a Unified Users Table

This is the most important architectural decision. Each actor type has its own table:

```
system_admins          + system_admin_details    + system_admin_images
hotel_admins           + hotel_admin_details     + hotel_admin_images
hotel_sub_admins       + hotel_sub_admin_details + hotel_sub_admin_images
end_users              + end_user_details        + end_user_images
```

The `*_details` table holds optional profile fields (dob, gender, NID, passport, phone, address).
The `*_images` table holds profile pictures with `is_active` flag (only one active at a time).
This pattern means NID/passport, login tracking, and blocking fields are cleanly separated per actor type.

---

## Database Tables — Complete List

```
roles                    ← HOTEL_ADMIN (id=1), HOTEL_SUB_ADMIN (id=2)
system_admins            ← platform owners
system_admin_details
system_admin_images
end_users                ← public-facing registered users
end_user_details
end_user_images
cities                   ← managed by system admin; dropdown on hotel creation
hotel_types              ← managed by system admin; dropdown on hotel creation
hotels                   ← city_id FK (no free-text city strings)
hotel_details            ← description, star rating, check-in/out times, policies
hotel_images
hotel_admins             ← one per hotel (@unique hotel_id)
hotel_admin_details
hotel_admin_images
hotel_sub_admins         ← many per hotel; created_by → hotel_admins.id (SetNull)
hotel_sub_admin_details
hotel_sub_admin_images
amenities                ← is_default=true+hotel_id=null = global; hotel_id set = hotel custom
hotel_amenities          ← junction: hotel ↔ amenity
bed_types                ← same global/custom pattern as amenities
room_types               ← template: defines a category (e.g. "Deluxe King")
room_bed_types           ← junction: room_type ↔ bed_type with count
room_properties          ← junction: room_type ↔ amenity (context=ROOM only)
room_details             ← physical room units; has its own price field
room_images              ← either room_type_id OR room_detail_id set (not both)
pricing_rules            ← seasonal price overrides at room_type level
user_bookings            ← one booking = one hotel, one check-in/out window
room_bookings            ← one row per physical room in a booking (price snapshot)
room_trackers            ← availability lock; @@unique prevents double-booking
blacklisted_tokens       ← JWT invalidation on logout/block
```

---

## Key Schema Rules

### All primary keys are named `id`
Every table uses `id Int @id @default(autoincrement())`. Never `hotel_id`, `booking_id`, etc. as the PK name.

### `hotels.city_id` is a FK — no free-text city
```prisma
city_id  Int?
city     cities? @relation(fields: [city_id], references: [id])
```
City is always chosen from the `cities` dropdown. Never a plain string field.

### Soft delete pattern — used everywhere
No actor or hotel is ever hard-deleted. Set `deleted_at = now()`. All queries filter `WHERE deleted_at IS NULL`.

### `is_active` for profile images
Each actor's images table has `is_active Boolean`. Before inserting a new profile image, set all existing rows for that actor to `is_active = false`. Only one active image per actor at a time.

### Room type vs physical room — two separate concepts
- `room_types` = template (name, base_price for display, max_occupancy, cancellation policy, amenities)
- `room_details` = physical room instance (room_number, floor, actual price, ac, smoking, pet)
- Hotel admin creates room type FIRST. Then creates physical rooms by selecting a room type from a dropdown.
- Sub admin can create physical rooms (selects from existing room types). Cannot create room types.

### Pricing resolution order
```
1. Check pricing_rules WHERE room_type_id = X AND date range overlaps check_in..check_out
   → If found: use pricing_rules.price

2. Else: use room_details.price (this room's individual nightly rate)

3. room_types.base_price is NEVER used in booking calculations.
   It is only shown in the UI as "From BDT X,XXX/night" on listing pages.
```

### Amenity context — HOTEL or ROOM only (no BOTH)
```prisma
enum AmenityContext {
  HOTEL   // shown on hotel listing amenities section
  ROOM    // shown on room type detail / room properties
}
```
Every amenity belongs to exactly one context.

### NID or passport — one required
Enforced by Zod at API layer. DB columns are both nullable. Applies to all `*_details` tables.

### Booking has no `children` field
Only `guests` (number of adults) and `rooms_count` (number of rooms). No children tracking.

### Booking reference generated at reservation time
`booking_reference` is generated and stored the moment a 10-minute hold is created — not at payment.

### `CHECKED_IN`, `CHECKED_OUT`, `NO_SHOW` are manual
Hotel admin and sub admin set these manually. They are never set automatically by the system.

---

## Room Type → Physical Room Flow (Important)

```
Step 1: Hotel admin creates a Room Type (template)
  /dashboard/hotel/room-types/new
  Fields: name, description, base_price (display only), max_occupancy, room_size,
          bed types (multi-select with count), amenities (ROOM context, multi-select),
          cancellation policy fields, check_in/out override, images (shared for all rooms of this type)

Step 2: Hotel admin OR sub admin creates Physical Rooms
  /dashboard/hotel/rooms/new   OR   /dashboard/sub/rooms/new
  Fields: room_type_id (DROPDOWN — select from hotel's existing room types),
          room_number, floor, price (ACTUAL booking price), ac (bool), smoking_allowed (bool),
          pet_allowed (bool), notes (internal, not shown to guests)

  Bulk mode: room_type_id, prefix, start_number, end_number, floor, price, ac, smoking, pet
  → e.g. prefix "2", start 01, end 10 → creates rooms 201 through 210
```

---

## The 10-Minute Reservation Flow

```
1. Guest clicks "Reserve" on hotel detail page

2. Not logged in?
   → Redirect to /login?callbackUrl=/hotels/[slug]?checkIn=X&checkOut=Y&guests=Z&...
   → After login: auto-redirect back to original URL with all params intact

3. Logged in → POST /api/bookings/reserve
   Body: { hotel_id, check_in, check_out, guests, rooms: [{ room_type_id, room_detail_id }] }

4. Server in a prisma.$transaction:
   a. Verify each room: status=AVAILABLE, no active tracker for those dates
   b. Resolve price per room (pricing_rules → room_details.price)
   c. Generate booking_reference (HBD-YYYYMMDD-XXXX)
   d. INSERT user_bookings { status: RESERVED, reserved_until: now + 10min }
   e. INSERT room_bookings (price snapshot per room)
   f. INSERT room_trackers (@@unique guard prevents race-condition double-booking)
   g. UPDATE room_details SET status=UNAVAILABLE

5. Client redirected to /bookings/[reference]/pay
   → Shows booking summary + countdown timer (MM:SS)
   → Timer turns red under 2 minutes

6. Timer reaches 0 (client fires):
   PATCH /api/bookings/[reference]/expire
   → status = EXPIRED, trackers = EXPIRED, rooms = AVAILABLE

7. Server cron (POST /api/cron/expire-bookings, every 2 min, protected by CRON_SECRET):
   → Safety net: finds all RESERVED bookings WHERE reserved_until < NOW()
   → Bulk expire + free rooms

8. Payment (Phase 12 — deferred):
   POST /api/bookings/[reference]/confirm { payment_method, transaction_id }
   → status = BOOKED, trackers = BOOKED
```

---

## API Response Shape — Always This Format

```typescript
// All API routes return this shape:

// Success
{ success: true, data: { ... } }
{ success: true, data: { ... }, message: 'Created successfully' }

// Error
{ success: false, message: 'Descriptive error message' }
```

---

## Hotel Creation — System Admin Does Both At Once

```
System admin fills ONE form with 4 sections:
  1. Hotel Info: name, city_id (dropdown), hotel_type_id (dropdown), star_rating,
                 address, zip_code, email, emergency contacts, owner_name, lat/lng
  2. Hotel Details: description, short_description, check_in_time (default 14:00),
                    check_out_time (default 12:00), advance_deposit_percent,
                    cancellation_policy, cancellation_hours, refund_percent
  3. Hotel Admin Account: name, email, temp password
  4. Initial Images: optional upload at creation time

Server runs prisma.$transaction:
  INSERT hotels (status: DRAFT, slugified name)
  INSERT hotel_details
  bcrypt.hash(password) → INSERT hotel_admins
```

Hotel is saved as DRAFT. Hotel admin logs in and can publish when ready (DRAFT → PUBLISHED).

---

## Hero Search Filters

The search bar on the homepage and search page supports:
```
Text input:         hotel name OR city name (single input)
Date range picker:  check_in, check_out
Guest + rooms:      guests (adults), rooms (count)

Quick filter chips:
  AC room         → room_details.ac = true
  Non-AC          → room_details.ac = false
  No Smoking      → room_details.smoking_allowed = false
  Pet Friendly    → room_details.pet_allowed = true
  Room Type       → dropdown of room_types.name
  Bed Type        → dropdown of bed_types.name
```

All three boolean filters (`ac`, `smoking_allowed`, `pet_allowed`) are indexed columns on `room_details`.

---

## Image Upload

```
Tool: multer (receive) + sharp (resize/compress)
Storage: public/uploads/ (served as static files)
DB field: relative path stored e.g. /uploads/hotels/abc.webp

Upload folders:
  public/uploads/hotels/              → hotel_images
  public/uploads/rooms/types/         → room_images (room_type level, shared)
  public/uploads/rooms/units/         → room_images (individual room level)
  public/uploads/staff/sys-admin/     → system_admin_images
  public/uploads/staff/hotel-admin/   → hotel_admin_images
  public/uploads/staff/sub-admin/     → hotel_sub_admin_images
  public/uploads/users/               → end_user_images
  public/uploads/cities/              → cities.image_url

Room images have dual purpose:
  room_type_id set   → shared image shown for all rooms of that type
  room_detail_id set → image for one specific physical room
  (exactly one must be set — not both)

Profile image swap:
  Before INSERT of new profile image:
  UPDATE *_images SET is_active=false WHERE [actor]_id = X
  Then INSERT new row with is_active=true
```

---

## Sub Admin Block / Delete Rules

```
Block:  SET is_blocked=true + immediately blacklist their current JWT token
        Sub admin gets 401 on their very next API call (no waiting for token expiry)

Unblock: SET is_blocked=false
         Sub admin can log in again immediately

Soft delete: SET deleted_at=now()
             Row stays in DB — all booking/room history preserved
             Sub admin cannot log in (login guard rejects deleted_at IS NOT NULL)
             FK (created_by) still resolves — no orphan references

Hard delete: NEVER used. Not in the codebase.
```

---

## Hotel Admin Dashboard Sidebar

```
Overview
─────────────────
Manage Hotel
  └─ Hotel Details     → /dashboard/hotel/details
  └─ Hotel Images      → /dashboard/hotel/images
  └─ Hotel Amenities   → /dashboard/hotel/amenities   (custom amenities + bed types)
─────────────────
Room Types             → /dashboard/hotel/room-types   (template management)
Rooms                  → /dashboard/hotel/rooms        (physical rooms; room type selected from dropdown)
Availability           → /dashboard/hotel/availability
─────────────────
Bookings
  └─ All Reservations  → /dashboard/hotel/bookings
  └─ Guests            → /dashboard/hotel/guests
─────────────────
Staff                  → /dashboard/hotel/staff        (sub admin management)
Pricing                → /dashboard/hotel/pricing      (seasonal pricing rules)
─────────────────
Revenue                → /dashboard/hotel/revenue      (Phase 13+)
Settings               → /dashboard/hotel/settings
```

## Hotel Sub Admin Dashboard Sidebar

```
Overview               → /dashboard/sub
─────────────────
Rooms                  → /dashboard/sub/rooms          (create rooms; select room type from dropdown)
─────────────────
Bookings
  └─ All Reservations  → /dashboard/sub/bookings
  └─ Guests            → /dashboard/sub/guests
```

---

## Full Directory Structure

```
hotel-booking/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── admin-login/page.tsx
│   │   │   └── hotel-login/page.tsx
│   │   ├── (public)/
│   │   │   ├── layout.tsx                     ← Navbar + Footer
│   │   │   ├── page.tsx                       ← Home
│   │   │   ├── hotels/
│   │   │   │   ├── page.tsx                   ← Explore/listing
│   │   │   │   └── [slug]/page.tsx            ← Hotel detail
│   │   │   ├── destinations/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [name]/page.tsx
│   │   │   ├── popular/page.tsx
│   │   │   └── search/page.tsx
│   │   ├── (user)/
│   │   │   ├── layout.tsx                     ← END_USER auth guard
│   │   │   ├── profile/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── bookings/
│   │   │       ├── page.tsx
│   │   │       └── [reference]/
│   │   │           ├── page.tsx
│   │   │           └── pay/page.tsx           ← 10-min timer
│   │   ├── dashboard/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                       ← role-based redirect
│   │   │   ├── system/                        ← SYSTEM_ADMIN only
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── hotels/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── edit/page.tsx
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       ├── edit/page.tsx
│   │   │   │   │       └── history/page.tsx
│   │   │   │   ├── bookings/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── admins/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── new/page.tsx
│   │   │   │   ├── cities/page.tsx
│   │   │   │   ├── hotel-types/page.tsx
│   │   │   │   ├── amenities/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── hotel/                         ← HOTEL_ADMIN only
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── details/page.tsx
│   │   │   │   ├── images/page.tsx
│   │   │   │   ├── amenities/page.tsx
│   │   │   │   ├── room-types/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── images/page.tsx
│   │   │   │   ├── rooms/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── new/page.tsx
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx
│   │   │   │   │       └── images/page.tsx
│   │   │   │   ├── availability/page.tsx
│   │   │   │   ├── bookings/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [reference]/page.tsx
│   │   │   │   ├── guests/
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── staff/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── new/page.tsx
│   │   │   │   ├── pricing/page.tsx
│   │   │   │   ├── revenue/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   └── sub/                           ← HOTEL_SUB_ADMIN only
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       ├── rooms/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── new/page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       └── bookings/
│   │   │           ├── page.tsx
│   │   │           └── [reference]/page.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── end-user/login/route.ts
│   │   │   │   ├── end-user/register/route.ts
│   │   │   │   ├── system-admin/login/route.ts
│   │   │   │   ├── hotel/login/route.ts
│   │   │   │   ├── me/route.ts
│   │   │   │   └── logout/route.ts
│   │   │   ├── system-admin/
│   │   │   │   ├── hotels/route.ts
│   │   │   │   ├── hotels/[id]/route.ts
│   │   │   │   ├── hotels/[id]/suspend/route.ts
│   │   │   │   ├── users/route.ts
│   │   │   │   ├── users/[id]/route.ts
│   │   │   │   ├── users/[id]/block/route.ts
│   │   │   │   ├── bookings/route.ts
│   │   │   │   ├── bookings/[id]/route.ts
│   │   │   │   ├── admins/route.ts
│   │   │   │   ├── admins/[id]/route.ts
│   │   │   │   ├── cities/route.ts
│   │   │   │   ├── hotel-types/route.ts
│   │   │   │   └── amenities/route.ts
│   │   │   ├── hotel-admin/
│   │   │   │   ├── overview/route.ts
│   │   │   │   ├── hotel/route.ts
│   │   │   │   ├── hotel/publish/route.ts
│   │   │   │   ├── hotel/images/route.ts
│   │   │   │   ├── hotel/images/[imageId]/route.ts
│   │   │   │   ├── amenities/route.ts
│   │   │   │   ├── amenities/[id]/route.ts
│   │   │   │   ├── bed-types/route.ts
│   │   │   │   ├── bed-types/[id]/route.ts
│   │   │   │   ├── room-types/route.ts
│   │   │   │   ├── room-types/[id]/route.ts
│   │   │   │   ├── room-types/[id]/images/route.ts
│   │   │   │   ├── room-types/[id]/images/[imageId]/route.ts
│   │   │   │   ├── rooms/route.ts
│   │   │   │   ├── rooms/[id]/route.ts
│   │   │   │   ├── rooms/[id]/images/route.ts
│   │   │   │   ├── rooms/[id]/images/[imageId]/route.ts
│   │   │   │   ├── availability/route.ts
│   │   │   │   ├── pricing/route.ts
│   │   │   │   ├── pricing/[id]/route.ts
│   │   │   │   ├── staff/route.ts
│   │   │   │   ├── staff/[id]/route.ts
│   │   │   │   ├── staff/[id]/block/route.ts
│   │   │   │   ├── staff/[id]/delete/route.ts
│   │   │   │   ├── bookings/route.ts
│   │   │   │   └── bookings/[reference]/
│   │   │   │       ├── route.ts
│   │   │   │       └── status/route.ts
│   │   │   ├── hotel-sub-admin/
│   │   │   │   ├── rooms/route.ts
│   │   │   │   ├── rooms/[id]/route.ts
│   │   │   │   ├── rooms/[id]/images/route.ts
│   │   │   │   ├── bookings/route.ts
│   │   │   │   └── bookings/[reference]/
│   │   │   │       ├── route.ts
│   │   │   │       └── status/route.ts
│   │   │   ├── public/
│   │   │   │   ├── hotels/route.ts
│   │   │   │   ├── hotels/[slug]/route.ts
│   │   │   │   ├── cities/route.ts
│   │   │   │   ├── hotel-types/route.ts
│   │   │   │   └── amenities/route.ts
│   │   │   ├── user/
│   │   │   │   ├── profile/route.ts
│   │   │   │   ├── images/route.ts
│   │   │   │   └── bookings/
│   │   │   │       ├── route.ts
│   │   │   │       └── [reference]/route.ts
│   │   │   ├── bookings/
│   │   │   │   ├── reserve/route.ts
│   │   │   │   └── [reference]/
│   │   │   │       ├── route.ts
│   │   │   │       ├── expire/route.ts
│   │   │   │       ├── cancel/route.ts
│   │   │   │       └── confirm/route.ts       ← Phase 12 stub
│   │   │   ├── upload/route.ts
│   │   │   └── cron/
│   │   │       └── expire-bookings/route.ts
│   │   └── not-found.tsx
│   ├── components/
│   │   ├── ui/                                ← shadcn (copy from MERN as-is)
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── admin-layout.tsx
│   │   │   ├── hotel-admin-layout.tsx
│   │   │   ├── hotel-sub-admin-layout.tsx
│   │   │   └── notification-panel.tsx
│   │   ├── home/
│   │   │   ├── hero-section.tsx
│   │   │   ├── destinations-section.tsx
│   │   │   ├── featured-hotels.tsx
│   │   │   └── newsletter-section.tsx
│   │   ├── hotel/
│   │   │   ├── hotel-card.tsx
│   │   │   ├── hotel-filter-sidebar.tsx
│   │   │   ├── hotel-images-gallery.tsx
│   │   │   └── photos-reviews-modal.tsx
│   │   ├── room/
│   │   │   ├── room-type-card.tsx
│   │   │   └── room-detail-modal.tsx
│   │   ├── booking/
│   │   │   ├── reservation-timer.tsx
│   │   │   ├── room-selector.tsx
│   │   │   └── booking-confirmation.tsx
│   │   └── search/
│   │       ├── hero-search.tsx
│   │       └── search-bar.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── jwt.ts
│   │   ├── auth-middleware.ts
│   │   ├── upload.ts
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── validations/
│   │       ├── auth.ts
│   │       ├── hotel.ts
│   │       ├── room-type.ts
│   │       ├── room.ts
│   │       └── booking.ts
│   ├── types/
│   │   └── index.ts
│   └── middleware.ts
└── public/
    └── uploads/
        ├── hotels/
        ├── rooms/types/
        ├── rooms/units/
        ├── staff/sys-admin/
        ├── staff/hotel-admin/
        ├── staff/sub-admin/
        ├── users/
        └── cities/
```

---

## Constants

```typescript
// src/lib/constants.ts
export const RESERVATION_TIMEOUT_MS   = 10 * 60 * 1000   // 10 minutes
export const RESERVATION_TIMEOUT_MIN  = 10
export const MAX_LOGIN_ATTEMPTS       = 5
export const LOCK_DURATION_MIN        = 30
export const MAX_HOTEL_IMAGES         = 20
export const MAX_ROOM_IMAGES          = 10
export const MAX_FILE_SIZE_MB         = 5
export const DEFAULT_CHECK_IN         = '14:00'
export const DEFAULT_CHECK_OUT        = '12:00'
export const CURRENCY                 = 'BDT'
export const BOOKING_REF_PREFIX       = 'HBD'
```

---

## Seed Data (Run After Every Migration)

```
roles:        { id:1, HOTEL_ADMIN }, { id:2, HOTEL_SUB_ADMIN }

hotel_types:  Hotel, Resort, Boutique, Hostel, Guest House, Serviced Apartment

cities (15):  Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barishal,
              Rangpur, Mymensingh, Comilla, Narayanganj, Gazipur,
              Cox's Bazar, Jessore, Tangail, Bogra

amenities (is_default=true, hotel_id=null):
  context=HOTEL: Parking, Swimming Pool, Gym, Laundry, Airport Shuttle,
                 Restaurant, Conference Room, Generator Backup, Elevator, CCTV
  context=ROOM:  WiFi, Air Conditioning, Hot Water, TV, Mini Bar,
                 Room Service, Wardrobe, Personal Safe, Hair Dryer, Breakfast Included

bed_types (is_default=true, hotel_id=null):
  Single, Twin, Double, Queen, King, Bunk, Sofa Bed

system_admins: one seeded from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars
```

---

## MERN → Next.js Migration Rules

When porting any component or page from the MERN project:

```
1. Add 'use client' at top of any file using useState, useEffect, event handlers
2. import Link from 'next/link'                   (was: react-router-dom)
3. import { useRouter } from 'next/navigation'     (was: useNavigate)
4. import { useParams } from 'next/navigation'     (was: useParams from react-router-dom)
5. import { usePathname } from 'next/navigation'   (was: useLocation)
6. import { useSearchParams } from 'next/navigation' (was: useSearchParams from react-router-dom)
7. router.push('/path')                           (was: navigate('/path'))
8. Replace <Outlet /> with {children}             (layout.tsx pattern)
9. All fetch calls use relative URLs: fetch('/api/...')
10. Add credentials: 'include' to every fetch call (sends HttpOnly cookie)
11. Remove ALL localStorage token/auth logic — server sets cookie
    KEEP: localStorage.setItem('user_name', ...) for navbar display hint only
12. Page-level data fetching: use async server components where possible
    (no useState/useEffect for initial data loads)
```

---

## What Is Deferred (Not Building Yet)

```
✗ Google OAuth / social login     → after full booking flow works
✗ Email verification on register  → after full booking flow works
✗ Password reset via email        → after full booking flow works
✗ Email notifications             → after booking flow
✗ SMS notifications               → after booking flow
✗ Payment gateway (bKash/SSL)     → Phase 12
✗ Reviews and ratings             → after completed stays exist
✗ Analytics/reports               → after booking data exists
✗ Map view on hotel detail        → button placeholder only
✗ Car Rental / Attractions pages  → not part of core booking system
```

---

## Role Permission Summary

| Action | Sys Admin | Hotel Admin | Sub Admin | End User | Guest |
|---|---|---|---|---|---|
| Create system admin | ✅ | ✗ | ✗ | ✗ | ✗ |
| Create hotel + hotel admin | ✅ | ✗ | ✗ | ✗ | ✗ |
| Edit hotel info | ✅ | ✅ own | ✗ | ✗ | ✗ |
| Upload hotel images | ✗ | ✅ own | ✗ | ✗ | ✗ |
| Delete hotel (soft) | ✅ | ✗ | ✗ | ✗ | ✗ |
| Publish hotel | ✗ | ✅ own | ✗ | ✗ | ✗ |
| Suspend hotel | ✅ | ✗ | ✗ | ✗ | ✗ |
| Manage cities / hotel types | ✅ | ✗ | ✗ | ✗ | ✗ |
| Manage global amenities | ✅ | ✗ | ✗ | ✗ | ✗ |
| Create custom amenities/bed types | ✗ | ✅ own | ✗ | ✗ | ✗ |
| Create / edit room types | ✗ | ✅ own | ✗ | ✗ | ✗ |
| Create / edit physical rooms | ✗ | ✅ own | ✅ own | ✗ | ✗ |
| Delete room type (soft) | ✗ | ✅ own | ✗ | ✗ | ✗ |
| Delete physical room (soft) | ✗ | ✅ own | ✅ own | ✗ | ✗ |
| Set seasonal pricing | ✗ | ✅ own | ✗ | ✗ | ✗ |
| Create sub admin | ✗ | ✅ own | ✗ | ✗ | ✗ |
| Block / delete sub admin | ✗ | ✅ own | ✗ | ✗ | ✗ |
| View hotel bookings | ✗ | ✅ own | ✅ own | ✗ | ✗ |
| Manual booking status change | ✗ | ✅ own | ✅ own | ✗ | ✗ |
| Cancel booking | ✅ any | ✅ own | ✅ own | ✅ own | ✗ |
| Browse hotels & rooms | ✅ | ✅ | ✅ | ✅ | ✅ |
| Reserve rooms | ✗ | ✗ | ✗ | ✅ | → login |

---

## Build Order (7 Days)

```
Day 1: Project init, Prisma + MariaDB, migration, seed, JWT lib, middleware, CSS theme
Day 2: Auth — all 5 API routes + 4 login/register pages
Day 3: Layouts — navbar, footer, 3 dashboard sidebars, shell pages
Day 4: System admin — hotel creation (one form), hotel list, user management
Day 5: Hotel admin — hotel details, images, amenities, bed types, room types
Day 6: Hotel admin + sub admin — physical rooms, staff management, bookings, pricing
Day 7: Public pages, user pages, reservation flow, 10-min timer, cron expire
```

---

## Things That Must Never Happen

```
✗ Never use NextAuth — incompatible with the multi-actor-table schema
✗ Never store JWT in localStorage — HttpOnly cookie only
✗ Never trust hotel_id from request body in hotel-admin or hotel-sub-admin routes
  → Always use payload.hotel_id from the verified JWT token
✗ Never hard-delete any actor, hotel, room, or booking — soft delete only (deleted_at)
✗ Never use room_types.base_price in booking calculations — display only
✗ Never allow sub admin to create/edit room types, manage amenities, manage staff, or set pricing
✗ Never let hotel admin see or query another hotel's data
✗ Never run the blacklist check in middleware — too slow; do it in route handlers only
✗ Never create a hotel without simultaneously creating the hotel admin account
✗ Never omit credentials: 'include' on client-side fetch calls (cookie won't be sent)
✗ Never allow AmenityContext.BOTH — each amenity is HOTEL or ROOM only
```
