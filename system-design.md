# Hotel Booking System — System Design
> Version 4. Final reference. Do not patch — update this document when decisions change.

---

## 1. Project Overview

A production-ready hotel booking platform for Bangladesh. Guests browse freely without login. Registered end users reserve rooms (10-minute hold), then confirm by paying. Hotel Admins manage their single assigned hotel end-to-end. System Admins own the entire platform.

**Current build scope:** Full reservation flow up to payment handoff.
**Deferred:** Payment gateway, email/SMS notifications, Google OAuth, reviews, analytics.

---

## 2. Locked Design Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Custom JWT auth, not NextAuth | Four separate actor tables are structurally incompatible with NextAuth's single-user model |
| 2 | Google OAuth deferred | Added after full booking flow works; `end_users.password` is nullable to accommodate it later |
| 3 | All PKs named `id` | Consistent, clean, standard across every table |
| 4 | `AmenityContext`: HOTEL or ROOM only | BOTH removed — each amenity belongs to exactly one context |
| 5 | `room_details.price` = real booking price | `room_types.base_price` = display floor price shown to guests on listing page only |
| 6 | Pricing rules override `room_details.price` | Resolution order: pricing_rule price → room_details.price → never base_price |
| 7 | `hotels.city_id` FK to `cities` table | Free-text city caused casing inconsistency; cities are a managed dropdown |
| 8 | `booking_reference` generated at RESERVATION time | Exists the moment a 10-min hold is created, not at payment |
| 9 | No `children` field | Booking tracks `guests` (adults) + `rooms` count only |
| 10 | `CHECKED_IN`, `CHECKED_OUT`, `NO_SHOW` set manually by hotel staff | Not automated |
| 11 | NID or passport required for staff/users | Enforced at API validation (Zod), both DB columns nullable |
| 12 | `ac`, `smoking_allowed`, `pet_allowed` on `room_details` | These three are hero-search filter booleans |
| 13 | Room type created first, rooms created by selecting a type | Room type = template. Physical room = instance. Not interleaved. |
| 14 | Hotel admin and sub admin share the same login page | Backend `/api/auth/hotel/login` checks both tables; returns role in token |
| 15 | `hotel_sub_admins.created_by` FK with `onDelete: SetNull` | Hotel admin soft-deleted = row stays in DB, FK resolves safely; SetNull fires only on hard delete (never happens) |
| 16 | JWT stored as HttpOnly cookie | More secure than localStorage; readable by middleware |
| 17 | Backend logic written from scratch in Next.js | No porting of MERN Express logic |

---

## 3. Tech Stack

```bash
# Project scaffolding
npx create-next-app@latest hotel-booking --typescript --tailwind --eslint --app --src-dir
cd hotel-booking

# Database — Prisma 7 REQUIRES the MariaDB adapter. Without it PrismaClient breaks.
npm install prisma@^7 @prisma/client@^7 @prisma/adapter-mariadb mariadb

# Auth
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs

# Validation & utilities
npm install zod date-fns uuid
npm install -D @types/uuid

# UI
npx shadcn@latest init
npm install lucide-react

# Image upload and processing
npm install multer sharp
npm install -D @types/multer
```

---

## 4. Prisma 7 + MariaDB Adapter — Critical Setup

### `prisma/schema.prisma` — top of file
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

### `src/lib/prisma.ts` — singleton
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

### `.env`
```env
DATABASE_URL="mysql://user:password@localhost:3306/hotel_booking"
JWT_SECRET="run: openssl rand -base64 64"
JWT_EXPIRES_IN="7d"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
UPLOAD_DIR="./public/uploads"
SEED_ADMIN_EMAIL="admin@system.com"
SEED_ADMIN_PASSWORD="changeme123"
SEED_ADMIN_NAME="Super Admin"
CRON_SECRET="run: openssl rand -base64 32"
```

---

## 5. Authentication — Custom JWT

### Token payload
```typescript
// src/types/index.ts
export type JwtPayload = {
  actor_id:   number
  actor_type: 'SYSTEM_ADMIN' | 'HOTEL_ADMIN' | 'HOTEL_SUB_ADMIN' | 'END_USER'
  hotel_id?:  number   // only for HOTEL_ADMIN and HOTEL_SUB_ADMIN
  iat:        number
  exp:        number
}
```

### `src/lib/jwt.ts`
```typescript
import jwt from 'jsonwebtoken'
import { createHash } from 'crypto'
import { prisma } from './prisma'
import type { JwtPayload } from '@/types'

const SECRET = process.env.JWT_SECRET!

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const found = await prisma.blacklisted_tokens.findUnique({
    where: { token_hash: hashToken(token) },
  })
  return !!found
}

export async function blacklistToken(token: string, payload: JwtPayload): Promise<void> {
  await prisma.blacklisted_tokens.create({
    data: {
      token_hash: hashToken(token),
      actor_id:   payload.actor_id,
      actor_type: payload.actor_type,
      expires_at: new Date(payload.exp * 1000),
    },
  })
}
```

### `src/lib/auth-middleware.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, isBlacklisted } from './jwt'
import type { JwtPayload } from '@/types'

type AuthResult =
  | { payload: JwtPayload; error: null }
  | { payload: null; error: NextResponse }

export async function requireAuth(
  req: NextRequest,
  allowedRoles: JwtPayload['actor_type'][]
): Promise<AuthResult> {
  const token = req.cookies.get('token')?.value

  if (!token) {
    return { payload: null, error: NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 }) }
  }

  try {
    const payload = verifyToken(token)

    if (await isBlacklisted(token)) {
      return { payload: null, error: NextResponse.json({ success: false, message: 'Token revoked' }, { status: 401 }) }
    }

    if (!allowedRoles.includes(payload.actor_type)) {
      return { payload: null, error: NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 }) }
    }

    return { payload, error: null }
  } catch {
    return { payload: null, error: NextResponse.json({ success: false, message: 'Invalid token' }, { status: 401 }) }
  }
}
```

### `src/middleware.ts` — route protection
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// Blacklist check is NOT done here — middleware must be fast/edge-compatible.
// Blacklist check happens inside each API route handler via requireAuth().

const ROLE_REQUIRED: Record<string, string[]> = {
  '/dashboard/system': ['SYSTEM_ADMIN'],
  '/dashboard/hotel':  ['HOTEL_ADMIN'],
  '/dashboard/sub':    ['HOTEL_SUB_ADMIN'],
  '/profile':          ['END_USER'],
  '/bookings':         ['END_USER'],
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const matched = Object.entries(ROLE_REQUIRED).find(([prefix]) =>
    pathname.startsWith(prefix)
  )
  if (!matched) return NextResponse.next()

  const [, allowedRoles] = matched
  const token = req.cookies.get('token')?.value

  if (!token) {
    const loginMap: Record<string, string> = {
      SYSTEM_ADMIN:    '/admin-login',
      HOTEL_ADMIN:     '/hotel-login',
      HOTEL_SUB_ADMIN: '/hotel-login',
      END_USER:        '/login',
    }
    const redirectTo = loginMap[allowedRoles[0]] ?? '/login'
    const callbackUrl = encodeURIComponent(req.url)
    return NextResponse.redirect(new URL(`${redirectTo}?callbackUrl=${callbackUrl}`, req.url))
  }

  try {
    const payload = verifyToken(token)
    if (!allowedRoles.includes(payload.actor_type)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/bookings/:path*'],
}
```

### Login endpoints
```
POST /api/auth/end-user/login
POST /api/auth/end-user/register
POST /api/auth/system-admin/login
POST /api/auth/hotel/login          ← checks hotel_admins first, then hotel_sub_admins
POST /api/auth/logout
GET  /api/auth/me                   ← returns current actor's name, email, role, hotel_id
```

All auth tokens set as: `Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`

---

## 6. Full Database Schema

```prisma
// ═══════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════

enum ActorType {
  SYSTEM_ADMIN
  HOTEL_ADMIN
  HOTEL_SUB_ADMIN
  END_USER
}

enum AmenityContext {
  HOTEL   // shown on hotel listing / hotel detail page amenity section
  ROOM    // shown on room type detail / room properties
}

enum ApprovalStatus {
  DRAFT        // created by system admin; not public
  PUBLISHED    // hotel admin published; visible on site
  SUSPENDED    // system admin suspended; hidden from public
}

enum BookingStatus {
  RESERVED     // 10-min hold; awaiting payment
  BOOKED       // payment confirmed
  EXPIRED      // 10-min window passed without payment
  CANCELLED    // cancelled by user or hotel staff
  CHECKED_IN   // set manually by hotel staff on guest arrival
  CHECKED_OUT  // set manually by hotel staff on departure
  NO_SHOW      // set manually by hotel staff
}

enum TrackerStatus {
  RESERVED
  BOOKED
  EXPIRED
  CANCELLED
  CHECKED_IN
  CHECKED_OUT
}

enum RoomStatus {
  AVAILABLE
  UNAVAILABLE
  MAINTENANCE
}

enum CancellationPolicy {
  FLEXIBLE   // full refund up to N hours before check-in
  MODERATE   // partial refund — refund_percent applies
  STRICT     // no refund
  CUSTOM     // cancellation_hours + refund_percent both required
}

// ═══════════════════════════════════════════════════════
// ROLES
// Seeded: id=1 HOTEL_ADMIN, id=2 HOTEL_SUB_ADMIN
// Only used by hotel_admins and hotel_sub_admins tables.
// ═══════════════════════════════════════════════════════

model roles {
  id               Int                @id @default(autoincrement())
  role_name        String             @unique @db.VarChar(50)
  created_at       DateTime           @default(now())
  deleted_at       DateTime?
  hotel_admins     hotel_admins[]
  hotel_sub_admins hotel_sub_admins[]

  @@map("roles")
}

// ═══════════════════════════════════════════════════════
// SYSTEM ADMINS
// A system admin can create other system admins (self-reference).
// ═══════════════════════════════════════════════════════

model system_admins {
  id                     Int                   @id @default(autoincrement())
  name                   String                @db.VarChar(150)
  email                  String                @unique @db.VarChar(255)
  password               String                @db.VarChar(255)
  is_active              Boolean               @default(true)
  is_blocked             Boolean               @default(false)
  created_by             Int?
  last_login_at          DateTime?
  login_attempts         Int                   @default(0)
  locked_until           DateTime?
  password_reset_token   String?               @db.VarChar(255)
  password_reset_expires DateTime?
  created_at             DateTime              @default(now())
  updated_at             DateTime              @updatedAt
  deleted_at             DateTime?

  creator              system_admins?        @relation("AdminCreatedBy", fields: [created_by], references: [id])
  created_admins       system_admins[]       @relation("AdminCreatedBy")
  detail               system_admin_details?
  images               system_admin_images[]
  hotels_created       hotels[]              @relation("HotelCreatedBy")
  hotel_admins_created hotel_admins[]        @relation("HotelAdminCreatedBy")

  @@index([email])
  @@index([created_by])
  @@map("system_admins")
}

model system_admin_details {
  id              Int           @id @default(autoincrement())
  system_admin_id Int           @unique
  dob             DateTime?     @db.Date
  gender          String?       @db.VarChar(20)
  address         String?       @db.Text
  nid_no          String?       @db.VarChar(50)
  passport        String?       @db.VarChar(50)
  phone           String?       @db.VarChar(32)
  updated_at      DateTime      @updatedAt
  system_admin    system_admins @relation(fields: [system_admin_id], references: [id], onDelete: Cascade)

  @@map("system_admin_details")
}

model system_admin_images {
  id              Int           @id @default(autoincrement())
  system_admin_id Int
  image_url       String        @db.VarChar(500)
  is_active       Boolean       @default(true)
  created_at      DateTime      @default(now())
  system_admin    system_admins @relation(fields: [system_admin_id], references: [id], onDelete: Cascade)

  @@index([system_admin_id])
  @@map("system_admin_images")
}

// ═══════════════════════════════════════════════════════
// END USERS
// password nullable to support Google OAuth later.
// ═══════════════════════════════════════════════════════

model end_users {
  id                     Int                @id @default(autoincrement())
  email                  String             @unique @db.VarChar(255)
  password               String?            @db.VarChar(255)
  name                   String             @db.VarChar(150)
  email_verified         Boolean            @default(false)
  email_verified_at      DateTime?
  is_active              Boolean            @default(true)
  is_blocked             Boolean            @default(false)
  last_login_at          DateTime?
  login_attempts         Int                @default(0)
  locked_until           DateTime?
  password_reset_token   String?            @db.VarChar(255)
  password_reset_expires DateTime?
  created_at             DateTime           @default(now())
  updated_at             DateTime           @updatedAt
  deleted_at             DateTime?

  detail   end_user_details?
  images   end_user_images[]
  bookings user_bookings[]

  @@index([email])
  @@map("end_users")
}

model end_user_details {
  id                Int       @id @default(autoincrement())
  end_user_id       Int       @unique
  dob               DateTime? @db.Date
  gender            String?   @db.VarChar(20)
  address           String?   @db.Text
  country           String?   @default("Bangladesh") @db.VarChar(100)
  nid_no            String?   @db.VarChar(50)
  passport          String?   @db.VarChar(50)
  phone             String?   @db.VarChar(32)
  emergency_contact String?   @db.VarChar(100)
  updated_at        DateTime  @updatedAt
  end_user          end_users @relation(fields: [end_user_id], references: [id], onDelete: Cascade)

  @@map("end_user_details")
}

model end_user_images {
  id          Int       @id @default(autoincrement())
  end_user_id Int
  image_url   String    @db.VarChar(500)
  is_active   Boolean   @default(true)
  created_at  DateTime  @default(now())
  end_user    end_users @relation(fields: [end_user_id], references: [id], onDelete: Cascade)

  @@index([end_user_id])
  @@map("end_user_images")
}

// ═══════════════════════════════════════════════════════
// CITIES
// Pre-seeded with major BD cities. Managed by system admin.
// Hotels reference city_id FK — no free-text city strings.
// image_url used for browse-by-city tiles on the homepage.
// ═══════════════════════════════════════════════════════

model cities {
  id         Int      @id @default(autoincrement())
  name       String   @unique @db.VarChar(100)
  image_url  String?  @db.VarChar(500)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  updated_at DateTime @updatedAt
  hotels     hotels[]

  @@map("cities")
}

// ═══════════════════════════════════════════════════════
// HOTEL TYPES
// Seeded defaults: Hotel, Resort, Boutique, Hostel, Guest House, Serviced Apartment
// Managed by system admin only.
// ═══════════════════════════════════════════════════════

model hotel_types {
  id         Int      @id @default(autoincrement())
  name       String   @unique @db.VarChar(100)
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())
  hotels     hotels[]

  @@map("hotel_types")
}

// ═══════════════════════════════════════════════════════
// HOTELS
// Created by system admin alongside the hotel admin account (single form).
// System admin edits hotel-level info (NOT rooms or room types).
// Hotel admin edits hotel-level info AND owns all room/room type management.
// city_id is a FK — no free-text city. Always chosen from cities dropdown.
// ═══════════════════════════════════════════════════════

model hotels {
  id                 Int            @id @default(autoincrement())
  name               String         @db.VarChar(255)
  slug               String         @unique @db.VarChar(255)
  email              String?        @db.VarChar(150)
  address            String?        @db.Text
  city_id            Int?
  hotel_type_id      Int?
  emergency_contact1 String?        @db.VarChar(100)
  emergency_contact2 String?        @db.VarChar(100)
  owner_name         String?        @db.VarChar(150)
  zip_code           String?        @db.VarChar(20)
  latitude           Float?
  longitude          Float?
  created_by         Int
  approval_status    ApprovalStatus @default(DRAFT)
  published_at       DateTime?
  created_at         DateTime       @default(now())
  updated_at         DateTime       @updatedAt
  deleted_at         DateTime?

  city             cities?            @relation(fields: [city_id], references: [id])
  hotel_type       hotel_types?       @relation(fields: [hotel_type_id], references: [id])
  creator          system_admins      @relation("HotelCreatedBy", fields: [created_by], references: [id])
  hotel_admin      hotel_admins?
  detail           hotel_details?
  images           hotel_images[]
  hotel_amenities  hotel_amenities[]
  hotel_sub_admins hotel_sub_admins[]
  room_types       room_types[]
  bookings         user_bookings[]
  custom_amenities amenities[]        @relation("HotelCustomAmenities")
  custom_bed_types bed_types[]        @relation("HotelCustomBedTypes")

  @@index([approval_status])
  @@index([city_id])
  @@index([hotel_type_id])
  @@index([created_by])
  @@map("hotels")
}

model hotel_details {
  id                      Int                @id @default(autoincrement())
  hotel_id                Int                @unique
  description             String?            @db.Text
  short_description       String?            @db.VarChar(500)
  reception_no1           String?            @db.VarChar(32)
  reception_no2           String?            @db.VarChar(32)
  star_rating             Decimal?           @db.Decimal(2, 1)
  guest_rating            Decimal            @default(0.00) @db.Decimal(3, 2)
  website                 String?            @db.VarChar(255)
  check_in_time           String             @default("14:00") @db.VarChar(5)
  check_out_time          String             @default("12:00") @db.VarChar(5)
  advance_deposit_percent Int                @default(0)
  cancellation_policy     CancellationPolicy @default(FLEXIBLE)
  cancellation_hours      Int?
  refund_percent          Int?
  updated_at              DateTime           @updatedAt
  hotel                   hotels             @relation(fields: [hotel_id], references: [id], onDelete: Cascade)

  @@map("hotel_details")
}

model hotel_images {
  id         Int      @id @default(autoincrement())
  hotel_id   Int
  image_url  String   @db.MediumText
  is_cover   Boolean  @default(false)
  sort_order Int      @default(0)
  created_at DateTime @default(now())
  hotel      hotels   @relation(fields: [hotel_id], references: [id], onDelete: Cascade)

  @@index([hotel_id])
  @@map("hotel_images")
}

// ═══════════════════════════════════════════════════════
// HOTEL ADMINS
// Created simultaneously with the hotel by system admin.
// One hotel <-> one hotel admin (@unique on hotel_id).
// ═══════════════════════════════════════════════════════

model hotel_admins {
  id                     Int                  @id @default(autoincrement())
  role_id                Int                  @default(1)
  hotel_id               Int                  @unique
  created_by             Int?
  name                   String               @db.VarChar(150)
  email                  String               @unique @db.VarChar(255)
  password               String               @db.VarChar(255)
  is_active              Boolean              @default(true)
  is_blocked             Boolean              @default(false)
  last_login_at          DateTime?
  login_attempts         Int                  @default(0)
  locked_until           DateTime?
  password_reset_token   String?              @db.VarChar(255)
  password_reset_expires DateTime?
  created_at             DateTime             @default(now())
  updated_at             DateTime             @updatedAt
  deleted_at             DateTime?

  role               roles                @relation(fields: [role_id], references: [id])
  hotel              hotels               @relation(fields: [hotel_id], references: [id], onDelete: Cascade)
  creator            system_admins?       @relation("HotelAdminCreatedBy", fields: [created_by], references: [id])
  detail             hotel_admin_details?
  images             hotel_admin_images[]
  created_sub_admins hotel_sub_admins[]   @relation("SubAdminCreatedBy")

  @@index([email])
  @@index([created_by])
  @@index([role_id])
  @@map("hotel_admins")
}

model hotel_admin_details {
  id                 Int          @id @default(autoincrement())
  hotel_admin_id     Int          @unique
  dob                DateTime?    @db.Date
  phone              String?      @db.VarChar(32)
  nid_no             String?      @db.VarChar(50)
  passport           String?      @db.VarChar(50)
  address            String?      @db.Text
  manager_name       String?      @db.VarChar(150)
  manager_phone      String?      @db.VarChar(32)
  emergency_contact1 String?      @db.VarChar(100)
  emergency_contact2 String?      @db.VarChar(100)
  updated_at         DateTime     @updatedAt
  hotel_admin        hotel_admins @relation(fields: [hotel_admin_id], references: [id], onDelete: Cascade)

  @@map("hotel_admin_details")
}

model hotel_admin_images {
  id             Int          @id @default(autoincrement())
  hotel_admin_id Int
  image_url      String       @db.VarChar(500)
  is_active      Boolean      @default(true)
  created_at     DateTime     @default(now())
  hotel_admin    hotel_admins @relation(fields: [hotel_admin_id], references: [id], onDelete: Cascade)

  @@index([hotel_admin_id])
  @@map("hotel_admin_images")
}

// ═══════════════════════════════════════════════════════
// HOTEL SUB ADMINS
// Created by hotel admin for their own hotel.
// Permissions: add rooms, handle bookings.
// Cannot: manage room types, manage amenities/bed types, manage staff, set pricing.
// created_by -> hotel_admins.id (FK with onDelete: SetNull)
// Soft delete via deleted_at — hard delete never used.
// ═══════════════════════════════════════════════════════

model hotel_sub_admins {
  id                     Int                      @id @default(autoincrement())
  role_id                Int                      @default(2)
  hotel_id               Int
  created_by             Int?
  name                   String                   @db.VarChar(150)
  email                  String                   @unique @db.VarChar(255)
  password               String                   @db.VarChar(255)
  is_active              Boolean                  @default(true)
  is_blocked             Boolean                  @default(false)
  last_login_at          DateTime?
  login_attempts         Int                      @default(0)
  locked_until           DateTime?
  password_reset_token   String?                  @db.VarChar(255)
  password_reset_expires DateTime?
  created_at             DateTime                 @default(now())
  updated_at             DateTime                 @updatedAt
  deleted_at             DateTime?

  role    roles                    @relation(fields: [role_id], references: [id])
  hotel   hotels                   @relation(fields: [hotel_id], references: [id], onDelete: Cascade)
  creator hotel_admins?            @relation("SubAdminCreatedBy", fields: [created_by], references: [id], onDelete: SetNull)
  detail  hotel_sub_admin_details?
  images  hotel_sub_admin_images[]

  @@index([email])
  @@index([hotel_id])
  @@index([created_by])
  @@index([role_id])
  @@index([is_blocked])
  @@index([deleted_at])
  @@map("hotel_sub_admins")
}

model hotel_sub_admin_details {
  id                 Int              @id @default(autoincrement())
  hotel_sub_admin_id Int              @unique
  phone              String?          @db.VarChar(32)
  nid_no             String?          @db.VarChar(50)
  passport           String?          @db.VarChar(50)
  address            String?          @db.Text
  updated_at         DateTime         @updatedAt
  hotel_sub_admin    hotel_sub_admins @relation(fields: [hotel_sub_admin_id], references: [id], onDelete: Cascade)

  @@map("hotel_sub_admin_details")
}

model hotel_sub_admin_images {
  id                 Int              @id @default(autoincrement())
  hotel_sub_admin_id Int
  image_url          String           @db.VarChar(500)
  is_active          Boolean          @default(true)
  created_at         DateTime         @default(now())
  hotel_sub_admin    hotel_sub_admins @relation(fields: [hotel_sub_admin_id], references: [id], onDelete: Cascade)

  @@index([hotel_sub_admin_id])
  @@map("hotel_sub_admin_images")
}

// ═══════════════════════════════════════════════════════
// AMENITIES
// is_default=true + hotel_id=null  -> global default (seeded)
// is_default=false + hotel_id=X   -> hotel-specific custom
// context: HOTEL = hotel-level features, ROOM = room-level features
// Hotel admin creates custom amenities via the Amenities page in their dashboard.
// ═══════════════════════════════════════════════════════

model amenities {
  id         Int            @id @default(autoincrement())
  name       String         @db.VarChar(150)
  icon       String?        @db.VarChar(100)
  context    AmenityContext
  is_default Boolean        @default(false)
  hotel_id   Int?
  is_active  Boolean        @default(true)
  created_at DateTime       @default(now())

  hotel           hotels?           @relation("HotelCustomAmenities", fields: [hotel_id], references: [id], onDelete: Cascade)
  hotel_amenities hotel_amenities[]
  room_properties room_properties[]

  @@unique([name, hotel_id])
  @@index([hotel_id])
  @@index([is_default])
  @@index([context])
  @@map("amenities")
}

model hotel_amenities {
  id         Int       @id @default(autoincrement())
  hotel_id   Int
  amenity_id Int
  created_at DateTime  @default(now())
  hotel      hotels    @relation(fields: [hotel_id], references: [id], onDelete: Cascade)
  amenity    amenities @relation(fields: [amenity_id], references: [id], onDelete: Cascade)

  @@unique([hotel_id, amenity_id])
  @@index([hotel_id])
  @@index([amenity_id])
  @@map("hotel_amenities")
}

// ═══════════════════════════════════════════════════════
// BED TYPES
// is_default=true + hotel_id=null  -> global default (seeded)
// is_default=false + hotel_id=X   -> hotel-specific custom
// Hotel admin creates custom bed types via the Amenities page in their dashboard.
// ═══════════════════════════════════════════════════════

model bed_types {
  id             Int              @id @default(autoincrement())
  name           String           @db.VarChar(100)
  is_default     Boolean          @default(false)
  hotel_id       Int?
  is_active      Boolean          @default(true)
  created_at     DateTime         @default(now())

  hotel          hotels?          @relation("HotelCustomBedTypes", fields: [hotel_id], references: [id], onDelete: Cascade)
  room_bed_types room_bed_types[]

  @@unique([name, hotel_id])
  @@index([hotel_id])
  @@map("bed_types")
}

// ═══════════════════════════════════════════════════════
// ROOM TYPES  (template layer)
// Created by hotel admin via the "Room Types" section in their dashboard.
// Defines a category of rooms: name, pricing floor, occupancy, policies, amenities.
// base_price = display price shown to guests on listing ("From BDT X,XXX/night").
// base_price is NEVER used in booking calculations.
// ═══════════════════════════════════════════════════════

model room_types {
  id                  Int                @id @default(autoincrement())
  hotel_id            Int
  name                String             @db.VarChar(150)
  description         String?            @db.Text
  base_price          Decimal            @db.Decimal(12, 2)
  room_size           String?            @db.VarChar(50)
  max_occupancy       Int                @default(2)
  cancellation_policy CancellationPolicy @default(FLEXIBLE)
  cancellation_hours  Int?
  refund_percent      Int?
  check_in_time       String?            @db.VarChar(5)
  check_out_time      String?            @db.VarChar(5)
  is_active           Boolean            @default(true)
  created_at          DateTime           @default(now())
  updated_at          DateTime           @updatedAt

  hotel           hotels            @relation(fields: [hotel_id], references: [id], onDelete: Cascade)
  room_details    room_details[]
  type_images     room_images[]     @relation("RoomTypeImages")
  room_properties room_properties[]
  room_bed_types  room_bed_types[]
  pricing_rules   pricing_rules[]
  room_bookings   room_bookings[]

  @@index([hotel_id])
  @@index([is_active])
  @@map("room_types")
}

model room_bed_types {
  id           Int        @id @default(autoincrement())
  room_type_id Int
  bed_type_id  Int
  count        Int        @default(1)
  room_type    room_types @relation(fields: [room_type_id], references: [id], onDelete: Cascade)
  bed_type     bed_types  @relation(fields: [bed_type_id], references: [id])

  @@unique([room_type_id, bed_type_id])
  @@index([room_type_id])
  @@map("room_bed_types")
}

model room_properties {
  id           Int        @id @default(autoincrement())
  room_type_id Int
  amenity_id   Int
  created_at   DateTime   @default(now())
  room_type    room_types @relation(fields: [room_type_id], references: [id], onDelete: Cascade)
  amenity      amenities  @relation(fields: [amenity_id], references: [id], onDelete: Cascade)

  @@unique([room_type_id, amenity_id])
  @@index([room_type_id])
  @@map("room_properties")
}

// ═══════════════════════════════════════════════════════
// ROOM DETAILS  (physical room instances)
// Created by hotel admin OR hotel sub admin.
// Room type must be selected from a dropdown of existing room types.
// price = actual nightly rate for THIS specific room (NOT base_price).
// ac, smoking_allowed, pet_allowed are hero-search filter booleans.
// ═══════════════════════════════════════════════════════

model room_details {
  id              Int        @id @default(autoincrement())
  room_type_id    Int
  room_number     String     @db.VarChar(50)
  floor           Int?
  price           Decimal    @db.Decimal(12, 2)
  room_size       String?    @db.VarChar(50)
  ac              Boolean    @default(false)
  smoking_allowed Boolean    @default(false)
  pet_allowed     Boolean    @default(false)
  status          RoomStatus @default(AVAILABLE)
  notes           String?    @db.Text
  created_at      DateTime   @default(now())
  updated_at      DateTime   @updatedAt
  deleted_at      DateTime?

  room_type     room_types      @relation(fields: [room_type_id], references: [id], onDelete: Cascade)
  room_images   room_images[]   @relation("RoomDetailImages")
  room_trackers room_trackers[]
  room_bookings room_bookings[]

  @@unique([room_type_id, room_number])
  @@index([room_type_id])
  @@index([status])
  @@index([ac])
  @@index([smoking_allowed])
  @@index([pet_allowed])
  @@map("room_details")
}

// ═══════════════════════════════════════════════════════
// ROOM IMAGES
// Exactly ONE of room_type_id or room_detail_id must be set:
//   room_type_id   → shared image for all rooms of that type
//   room_detail_id → image for one specific physical room
// ═══════════════════════════════════════════════════════

model room_images {
  id             Int           @id @default(autoincrement())
  image_url      String        @db.LongText
  is_cover       Boolean       @default(false)
  sort_order     Int           @default(0)
  room_type_id   Int?
  room_detail_id Int?
  created_at     DateTime      @default(now())

  room_type   room_types?   @relation("RoomTypeImages", fields: [room_type_id], references: [id], onDelete: Cascade)
  room_detail room_details? @relation("RoomDetailImages", fields: [room_detail_id], references: [id], onDelete: Cascade)

  @@index([room_type_id])
  @@index([room_detail_id])
  @@map("room_images")
}

// ═══════════════════════════════════════════════════════
// PRICING RULES  (seasonal / dynamic pricing)
// Overrides room_details.price for a given date range.
// Applied at room type level — covers all rooms of that type.
// ═══════════════════════════════════════════════════════

model pricing_rules {
  id           Int        @id @default(autoincrement())
  room_type_id Int
  name         String?    @db.VarChar(150)
  start_date   DateTime   @db.Date
  end_date     DateTime   @db.Date
  price        Decimal    @db.Decimal(12, 2)
  created_at   DateTime   @default(now())
  room_type    room_types @relation(fields: [room_type_id], references: [id], onDelete: Cascade)

  @@index([room_type_id])
  @@index([start_date, end_date])
  @@map("pricing_rules")
}

// ═══════════════════════════════════════════════════════
// USER BOOKINGS
// One booking = one hotel, one check-in/out window.
// Can hold multiple rooms (one room_bookings row per physical room).
// booking_reference generated at RESERVATION time.
// reserved_until = now + 10 min. Cleared after payment.
// No children — guests (adults) + rooms count only.
// ═══════════════════════════════════════════════════════

model user_bookings {
  id                Int           @id @default(autoincrement())
  booking_reference String        @unique @db.VarChar(64)
  end_user_id       Int
  hotel_id          Int
  check_in          DateTime      @db.Date
  check_out         DateTime      @db.Date
  guests            Int           @default(1)
  rooms_count       Int           @default(1)
  special_request   String?       @db.Text
  status            BookingStatus @default(RESERVED)
  reserved_until    DateTime?
  total_price       Decimal       @db.Decimal(12, 2)
  advance_amount    Decimal       @default(0) @db.Decimal(12, 2)
  payment_method    String?       @db.VarChar(50)
  transaction_id    String?       @db.VarChar(191)
  paid_at           DateTime?
  created_at        DateTime      @default(now())
  updated_at        DateTime      @updatedAt

  end_user      end_users       @relation(fields: [end_user_id], references: [id], onDelete: Cascade)
  hotel         hotels          @relation(fields: [hotel_id], references: [id])
  room_bookings room_bookings[]
  room_trackers room_trackers[]

  @@index([booking_reference])
  @@index([end_user_id, status])
  @@index([hotel_id, check_in, check_out])
  @@index([reserved_until])
  @@map("user_bookings")
}

model room_bookings {
  id              Int          @id @default(autoincrement())
  booking_id      Int
  room_type_id    Int
  room_detail_id  Int
  price_per_night Decimal      @db.Decimal(12, 2)
  nights          Int
  subtotal        Decimal      @db.Decimal(12, 2)
  created_at      DateTime     @default(now())

  booking     user_bookings @relation(fields: [booking_id], references: [id], onDelete: Cascade)
  room_type   room_types    @relation(fields: [room_type_id], references: [id])
  room_detail room_details  @relation(fields: [room_detail_id], references: [id])

  @@index([booking_id])
  @@index([room_type_id])
  @@index([room_detail_id])
  @@map("room_bookings")
}

// ═══════════════════════════════════════════════════════
// ROOM TRACKERS  (availability lock)
// One row per physical room per date range.
// @@unique([room_detail_id, check_in, check_out]) prevents double-booking at DB level.
// On EXPIRED/CANCELLED: status updated, row kept for history.
// ═══════════════════════════════════════════════════════

model room_trackers {
  id             Int           @id @default(autoincrement())
  booking_id     Int
  room_detail_id Int
  check_in       DateTime      @db.Date
  check_out      DateTime      @db.Date
  status         TrackerStatus @default(RESERVED)
  created_at     DateTime      @default(now())
  updated_at     DateTime      @updatedAt

  booking     user_bookings @relation(fields: [booking_id], references: [id], onDelete: Cascade)
  room_detail room_details  @relation(fields: [room_detail_id], references: [id])

  @@unique([room_detail_id, check_in, check_out])
  @@index([room_detail_id, check_in, check_out])
  @@index([booking_id])
  @@index([status])
  @@index([check_in])
  @@map("room_trackers")
}

// ═══════════════════════════════════════════════════════
// BLACKLISTED TOKENS
// JWT invalidation on logout or block.
// Cron purges rows where expires_at < NOW().
// ═══════════════════════════════════════════════════════

model blacklisted_tokens {
  id         Int       @id @default(autoincrement())
  token_hash String    @unique @db.VarChar(500)
  actor_id   Int
  actor_type ActorType
  expires_at DateTime
  created_at DateTime  @default(now())

  @@index([token_hash])
  @@index([expires_at])
  @@index([actor_id, actor_type])
  @@map("blacklisted_tokens")
}
```

---

## 7. Room Type → Physical Room Flow

```
Step 1 — Hotel admin creates a Room Type
  Dashboard: Hotel Admin → Room Types → New Room Type
  Fields:
    name             (e.g. "Deluxe King Suite")
    description
    base_price       (BDT — display floor price only, NOT booking price)
    max_occupancy
    room_size        (e.g. "350 sqft")
    bed types        (multi-select: King x1, Sofa Bed x1)
    amenities        (multi-select from context=ROOM amenities)
    cancellation_policy + cancellation_hours + refund_percent
    check_in_time / check_out_time  (null = inherit hotel-level defaults)
    images           (shared images shown for all rooms of this type)

Step 2 — Hotel admin OR sub admin creates Physical Rooms
  Dashboard: Hotel Admin → Rooms → New Room
  Fields:
    room_type_id     (DROPDOWN — select from this hotel's existing room types)
    room_number      (e.g. "201")
    floor
    price            (BDT — ACTUAL booking price for this specific room)
    ac               (toggle: Yes / No)
    smoking_allowed  (toggle)
    pet_allowed      (toggle)
    notes            (internal staff notes, not shown to guests)
    images           (optional — individual room images; falls back to type images)

  Bulk creation mode:
    room_type_id     (dropdown)
    floor
    prefix           (e.g. "2")
    start_number     (e.g. 01)
    end_number       (e.g. 10)  → creates rooms 201..210
    price            (same for all)
    ac / smoking / pet toggles (same for all in bulk)
```

---

## 8. Pricing Resolution Order

When a reservation is being created, price per room is resolved as:

```
1. Check pricing_rules WHERE room_type_id = X
   AND start_date <= check_in AND end_date >= check_out
   → If matched: use pricing_rules.price as price_per_night

2. Else: use room_details.price (this room's individual rate)

3. room_types.base_price is NEVER used in booking math — display only.
```

---

## 9. Role & Permission Matrix

| Action | Sys Admin | Hotel Admin | Sub Admin | End User | Guest |
|---|---|---|---|---|---|
| Create system admin | YES | NO | NO | NO | NO |
| Create hotel + hotel admin (one form) | YES | NO | NO | NO | NO |
| Edit hotel info | YES | YES (own) | NO | NO | NO |
| Upload hotel images | NO | YES (own) | NO | NO | NO |
| Delete hotel | YES | NO | NO | NO | NO |
| Publish hotel | NO | YES (own) | NO | NO | NO |
| Suspend hotel | YES | NO | NO | NO | NO |
| Manage cities / hotel types | YES | NO | NO | NO | NO |
| Manage global amenities / bed types | YES | NO | NO | NO | NO |
| Create custom amenities / bed types | NO | YES (own) | NO | NO | NO |
| **Create / edit room types** | NO | **YES (own)** | NO | NO | NO |
| **Create / edit physical rooms** | NO | **YES (own)** | **YES (own)** | NO | NO |
| Delete room type (soft) | NO | YES (own) | NO | NO | NO |
| Delete physical room (soft) | NO | YES (own) | YES (own) | NO | NO |
| Set seasonal pricing rules | NO | YES (own) | NO | NO | NO |
| Create hotel sub admin | NO | YES (own) | NO | NO | NO |
| View / block / delete sub admins | NO | YES (own) | NO | NO | NO |
| View hotel bookings | NO | YES (own) | YES (own) | NO | NO |
| Change booking status manually | NO | YES (own) | YES (own) | NO | NO |
| Cancel booking | YES (any) | YES (own) | YES (own) | YES (own) | NO |
| Browse hotels and rooms | YES | YES | YES | YES | YES |
| Reserve rooms | NO | NO | NO | YES | redirect login |

---

## 10. Hotel Admin Dashboard Sidebar

```
Overview
─────────────────
Manage Hotel
  └─ Hotel Details
  └─ Hotel Images
  └─ Hotel Amenities    ← custom amenities (context=HOTEL) + bed types
─────────────────
Room Types              ← create/list/edit room type templates
Rooms                   ← create/list physical rooms (select room type from dropdown)
Availability            ← calendar grid showing which rooms are occupied on which dates
─────────────────
Bookings
  └─ All Reservations
  └─ Guests
─────────────────
Staff                   ← sub admin management (create / block / delete)
Pricing                 ← seasonal pricing rules per room type
─────────────────
Revenue                 ← earnings overview (Phase 9)
Settings                ← hotel policies, check-in/out times, deposit, cancellation
```

## 11. Hotel Sub Admin Dashboard Sidebar

```
Overview
─────────────────
Rooms                   ← can create physical rooms (select room type); cannot manage room types
─────────────────
Bookings
  └─ All Reservations
  └─ Guests
```

---

## 12. Hotel Creation Flow (System Admin)

```
System admin fills ONE form with two sections:

  Section 1 — Hotel Info:
    name, city_id (dropdown from cities table), hotel_type_id (dropdown),
    star_rating, address, zip_code, email,
    emergency_contact1, emergency_contact2, owner_name,
    latitude (optional), longitude (optional)

  Section 2 — Hotel Details:
    description, short_description,
    check_in_time (default 14:00), check_out_time (default 12:00),
    advance_deposit_percent (default 0),
    cancellation_policy, cancellation_hours, refund_percent

  Section 3 — Hotel Admin Account:
    admin_name, admin_email, admin_password (temporary)

  Section 4 — Initial Images (optional at creation):
    upload hotel images via multer

Submit → POST /api/system-admin/hotels

Server:
  1. Zod validate all fields
  2. Check admin_email not already used in hotel_admins or system_admins
  3. prisma.$transaction([
       INSERT hotels (status: DRAFT),
       INSERT hotel_details (defaults applied),
       hash(admin_password) → INSERT hotel_admins (hotel_id = new hotel id)
     ])
  4. If images: multer → sharp → INSERT hotel_images rows
  5. Return { hotel_id, hotel_admin_id }
```

---

## 13. Reservation Flow (10-Minute Window)

```
Guest clicks "Reserve" on hotel detail page

Not logged in?
  → /login?callbackUrl=/hotels/[slug]?checkIn=X&checkOut=Y&guests=Z&rooms=N
  → After login: auto-redirect back to original URL with all params

Logged in → POST /api/bookings/reserve
Body: {
  hotel_id,
  check_in,
  check_out,
  guests,
  rooms: [{ room_type_id, room_detail_id }, ...]
}

Server:
  1. requireAuth(['END_USER'])
  2. Zod validate
  3. Check each room_detail: status = AVAILABLE
  4. Check room_trackers: no active tracker for these dates
     (status IN ['RESERVED', 'BOOKED', 'CHECKED_IN'])
  5. Resolve price per room:
     pricing_rules first → fallback to room_details.price
  6. Generate booking_reference (HBD-YYYYMMDD-XXXX)
  7. prisma.$transaction:
       INSERT user_bookings { status: RESERVED, reserved_until: now + 10min }
       INSERT room_bookings (one per room, price snapshot)
       INSERT room_trackers (@@unique prevents race-condition double-book)
       UPDATE room_details SET status = UNAVAILABLE WHERE id IN [...]
  8. Return { booking_reference, reserved_until }

Client → /bookings/[reference]/pay
  Shows: booking summary + countdown timer (MM:SS)

Timer reaches 0 (client fires):
  PATCH /api/bookings/[reference]/expire
  → user_bookings.status = EXPIRED
  → room_trackers.status = EXPIRED
  → room_details.status = AVAILABLE

Server-side safety net (cron every 2 min):
  Find all RESERVED bookings WHERE reserved_until < NOW()
  Bulk expire + free rooms

Payment (Phase 8):
  POST /api/bookings/[reference]/confirm { payment_method, transaction_id }
  → status = BOOKED
  → room_trackers.status = BOOKED
  → send notification
```

---

## 14. Seed Data

```
roles:           { id:1, role_name:'HOTEL_ADMIN' }, { id:2, role_name:'HOTEL_SUB_ADMIN' }

hotel_types:     Hotel, Resort, Boutique, Hostel, Guest House, Serviced Apartment

cities:          Dhaka, Chittagong, Sylhet, Rajshahi, Khulna, Barishal,
                 Rangpur, Mymensingh, Comilla, Narayanganj, Gazipur,
                 Cox's Bazar, Jessore, Tangail, Bogra

amenities (is_default=true, hotel_id=null):
  context=HOTEL: Parking, Swimming Pool, Gym, Laundry, Airport Shuttle,
                 Restaurant, Conference Room, Generator Backup, Elevator, CCTV
  context=ROOM:  WiFi, Air Conditioning, Hot Water, TV, Mini Bar,
                 Room Service, Wardrobe, Personal Safe, Hair Dryer, Breakfast Included

bed_types (is_default=true, hotel_id=null):
  Single, Twin, Double, Queen, King, Bunk, Sofa Bed

system_admins:   one row seeded from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars
```

---

## 15. Image Upload

```
Storage:   public/uploads/ (served as static files by Next.js)
DB field:  relative path e.g. /uploads/hotels/abc.webp

Upload folders:
  public/uploads/
    hotels/              → hotel_images
    rooms/types/         → room_images (room_type_id set)
    rooms/units/         → room_images (room_detail_id set)
    staff/sys-admin/     → system_admin_images
    staff/hotel-admin/   → hotel_admin_images
    staff/sub-admin/     → hotel_sub_admin_images
    users/               → end_user_images
    cities/              → cities.image_url

Flow: multer receives → sharp resize/compress → save to disk → INSERT DB row
Profile images: set is_active=false on all previous rows before inserting new one.
```

---

## 16. NID / Passport Zod Validation

Applies to all `*_details` creation and update schemas.

```typescript
z.object({
  nid_no:   z.string().optional(),
  passport: z.string().optional(),
}).refine(
  (data) => !!data.nid_no || !!data.passport,
  { message: 'Either NID number or passport is required' }
)
```

---

## 17. Sub Admin Management Rules

- Hotel admin views sub admin list: `WHERE hotel_id = token.hotel_id AND deleted_at IS NULL`
- Block: sets `is_blocked = true` AND blacklists their current JWT immediately
- Unblock: sets `is_blocked = false`
- Delete: sets `deleted_at = now()` — row stays in DB, all history preserved
- Login guard (every login endpoint): reject if `deleted_at IS NOT NULL` OR `is_blocked = true`

---

## 18. Directory Structure

```
hotel-booking/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── src/
│   ├── app/
│   │   │
│   │   ├── (auth)/                              # No layout wrapper needed
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx                   # End user login
│   │   │   ├── register/page.tsx                # End user register
│   │   │   ├── admin-login/page.tsx             # System admin login
│   │   │   └── hotel-login/page.tsx             # Hotel admin + sub admin (shared page)
│   │   │
│   │   ├── (public)/                            # Navbar + Footer layout
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                         # Home: hero search + browse by city
│   │   │   ├── hotels/
│   │   │   │   ├── page.tsx                     # Hotel search / explore / listing
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx                 # Hotel detail + room type cards
│   │   │   ├── destinations/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [name]/page.tsx
│   │   │   ├── popular/page.tsx
│   │   │   └── search/page.tsx                  # Search results with full filter sidebar
│   │   │
│   │   ├── (user)/                              # END_USER auth guard
│   │   │   ├── layout.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── bookings/
│   │   │       ├── page.tsx                     # My bookings list
│   │   │       └── [reference]/
│   │   │           ├── page.tsx                 # Booking detail
│   │   │           └── pay/page.tsx             # 10-min timer + payment summary
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                       # Thin wrapper
│   │   │   ├── page.tsx                         # Role-based redirect
│   │   │   │
│   │   │   ├── system/                          # SYSTEM_ADMIN only
│   │   │   │   ├── layout.tsx                   # Admin sidebar + header
│   │   │   │   ├── page.tsx                     # Dashboard overview / stats
│   │   │   │   ├── hotels/
│   │   │   │   │   ├── page.tsx                 # All hotels list
│   │   │   │   │   ├── new/page.tsx             # Create hotel + hotel admin (one form)
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx             # Hotel detail view
│   │   │   │   │       └── edit/page.tsx        # Edit hotel info
│   │   │   │   ├── users/
│   │   │   │   │   ├── page.tsx                 # All end users list
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx             # User profile view
│   │   │   │   │       ├── edit/page.tsx
│   │   │   │   │       └── history/page.tsx     # Booking history
│   │   │   │   ├── bookings/
│   │   │   │   │   ├── page.tsx                 # All bookings (filterable)
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── admins/
│   │   │   │   │   ├── page.tsx                 # System admins list
│   │   │   │   │   └── new/page.tsx             # Create system admin
│   │   │   │   ├── cities/page.tsx
│   │   │   │   ├── hotel-types/page.tsx
│   │   │   │   ├── amenities/page.tsx           # Global amenities management
│   │   │   │   └── settings/page.tsx
│   │   │   │
│   │   │   ├── hotel/                           # HOTEL_ADMIN only
│   │   │   │   ├── layout.tsx                   # Hotel admin sidebar + header
│   │   │   │   ├── page.tsx                     # Hotel admin overview / stats
│   │   │   │   ├── details/page.tsx             # Edit hotel info + details
│   │   │   │   ├── images/page.tsx              # Hotel image manager
│   │   │   │   ├── amenities/page.tsx           # Custom amenities (HOTEL ctx) + bed types
│   │   │   │   ├── room-types/
│   │   │   │   │   ├── page.tsx                 # List all room types
│   │   │   │   │   ├── new/page.tsx             # Create room type (template)
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx             # Edit room type
│   │   │   │   │       └── images/page.tsx      # Room type images manager
│   │   │   │   ├── rooms/
│   │   │   │   │   ├── page.tsx                 # List all physical rooms
│   │   │   │   │   ├── new/page.tsx             # Create room (room type dropdown + room fields)
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx             # Room detail / edit
│   │   │   │   │       └── images/page.tsx      # Room individual images
│   │   │   │   ├── availability/page.tsx        # Calendar: rooms × dates grid
│   │   │   │   ├── bookings/
│   │   │   │   │   ├── page.tsx                 # All hotel bookings
│   │   │   │   │   └── [reference]/page.tsx     # Booking detail + manual status change
│   │   │   │   ├── guests/
│   │   │   │   │   └── [id]/page.tsx            # Guest profile
│   │   │   │   ├── staff/
│   │   │   │   │   ├── page.tsx                 # Sub admin list (block/delete actions)
│   │   │   │   │   └── new/page.tsx             # Create sub admin
│   │   │   │   ├── pricing/page.tsx             # Seasonal pricing rules per room type
│   │   │   │   ├── revenue/page.tsx
│   │   │   │   └── settings/page.tsx            # Policies, times, deposit, cancellation
│   │   │   │
│   │   │   └── sub/                             # HOTEL_SUB_ADMIN only
│   │   │       ├── layout.tsx                   # Sub admin sidebar + header
│   │   │       ├── page.tsx                     # Overview
│   │   │       ├── rooms/
│   │   │       │   ├── page.tsx                 # List rooms (read)
│   │   │       │   ├── new/page.tsx             # Create room (room type dropdown)
│   │   │       │   └── [id]/page.tsx            # Edit room
│   │   │       └── bookings/
│   │   │           ├── page.tsx
│   │   │           └── [reference]/page.tsx
│   │   │
│   │   └── api/
│   │       │
│   │       ├── auth/
│   │       │   ├── end-user/
│   │       │   │   ├── login/route.ts
│   │       │   │   └── register/route.ts
│   │       │   ├── system-admin/
│   │       │   │   └── login/route.ts
│   │       │   ├── hotel/
│   │       │   │   └── login/route.ts           # Checks hotel_admins then hotel_sub_admins
│   │       │   ├── me/route.ts                  # GET current actor info
│   │       │   └── logout/route.ts
│   │       │
│   │       ├── system-admin/                    # All routes require SYSTEM_ADMIN token
│   │       │   ├── hotels/
│   │       │   │   ├── route.ts                 # GET (list), POST (create hotel + admin)
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts             # GET, PATCH, DELETE (soft)
│   │       │   │       └── suspend/route.ts     # PATCH approval_status = SUSPENDED
│   │       │   ├── users/
│   │       │   │   ├── route.ts                 # GET all end_users
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts             # GET, PATCH, DELETE (soft)
│   │       │   │       └── block/route.ts       # PATCH { is_blocked }
│   │       │   ├── bookings/
│   │       │   │   ├── route.ts                 # GET all bookings
│   │       │   │   └── [id]/route.ts
│   │       │   ├── admins/
│   │       │   │   ├── route.ts                 # GET list, POST create
│   │       │   │   └── [id]/route.ts            # GET, PATCH, DELETE (soft)
│   │       │   ├── cities/route.ts              # GET, POST, PATCH, DELETE
│   │       │   ├── hotel-types/route.ts
│   │       │   └── amenities/route.ts           # Global defaults management
│   │       │
│   │       ├── hotel-admin/                     # All require HOTEL_ADMIN token
│   │       │   ├── overview/route.ts            # GET stats for own hotel
│   │       │   ├── hotel/
│   │       │   │   ├── route.ts                 # GET own hotel, PATCH update
│   │       │   │   ├── publish/route.ts         # POST: DRAFT → PUBLISHED
│   │       │   │   └── images/
│   │       │   │       ├── route.ts             # GET list, POST upload
│   │       │   │       └── [imageId]/route.ts   # PATCH (sort/cover), DELETE
│   │       │   ├── amenities/
│   │       │   │   ├── route.ts                 # GET (global + own custom), POST create custom
│   │       │   │   └── [id]/route.ts            # PATCH, DELETE (own custom only)
│   │       │   ├── bed-types/
│   │       │   │   ├── route.ts                 # GET (global + own custom), POST create custom
│   │       │   │   └── [id]/route.ts
│   │       │   ├── room-types/
│   │       │   │   ├── route.ts                 # GET list, POST create
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts             # GET, PATCH, DELETE (soft: is_active=false)
│   │       │   │       └── images/
│   │       │   │           ├── route.ts         # GET, POST upload type-level images
│   │       │   │           └── [imageId]/route.ts
│   │       │   ├── rooms/
│   │       │   │   ├── route.ts                 # GET all rooms, POST create (single or bulk)
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts             # GET, PATCH, DELETE (soft: deleted_at)
│   │       │   │       └── images/
│   │       │   │           ├── route.ts         # GET, POST upload room-level images
│   │       │   │           └── [imageId]/route.ts
│   │       │   ├── availability/route.ts        # GET room × date availability grid
│   │       │   ├── pricing/
│   │       │   │   ├── route.ts                 # GET all rules, POST create rule
│   │       │   │   └── [id]/route.ts            # PATCH, DELETE
│   │       │   ├── staff/
│   │       │   │   ├── route.ts                 # GET list, POST create sub admin
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts             # GET detail
│   │       │   │       ├── block/route.ts       # PATCH { is_blocked } + blacklist token
│   │       │   │       └── delete/route.ts      # PATCH deleted_at = now()
│   │       │   └── bookings/
│   │       │       ├── route.ts                 # GET all hotel bookings
│   │       │       └── [reference]/
│   │       │           ├── route.ts             # GET booking detail
│   │       │           └── status/route.ts      # PATCH { status: CHECKED_IN|CHECKED_OUT|NO_SHOW|CANCELLED }
│   │       │
│   │       ├── hotel-sub-admin/                 # All require HOTEL_SUB_ADMIN token
│   │       │   ├── rooms/
│   │       │   │   ├── route.ts                 # GET list, POST create room (same hotel scope)
│   │       │   │   └── [id]/
│   │       │   │       ├── route.ts             # GET, PATCH, DELETE (soft)
│   │       │   │       └── images/route.ts
│   │       │   └── bookings/
│   │       │       ├── route.ts
│   │       │       └── [reference]/
│   │       │           ├── route.ts
│   │       │           └── status/route.ts
│   │       │
│   │       ├── public/                          # No auth required
│   │       │   ├── hotels/
│   │       │   │   ├── route.ts                 # GET with all search filters
│   │       │   │   └── [slug]/route.ts          # GET hotel detail + room types
│   │       │   ├── cities/route.ts              # GET active cities (for dropdowns + homepage)
│   │       │   ├── hotel-types/route.ts
│   │       │   └── amenities/route.ts           # GET global amenities (for filter sidebar)
│   │       │
│   │       ├── user/                            # All require END_USER token
│   │       │   ├── profile/route.ts             # GET own profile, PATCH update
│   │       │   ├── images/route.ts              # POST upload profile image
│   │       │   └── bookings/
│   │       │       ├── route.ts                 # GET own bookings
│   │       │       └── [reference]/route.ts     # GET booking detail
│   │       │
│   │       ├── bookings/                        # Requires END_USER token
│   │       │   ├── reserve/route.ts             # POST: create reservation + 10-min hold
│   │       │   └── [reference]/
│   │       │       ├── route.ts                 # GET detail
│   │       │       ├── expire/route.ts          # PATCH: expire + free rooms (client timer fires)
│   │       │       ├── cancel/route.ts          # PATCH: cancel
│   │       │       └── confirm/route.ts         # POST: confirm payment (Phase 8)
│   │       │
│   │       ├── upload/route.ts                  # POST: multer file upload handler
│   │       └── cron/
│   │           └── expire-bookings/route.ts     # POST: batch expire stuck reservations
│   │
│   ├── components/
│   │   ├── ui/                                  # shadcn components (auto-generated)
│   │   ├── layout/
│   │   │   ├── navbar.tsx
│   │   │   ├── footer.tsx
│   │   │   ├── admin-layout.tsx                 # System admin sidebar + header
│   │   │   ├── hotel-admin-layout.tsx           # Hotel admin sidebar + header
│   │   │   ├── hotel-sub-admin-layout.tsx       # Sub admin sidebar + header
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
│   │   │   ├── reservation-timer.tsx            # 10-min countdown component
│   │   │   ├── room-selector.tsx                # Multi-room picker on hotel detail page
│   │   │   └── booking-confirmation.tsx
│   │   └── search/
│   │       ├── hero-search.tsx
│   │       └── search-bar.tsx
│   │
│   ├── lib/
│   │   ├── prisma.ts                            # Prisma singleton with MariaDB adapter
│   │   ├── jwt.ts                               # signToken, verifyToken, blacklist helpers
│   │   ├── auth-middleware.ts                   # requireAuth() used in every API route
│   │   ├── upload.ts                            # Multer config + sharp processing
│   │   ├── utils.ts                             # cn(), formatBDT(), slugify(), generateRef()
│   │   ├── constants.ts                         # RESERVATION_TIMEOUT_MS, MAX_LOGIN_ATTEMPTS etc.
│   │   └── validations/
│   │       ├── auth.ts
│   │       ├── hotel.ts
│   │       ├── room-type.ts
│   │       ├── room.ts
│   │       └── booking.ts
│   │
│   ├── types/
│   │   └── index.ts                             # JwtPayload and other shared types
│   │
│   └── middleware.ts                            # Next.js middleware (route protection)
│
└── public/
    └── uploads/                                 # Multer saves images here
```

---

## 19. Constants (`src/lib/constants.ts`)

```typescript
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

## 20. Build Phases

| Phase | Scope |
|---|---|
| 1 | Project init, Prisma + MariaDB adapter, first migration, seed, JWT lib, middleware, CSS |
| 2 | Auth API routes (5 endpoints) + all 4 login/register pages |
| 3 | Base layouts (navbar, footer, admin sidebar, hotel admin sidebar, sub admin sidebar) |
| 4 | System admin: create hotel + hotel admin, hotel list, user management |
| 5 | Hotel admin: hotel details, images, amenities, bed types, publish |
| 6 | Hotel admin: room types (create/edit/list), room type images |
| 7 | Hotel admin + sub admin: physical rooms (create single/bulk, edit, images) |
| 8 | Hotel admin + sub admin: bookings, manual status change, staff management |
| 9 | Public: home, search, hotel detail, room type cards |
| 10 | User: profile, settings, booking history |
| 11 | Reservation flow: 10-min hold, countdown timer, expire/cancel |
| 12 | Payment gateway (SSL Commerz / bKash) |
| 13+ | Google OAuth, notifications, reviews, analytics, SMS |
