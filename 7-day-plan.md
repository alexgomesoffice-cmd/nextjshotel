# 7-Day Build Plan — Hotel Booking System
> Aligned with system-design.md v4.
> Each day = backend API routes built + corresponding frontend pages adapted from MERN project.
> Backend logic is written from scratch. Frontend JSX is migrated from MERN with necessary Next.js changes.
> One thing at a time. No skipping. No shortcuts.

---

## Ground Rules Before Starting

### MERN → Next.js changes every page needs
```
1. Routing imports
   - import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
   + import Link from 'next/link'
   + import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation'
   - const navigate = useNavigate()
   + const router = useRouter()
   - navigate('/path')
   + router.push('/path')

2. Layout pattern
   - <Outlet />  (React Router)
   + {children}  (Next.js layout.tsx)

3. API calls
   - fetch('http://localhost:3000/api/...')  or  axios.get('http://...')
   + fetch('/api/...')   (relative — always)
   + Add credentials: 'include' to every fetch so cookie is sent

4. Auth token
   - localStorage.setItem('authToken', ...)   ← REMOVE entirely
   - Token is now an HttpOnly cookie set by the server
   - Keep localStorage only for UI hints: user name, role (not for security)

5. Client components
   - Any component using useState / useEffect / event handlers needs 'use client' at top
   - Page-level data fetching can be async server components (no useState/useEffect)

6. Images
   - <img src={...} />  →  keep as <img> for dynamic/uploaded URLs
   - Use next/image <Image> only for static assets in /public

7. Environment variables
   - VITE_* env vars → not needed (API calls are relative)
   - Server secrets: JWT_SECRET, DATABASE_URL  (no prefix)
   - Client-safe vars: NEXT_PUBLIC_* prefix
```

### API response shape — use this everywhere
```typescript
// Success
{ success: true, data: { ... } }
{ success: true, data: { ... }, message: 'Created successfully' }

// Error
{ success: false, message: 'Descriptive error message' }
```

### Every protected API route follows this pattern
```typescript
import { requireAuth } from '@/lib/auth-middleware'

export async function GET(req: NextRequest) {
  const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
  if (error) return error

  // payload.actor_id, payload.hotel_id, payload.actor_type available here
  // scope ALL queries to payload.hotel_id — never trust hotel_id from request body
}
```

---

## Day 1 — Foundation
**Goal: Project running, DB connected, schema migrated, seed data in, JWT utilities ready, dark theme applied.**

### Step 1 — Create project
```bash
npx create-next-app@latest hotel-booking --typescript --tailwind --eslint --app --src-dir
cd hotel-booking
```

### Step 2 — Install all packages (run as one command)
```bash
npm install prisma@^7 @prisma/client@^7 @prisma/adapter-mariadb mariadb \
  jsonwebtoken bcryptjs zod date-fns uuid \
  multer sharp lucide-react

npm install -D @types/jsonwebtoken @types/bcryptjs @types/uuid @types/multer
```

### Step 3 — shadcn init + install all components
```bash
npx shadcn@latest init
# Choose: Dark theme, CSS variables: yes, src/components/ui

npx shadcn@latest add button input label card badge table dialog sheet \
  select textarea checkbox switch radio-group slider \
  dropdown-menu popover calendar toast sonner tooltip \
  avatar separator skeleton progress tabs accordion \
  alert form breadcrumb pagination scroll-area
```

### Step 4 — Create base lib files
```
Create these files (content in system-design.md sections 4 and 5):

src/lib/prisma.ts          ← MariaDB adapter singleton (Section 4)
src/lib/jwt.ts             ← signToken, verifyToken, hashToken, isBlacklisted, blacklistToken (Section 5)
src/lib/auth-middleware.ts ← requireAuth(req, allowedRoles[]) (Section 5)
src/lib/utils.ts           ← cn(), formatBDT(), slugify(), generateRef()
src/lib/constants.ts       ← all constants (Section 19)
src/lib/upload.ts          ← Multer + sharp config
src/lib/validations/auth.ts
src/lib/validations/hotel.ts
src/lib/validations/room-type.ts
src/lib/validations/room.ts
src/lib/validations/booking.ts
src/types/index.ts         ← JwtPayload type
src/middleware.ts          ← route protection (Section 5)
```

### `src/lib/utils.ts`
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBDT(amount: number | string): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(Number(amount))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateRef(): string {
  const date = format(new Date(), 'yyyyMMdd')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `HBD-${date}-${rand}`
}
```

### Step 5 — Prisma schema + migration
```bash
npx prisma init
# Paste full schema from system-design.md Section 6
npx prisma migrate dev --name init
npx prisma generate
```

### Step 6 — Seed file (`prisma/seed.ts`)
Seeds in this order:
1. roles (id=1 HOTEL_ADMIN, id=2 HOTEL_SUB_ADMIN)
2. hotel_types
3. cities (15 BD cities)
4. amenities (global defaults, context=HOTEL and context=ROOM)
5. bed_types (global defaults)
6. first system_admin (from env SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD)

```bash
npx prisma db seed
```

### Step 7 — CSS dark theme
```
Copy src/index.css from MERN project into src/app/globals.css
This contains all CSS variables: --background, --foreground, --primary, --card etc.
Also copy custom classes: .glass, .glass-strong, .text-gradient, .animate-fade-in-up
shadcn reads the same CSS variables — no changes needed.
```

### Step 8 — Create upload directories
```bash
mkdir -p public/uploads/hotels
mkdir -p public/uploads/rooms/types
mkdir -p public/uploads/rooms/units
mkdir -p public/uploads/staff/sys-admin
mkdir -p public/uploads/staff/hotel-admin
mkdir -p public/uploads/staff/sub-admin
mkdir -p public/uploads/users
mkdir -p public/uploads/cities
```

### Day 1 Checklist
- [ ] `npx prisma migrate dev` runs with zero errors
- [ ] `npx prisma db seed` completes — check rows in DB
- [ ] `src/lib/prisma.ts` — `prisma.$queryRaw` test query works
- [ ] JWT sign + verify round-trips correctly
- [ ] Dark theme CSS variables apply — check in browser

---

## Day 2 — Authentication (All 4 Actors)
**Goal: All login flows working end-to-end with HttpOnly cookies. Middleware protecting routes.**

### API routes to build (5 routes)

#### `POST /api/auth/end-user/register`
```
Body (Zod): { name: min 2, email: valid email, password: min 6 }
Logic:
  1. Check email not already in end_users
  2. bcrypt.hash(password, 10)
  3. INSERT end_users
  4. Return { success: true, data: { user: { id, name, email } } }
  Note: Does NOT auto-login. Redirect to login page after register.
```

#### `POST /api/auth/end-user/login`
```
Body (Zod): { email, password }
Logic:
  1. Find end_user WHERE email = ? AND deleted_at IS NULL
  2. Check is_blocked → 403 'Your account has been blocked'
  3. Check login_attempts >= MAX_LOGIN_ATTEMPTS AND locked_until > now → 423 'Account locked'
  4. bcrypt.compare(password, user.password)
  5. If fail: increment login_attempts, set locked_until if threshold hit → 401
  6. If pass: reset login_attempts=0, update last_login_at
  7. signToken({ actor_id: user.id, actor_type: 'END_USER' })
  8. Set-Cookie: token=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800
  9. Return { success: true, data: { user: { id, name, email } } }
```

#### `POST /api/auth/system-admin/login`
```
Body (Zod): { email, password }
Logic: same pattern as end-user login but queries system_admins table
  signToken({ actor_id, actor_type: 'SYSTEM_ADMIN' })
  Return { success: true, data: { admin: { id, name, email } } }
```

#### `POST /api/auth/hotel/login`
```
Body (Zod): { email, password }
Logic:
  1. Try hotel_admins WHERE email = ? AND deleted_at IS NULL
  2. If not found: try hotel_sub_admins WHERE email = ? AND deleted_at IS NULL
  3. If neither found: 401 'Invalid credentials'
  4. Check is_blocked, login_attempts, locked_until
  5. bcrypt.compare
  6. Determine actor_type: 'HOTEL_ADMIN' or 'HOTEL_SUB_ADMIN'
  7. signToken({ actor_id, actor_type, hotel_id: actor.hotel_id })
  8. Set cookie
  9. Return { success: true, data: { admin: { id, name, email, hotel_id, role } } }
```

#### `POST /api/auth/logout`
```
Logic:
  1. Read token from cookie
  2. If token exists: verifyToken → blacklistToken (ignore verify errors — just clear cookie)
  3. Set-Cookie: token=; Max-Age=0 (clear cookie)
  4. Return { success: true }
```

#### `GET /api/auth/me`
```
Logic:
  1. requireAuth(req, ['SYSTEM_ADMIN','HOTEL_ADMIN','HOTEL_SUB_ADMIN','END_USER'])
  2. Fetch actor row based on actor_type + actor_id
  3. Return { id, name, email, actor_type, hotel_id? }
  Used by: Navbar, layout components to display logged-in user info
```

### Pages to build (4 pages + middleware)

#### `src/middleware.ts`
Already designed in system-design.md Section 5. Copy it.

#### `src/app/(auth)/layout.tsx`
```typescript
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

#### `src/app/(auth)/login/page.tsx`
Source: MERN `src/pages/Login.tsx`
Changes:
- `'use client'` at top
- Replace all react-router-dom imports
- `fetch('/api/auth/end-user/login', { method:'POST', credentials:'include', body: JSON.stringify({email,password}), headers:{'Content-Type':'application/json'} })`
- On success: read `callbackUrl` from searchParams → `router.push(callbackUrl || '/')`
- Remove all localStorage token logic
- Keep: `localStorage.setItem('user_name', data.user.name)` for navbar display hint only

#### `src/app/(auth)/register/page.tsx`
Source: MERN `src/pages/Signup.tsx`
Changes: same import swaps, API call to `/api/auth/end-user/register`, on success `router.push('/login')`

#### `src/app/(auth)/admin-login/page.tsx`
Source: MERN `src/pages/AdminLogin.tsx`
Changes: API call to `/api/auth/system-admin/login`, on success `router.push('/dashboard/system')`

#### `src/app/(auth)/hotel-login/page.tsx`
Source: MERN `src/pages/HotelAdminLogin.tsx`
Changes: API call to `/api/auth/hotel/login`
On success: check returned `role`
- HOTEL_ADMIN → `router.push('/dashboard/hotel')`
- HOTEL_SUB_ADMIN → `router.push('/dashboard/sub')`

### Day 2 Checklist
- [ ] End user can register → login → cookie set → redirected to home
- [ ] System admin can login → redirected to `/dashboard/system` (shows 404 for now — that's fine)
- [ ] Hotel admin can login → redirected to `/dashboard/hotel`
- [ ] Hotel sub admin logs in via same hotel-login page → redirected to `/dashboard/sub`
- [ ] Logout clears cookie, blacklists token
- [ ] `/api/auth/me` returns correct actor data
- [ ] Visiting `/dashboard/system` without login redirects to `/admin-login`
- [ ] Visiting `/dashboard/hotel` without login redirects to `/hotel-login`
- [ ] callbackUrl round-trip: visiting `/bookings` while logged out → login → back to `/bookings`

---

## Day 3 — Layouts + Dashboard Shells
**Goal: All three dashboard layouts render correctly. Sidebar navigation works. Role-based redirects in place.**

### Files to create

#### `src/app/(public)/layout.tsx`
```typescript
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  )
}
```

#### `src/app/(public)/page.tsx` — placeholder
```typescript
export default function HomePage() {
  return <div className="min-h-screen flex items-center justify-center">Home — Day 6</div>
}
```

#### `src/app/dashboard/page.tsx` — role-based redirect
```typescript
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (!data.success) { router.push('/login'); return }
        const roleMap: Record<string, string> = {
          SYSTEM_ADMIN:    '/dashboard/system',
          HOTEL_ADMIN:     '/dashboard/hotel',
          HOTEL_SUB_ADMIN: '/dashboard/sub',
          END_USER:        '/',
        }
        router.replace(roleMap[data.data.actor_type] ?? '/')
      })
  }, [])
  return <div>Redirecting...</div>
}
```

#### `src/app/dashboard/system/layout.tsx`
```typescript
import AdminLayout from '@/components/layout/admin-layout'
export default function SystemLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
```

#### `src/app/dashboard/hotel/layout.tsx`
```typescript
import HotelAdminLayout from '@/components/layout/hotel-admin-layout'
export default function HotelLayout({ children }: { children: React.ReactNode }) {
  return <HotelAdminLayout>{children}</HotelAdminLayout>
}
```

#### `src/app/dashboard/sub/layout.tsx`
```typescript
import HotelSubAdminLayout from '@/components/layout/hotel-sub-admin-layout'
export default function SubLayout({ children }: { children: React.ReactNode }) {
  return <HotelSubAdminLayout>{children}</HotelSubAdminLayout>
}
```

### Components to build

#### `src/components/layout/navbar.tsx`
Source: MERN `src/components/Navbar.tsx`
Changes:
- `'use client'`
- react-router-dom → next/link, useRouter, usePathname
- Logout: `fetch('/api/auth/logout', { method:'POST', credentials:'include' })` → `router.push('/login')`
- Login state: check `localStorage.getItem('user_name')` as a UI hint (not security)

#### `src/components/layout/footer.tsx`
Source: MERN `src/components/Footer.tsx`
Changes: Link imports only

#### `src/components/layout/admin-layout.tsx`
Source: MERN `src/components/admin/AdminLayout.tsx`
Changes:
- Replace `<Outlet />` with `{children}`
- `useLocation().pathname` → `usePathname()`
- `useNavigate` → `useRouter`
- Sidebar items match the system admin section of the directory structure

Sidebar sections:
```
Overview               → /dashboard/system
─────────────────
Hotels
  └─ All Hotels        → /dashboard/system/hotels
  └─ Add Hotel         → /dashboard/system/hotels/new
─────────────────
Users                  → /dashboard/system/users
─────────────────
Bookings               → /dashboard/system/bookings
─────────────────
Platform
  └─ System Admins     → /dashboard/system/admins
  └─ Cities            → /dashboard/system/cities
  └─ Hotel Types       → /dashboard/system/hotel-types
  └─ Amenities         → /dashboard/system/amenities
─────────────────
Settings               → /dashboard/system/settings
```

#### `src/components/layout/hotel-admin-layout.tsx`
Source: MERN `src/components/hotel-admin/HotelAdminLayout.tsx`
Changes: same as above

Sidebar (matches system-design.md Section 10):
```
Overview               → /dashboard/hotel
─────────────────
Manage Hotel
  └─ Hotel Details     → /dashboard/hotel/details
  └─ Hotel Images      → /dashboard/hotel/images
  └─ Hotel Amenities   → /dashboard/hotel/amenities
─────────────────
Room Types             → /dashboard/hotel/room-types
Rooms                  → /dashboard/hotel/rooms
Availability           → /dashboard/hotel/availability
─────────────────
Bookings
  └─ All Reservations  → /dashboard/hotel/bookings
  └─ Guests            → /dashboard/hotel/guests
─────────────────
Staff                  → /dashboard/hotel/staff
Pricing                → /dashboard/hotel/pricing
─────────────────
Revenue                → /dashboard/hotel/revenue
Settings               → /dashboard/hotel/settings
```

#### `src/components/layout/hotel-sub-admin-layout.tsx`
New file — no MERN equivalent.

Sidebar (matches system-design.md Section 11):
```
Overview               → /dashboard/sub
─────────────────
Rooms                  → /dashboard/sub/rooms
─────────────────
Bookings
  └─ All Reservations  → /dashboard/sub/bookings
  └─ Guests            → /dashboard/sub/guests
```

### Shell dashboard pages (placeholder content)
```
src/app/dashboard/system/page.tsx   → "System Admin Dashboard — coming Day 4"
src/app/dashboard/hotel/page.tsx    → "Hotel Admin Dashboard — coming Day 5"
src/app/dashboard/sub/page.tsx      → "Sub Admin Dashboard — coming Day 5"
src/app/not-found.tsx               → from MERN NotFound.tsx
```

### Day 3 Checklist
- [ ] Navbar renders on public pages, shows login/logout correctly
- [ ] System admin layout: sidebar all items clickable, active item highlighted
- [ ] Hotel admin layout: sidebar matches spec from system-design.md Section 10
- [ ] Sub admin layout: restricted sidebar (no Room Types, no Staff, no Pricing)
- [ ] `dashboard/page.tsx` correctly redirects each role to their dashboard
- [ ] Dark theme applied consistently across all layouts

---

## Day 4 — System Admin: Hotel & User Management
**Goal: System admin can create hotels with hotel admin accounts, list/edit hotels, manage users.**

### API routes to build

#### `GET /api/public/cities`
```
No auth. Returns: all cities WHERE is_active=true ORDER BY name
Used by: hotel creation form dropdown, home page city tiles, search filters
```

#### `GET /api/public/hotel-types`
```
No auth. Returns: all hotel_types WHERE is_active=true
```

#### `POST /api/system-admin/hotels`
```
requireAuth(['SYSTEM_ADMIN'])
Body (Zod):
  hotel: { name, city_id, hotel_type_id, star_rating, address, zip_code?,
            email?, emergency_contact1?, emergency_contact2?, owner_name?,
            latitude?, longitude? }
  details: { description?, short_description?, check_in_time, check_out_time,
              advance_deposit_percent, cancellation_policy, cancellation_hours?,
              refund_percent? }
  admin: { name, email, password }

Logic:
  1. Check admin.email not in hotel_admins or system_admins
  2. slugify(hotel.name) — ensure uniqueness (append counter if clash)
  3. prisma.$transaction:
       a. INSERT hotels (created_by = payload.actor_id, status: DRAFT, slug)
       b. INSERT hotel_details
       c. bcrypt.hash(admin.password) → INSERT hotel_admins (hotel_id, role_id=1)
  4. Return { hotel_id, hotel_admin_id }
```

#### `GET /api/system-admin/hotels`
```
requireAuth(['SYSTEM_ADMIN'])
Query params: page, limit, status (ApprovalStatus), city_id, hotel_type_id, search (name)
Returns: paginated list with hotel + city + hotel_type + hotel_admin name
```

#### `GET /api/system-admin/hotels/[id]`
```
requireAuth(['SYSTEM_ADMIN'])
Returns: hotel + hotel_details + hotel_admin + images + city + hotel_type
```

#### `PATCH /api/system-admin/hotels/[id]`
```
requireAuth(['SYSTEM_ADMIN'])
Can update: hotel info + hotel_details (NOT room types, NOT rooms)
```

#### `PATCH /api/system-admin/hotels/[id]/suspend`
```
requireAuth(['SYSTEM_ADMIN'])
Sets approval_status = SUSPENDED
```

#### `DELETE /api/system-admin/hotels/[id]`
```
requireAuth(['SYSTEM_ADMIN'])
Sets deleted_at = now() on hotel, hotel_details, hotel_admin (all soft)
```

#### `GET /api/system-admin/users`
```
requireAuth(['SYSTEM_ADMIN'])
Query: page, limit, search (name/email), is_blocked
Returns: paginated end_users list
```

#### `GET /api/system-admin/users/[id]`
#### `PATCH /api/system-admin/users/[id]`
#### `PATCH /api/system-admin/users/[id]/block`
```
Body: { is_blocked: boolean }
```

#### `POST /api/system-admin/admins`
```
requireAuth(['SYSTEM_ADMIN'])
Creates a new system_admin. created_by = payload.actor_id
```

#### `GET /api/system-admin/admins`

### Pages to build
```
Source → Destination

AdminDashboardHome.tsx  → dashboard/system/page.tsx
  Stats cards: total hotels, active hotels, total users, total bookings
  Fetch from a dedicated /api/system-admin/overview route

AdminCurrentHotels.tsx  → dashboard/system/hotels/page.tsx
  Table: name, city, type, star, status badge, admin email, actions
  Filters: status dropdown, search input

AdminAddHotel.tsx       → dashboard/system/hotels/new/page.tsx
  Form sections:
    Section 1: Hotel Info (name, city dropdown, type dropdown, star rating, address...)
    Section 2: Hotel Details (description, check-in/out times, deposit%, cancellation policy)
    Section 3: Hotel Admin Account (name, email, temp password)
    Section 4: Images (optional, upload immediately or skip)
  On submit: POST /api/system-admin/hotels → redirect to hotels list

AdminUpdateHotel.tsx    → dashboard/system/hotels/[id]/edit/page.tsx
  Pre-fill from GET /api/system-admin/hotels/[id]

AdminClientList.tsx     → dashboard/system/users/page.tsx
AdminClientProfile.tsx  → dashboard/system/users/[id]/page.tsx
AdminUpdateClient.tsx   → dashboard/system/users/[id]/edit/page.tsx
AdminClientHistory.tsx  → dashboard/system/users/[id]/history/page.tsx
AdminAddSystemAdmin.tsx → dashboard/system/admins/new/page.tsx
```

### Day 4 Checklist
- [ ] System admin can create a hotel + hotel admin account in one form submission
- [ ] Hotel saved as DRAFT, hotel admin account created and can log in
- [ ] Hotel list shows all hotels with correct status badges
- [ ] Search and filter on hotel list works
- [ ] User list shows all end users with block/unblock actions
- [ ] Create system admin form works
- [ ] City and hotel type dropdowns populate from DB

---

## Day 5 — Hotel Admin: Hotel Management + Room Types
**Goal: Hotel admin can fully manage their hotel info, images, amenities, and create room types.**

### API routes to build

#### `GET /api/hotel-admin/hotel`
```
requireAuth(['HOTEL_ADMIN'])
Returns: hotels JOIN hotel_details WHERE id = payload.hotel_id
Includes: city name, hotel type, images, hotel amenities
```

#### `PATCH /api/hotel-admin/hotel`
```
requireAuth(['HOTEL_ADMIN'])
Scope: hotel_id = payload.hotel_id (enforced server side)
Can update: hotel info fields + hotel_details fields
Cannot update: approval_status (separate endpoint), city_id change restricted
```

#### `POST /api/hotel-admin/hotel/publish`
```
requireAuth(['HOTEL_ADMIN'])
Validates: hotel has name, description, at least 1 image, at least 1 room type
Sets: approval_status = PUBLISHED, published_at = now()
```

#### `GET /api/hotel-admin/hotel/images`
#### `POST /api/hotel-admin/hotel/images`
```
Multer upload → sharp process → INSERT hotel_images
Body (multipart): files[], set_as_cover? (boolean)
```

#### `PATCH /api/hotel-admin/hotel/images/[imageId]`
```
Body: { is_cover?: boolean, sort_order?: number }
```

#### `DELETE /api/hotel-admin/hotel/images/[imageId]`
```
Hard delete image row + delete file from disk
```

#### `GET /api/hotel-admin/amenities`
```
Returns: global defaults (is_default=true) UNION hotel custom (hotel_id = payload.hotel_id)
Grouped by context: HOTEL amenities list and ROOM amenities list
```

#### `POST /api/hotel-admin/amenities`
```
Body: { name, icon?, context: 'HOTEL' | 'ROOM' }
INSERT amenities { hotel_id: payload.hotel_id, is_default: false }
```

#### `DELETE /api/hotel-admin/amenities/[id]`
```
Only if amenity.hotel_id = payload.hotel_id (cannot delete global defaults)
```

#### `GET /api/hotel-admin/bed-types`
```
Returns: global defaults UNION hotel custom (hotel_id = payload.hotel_id)
```

#### `POST /api/hotel-admin/bed-types`
#### `DELETE /api/hotel-admin/bed-types/[id]`

#### `GET /api/hotel-admin/room-types`
```
requireAuth(['HOTEL_ADMIN'])
Returns: all room_types WHERE hotel_id = payload.hotel_id AND is_active = true
Includes: bed types, amenities (room_properties), image count, room count
```

#### `POST /api/hotel-admin/room-types`
```
requireAuth(['HOTEL_ADMIN'])
Body (Zod):
  { name, description?, base_price, max_occupancy, room_size?,
    cancellation_policy, cancellation_hours?, refund_percent?,
    check_in_time?, check_out_time?,
    bed_types: [{ bed_type_id, count }],
    amenity_ids: number[] }

Logic:
  1. Validate hotel_id = payload.hotel_id
  2. INSERT room_types
  3. INSERT room_bed_types (one row per bed type)
  4. INSERT room_properties (one row per amenity_id)
  5. Return full room type with relations
```

#### `GET /api/hotel-admin/room-types/[id]`
#### `PATCH /api/hotel-admin/room-types/[id]`
```
Can update all fields. For bed_types and amenities: delete existing + re-insert.
Scope check: room_type.hotel_id = payload.hotel_id
```

#### `DELETE /api/hotel-admin/room-types/[id]` (soft)
```
Sets is_active = false
Blocks if room_type has rooms with status AVAILABLE or UNAVAILABLE (cannot delete active type)
```

#### `POST /api/hotel-admin/room-types/[id]/images`
#### `DELETE /api/hotel-admin/room-types/[id]/images/[imageId]`

### Pages to build
```
HotelAdminOverview.tsx     → dashboard/hotel/page.tsx
  Stats: room count, booking count (this month), revenue (this month), occupancy %
  Fetch from /api/hotel-admin/overview

HotelAdminHotelEdit.tsx    → dashboard/hotel/details/page.tsx
  Pre-fill hotel + hotel_details fields
  Separate save buttons per section or one unified form

                           → dashboard/hotel/images/page.tsx
  Image grid, drag to reorder, mark cover, delete

                           → dashboard/hotel/amenities/page.tsx
  Tab 1: Hotel Amenities (context=HOTEL) — checkboxes for global + hotel custom + add new
  Tab 2: Bed Types — list of global + hotel custom + add new

                           → dashboard/hotel/room-types/page.tsx
  Cards: room type name, base_price, max_occupancy, bed config, amenity chips, room count
  Actions: Edit, Manage Images, Delete

                           → dashboard/hotel/room-types/new/page.tsx
  Form: name, description, base_price, max_occupancy, room_size
        Bed types: multi-select with count per type
        Amenities: multi-checkbox from ROOM context amenities
        Cancellation policy section
        Image upload
  On submit: POST /api/hotel-admin/room-types

dashboard/hotel/room-types/[id]/page.tsx  ← Edit room type (pre-fill)
dashboard/hotel/room-types/[id]/images/page.tsx
```

### Day 5 Checklist
- [ ] Hotel admin can view and edit their hotel details
- [ ] Hotel admin can upload, reorder, set cover, delete hotel images
- [ ] Hotel admin can manage custom amenities (HOTEL context)
- [ ] Hotel admin can manage custom bed types
- [ ] Hotel admin can create a room type with beds + amenities
- [ ] Room types list shows correctly with all metadata
- [ ] Edit room type pre-fills all fields
- [ ] Publish hotel works (DRAFT → PUBLISHED)

---

## Day 6 — Hotel Admin + Sub Admin: Physical Rooms + Staff + Bookings
**Goal: Rooms created by selecting room type. Sub admin can add rooms. Staff management done.**

### API routes to build

#### `GET /api/hotel-admin/rooms`
```
requireAuth(['HOTEL_ADMIN'])
Query: room_type_id?, status?, floor?, ac?, page, limit
Returns: room_details JOIN room_types WHERE room_types.hotel_id = payload.hotel_id
```

#### `POST /api/hotel-admin/rooms`
```
requireAuth(['HOTEL_ADMIN'])
Two modes via body flag: mode = 'single' | 'bulk'

Single mode body:
  { room_type_id, room_number, floor?, price, ac, smoking_allowed, pet_allowed, notes? }

Bulk mode body:
  { room_type_id, floor?, price, ac, smoking_allowed, pet_allowed,
    prefix: string, start_number: number, end_number: number }
  → Server loops from start_number to end_number
  → room_number = prefix + padded number (e.g. '2' + '01' = '201')
  → INSERT each as a separate room_details row
  → Skips (or errors) duplicates if room_number already exists for that room_type_id

Logic for both:
  1. Verify room_type.hotel_id = payload.hotel_id
  2. INSERT room_details row(s)
  3. Return created rooms
```

#### `GET /api/hotel-admin/rooms/[id]`
#### `PATCH /api/hotel-admin/rooms/[id]`
```
Can update: price, floor, ac, smoking_allowed, pet_allowed, status, notes
Cannot update: room_number, room_type_id (immutable after creation)
Scope: room_type.hotel_id = payload.hotel_id
```

#### `DELETE /api/hotel-admin/rooms/[id]` (soft)
```
Sets deleted_at = now()
Blocks if room has active booking (status RESERVED or BOOKED)
```

#### `POST /api/hotel-admin/rooms/[id]/images`
#### `DELETE /api/hotel-admin/rooms/[id]/images/[imageId]`

#### `GET /api/hotel-admin/availability`
```
requireAuth(['HOTEL_ADMIN'])
Query: check_in, check_out (required)
Returns: all rooms for this hotel with their tracker status for those dates
Used for the availability calendar grid view
```

#### `GET /api/hotel-admin/pricing`
#### `POST /api/hotel-admin/pricing`
```
Body: { room_type_id, name?, start_date, end_date, price }
Validate: room_type.hotel_id = payload.hotel_id, start_date < end_date
```

#### `PATCH /api/hotel-admin/pricing/[id]`
#### `DELETE /api/hotel-admin/pricing/[id]`

#### `GET /api/hotel-admin/staff`
```
requireAuth(['HOTEL_ADMIN'])
Returns: hotel_sub_admins WHERE hotel_id = payload.hotel_id AND deleted_at IS NULL
```

#### `POST /api/hotel-admin/staff`
```
Body (Zod): { name, email, password }
Logic:
  1. Check email not in hotel_sub_admins, hotel_admins, system_admins
  2. bcrypt.hash(password)
  3. INSERT hotel_sub_admins { hotel_id: payload.hotel_id, created_by: payload.actor_id, role_id: 2 }
```

#### `GET /api/hotel-admin/staff/[id]`
#### `PATCH /api/hotel-admin/staff/[id]/block`
```
Body: { is_blocked: boolean }
If blocking: also blacklist their current token if possible
  (query blacklisted_tokens by actor_id + actor_type to check if already blacklisted)
```

#### `PATCH /api/hotel-admin/staff/[id]/delete`
```
Sets deleted_at = now() on hotel_sub_admins
```

#### `GET /api/hotel-admin/bookings`
```
Query: status?, reference?, page, limit
Returns: user_bookings WHERE hotel_id = payload.hotel_id
Includes: end_user name + email, room details
```

#### `GET /api/hotel-admin/bookings/[reference]`
#### `PATCH /api/hotel-admin/bookings/[reference]/status`
```
Body: { status: 'CHECKED_IN' | 'CHECKED_OUT' | 'NO_SHOW' | 'CANCELLED' }
Status transition rules:
  BOOKED → CHECKED_IN
  CHECKED_IN → CHECKED_OUT
  BOOKED or RESERVED → CANCELLED
  Any → NO_SHOW
On CANCELLED: also update room_trackers.status + room_details.status = AVAILABLE
```

#### Hotel sub admin routes (same logic, different auth check)
```
GET  /api/hotel-sub-admin/rooms            (HOTEL_SUB_ADMIN scope)
POST /api/hotel-sub-admin/rooms
GET  /api/hotel-sub-admin/rooms/[id]
PATCH /api/hotel-sub-admin/rooms/[id]
DELETE /api/hotel-sub-admin/rooms/[id]     (soft)
GET  /api/hotel-sub-admin/bookings
GET  /api/hotel-sub-admin/bookings/[reference]
PATCH /api/hotel-sub-admin/bookings/[reference]/status
```

### Pages to build
```
HotelAdminRooms.tsx         → dashboard/hotel/rooms/page.tsx
  Table: room_number, floor, room_type name, price, ac/smoking/pet chips, status badge
  Filters: room type dropdown, status, ac filter
  Bulk create button + single create button

HotelAdminAddRoom.tsx       → dashboard/hotel/rooms/new/page.tsx
  Toggle: Single / Bulk mode
  Single: room_type_id (DROPDOWN from hotel's room types), room_number, floor, price, ac, smoking, pet, notes
  Bulk: room_type_id, prefix, start, end, floor, price, ac, smoking, pet
  Image upload (optional, shown only in single mode)

HotelAdminEditRoom.tsx      → dashboard/hotel/rooms/[id]/page.tsx

                            → dashboard/hotel/availability/page.tsx
  Calendar grid: dates on X axis, room numbers on Y axis
  Cells colored by status: green=available, red=unavailable, yellow=reserved, grey=maintenance

                            → dashboard/hotel/pricing/page.tsx
  List of pricing rules per room type
  Form to create/edit rule: room type dropdown, name, date range, price

HotelAdminAddSubAdmin.tsx   → dashboard/hotel/staff/new/page.tsx
                            → dashboard/hotel/staff/page.tsx
  Table: name, email, is_blocked status, created_at, actions (block/unblock, delete)

HotelAdminReservations.tsx  → dashboard/hotel/bookings/page.tsx
HotelAdminReservationDetail → dashboard/hotel/bookings/[reference]/page.tsx
  Shows: booking info, rooms booked, guest info, price breakdown, manual status change

HotelAdminGuestProfile.tsx  → dashboard/hotel/guests/[id]/page.tsx

Sub admin pages:
                            → dashboard/sub/page.tsx
                            → dashboard/sub/rooms/page.tsx
                            → dashboard/sub/rooms/new/page.tsx
                            → dashboard/sub/rooms/[id]/page.tsx
                            → dashboard/sub/bookings/page.tsx
                            → dashboard/sub/bookings/[reference]/page.tsx
```

### Day 6 Checklist
- [ ] Hotel admin can create a single room (selects room type from dropdown)
- [ ] Hotel admin can bulk create rooms (e.g. rooms 201–210 with same price/settings)
- [ ] Room list shows with all filter options working
- [ ] Availability calendar renders room × date grid
- [ ] Pricing rules CRUD works per room type
- [ ] Staff page: sub admin list, block/unblock, soft delete
- [ ] Create sub admin works — sub admin can then log in
- [ ] Hotel admin can view all bookings and manually change status
- [ ] Sub admin can create rooms and manage bookings (not room types, not staff)

---

## Day 7 — Public Pages + User Pages + Reservation Flow
**Goal: Full public browsing working. User profile + bookings. 10-min reservation flow end-to-end.**

### API routes to build

#### `GET /api/public/hotels`
```
No auth required.
Query params:
  q           (search hotel name OR city name)
  city_id     (filter by city)
  hotel_type_id
  check_in    (ISO date — required for availability filter)
  check_out   (ISO date)
  guests      (minimum max_occupancy filter)
  rooms       (number of rooms needed)
  min_price   (room_details.price filter)
  max_price
  stars       (hotel_details.star_rating)
  ac          (boolean)
  smoking_allowed (boolean)
  pet_allowed (boolean)
  bed_type_id
  page, limit

Logic:
  1. Base: hotels WHERE approval_status = PUBLISHED AND deleted_at IS NULL
  2. If q: WHERE name LIKE %q% OR city.name LIKE %q%
  3. If city_id / hotel_type_id / stars: direct filters
  4. If check_in + check_out: join room_details, exclude rooms with active tracker
  5. If ac/smoking/pet: filter on room_details booleans
  6. If bed_type_id: join room_bed_types
  7. Return hotels that have at least one matching available room
  8. Include: city name, hotel type, cover image, star_rating, lowest available price
```

#### `GET /api/public/hotels/[slug]`
```
No auth.
Returns:
  hotel + hotel_details + city + hotel_type
  hotel_images (sorted by sort_order)
  hotel_amenities with amenity details
  room_types (is_active=true):
    each with: bed types, amenities, type-level images
    base_price (display)
    available room count for requested dates (if check_in/check_out in query)
```

#### `GET /api/public/amenities`
```
Returns global amenities grouped by context (for search filter sidebar)
```

#### `GET /api/user/profile`
```
requireAuth(['END_USER'])
Returns: end_user + end_user_details + active profile image
```

#### `PATCH /api/user/profile`
```
Body: end_user fields + end_user_details fields
NID or passport required (Zod refine)
```

#### `GET /api/user/bookings`
```
requireAuth(['END_USER'])
Returns: user_bookings WHERE end_user_id = payload.actor_id
Includes: hotel name, room types booked, total price, status
```

#### `GET /api/user/bookings/[reference]`
```
Returns full booking detail including room_bookings + hotel info
```

#### `POST /api/bookings/reserve`
```
requireAuth(['END_USER'])
Body (Zod):
  { hotel_id, check_in, check_out, guests, rooms: [{ room_type_id, room_detail_id }] }

Logic:
  1. Validate hotel exists, is PUBLISHED
  2. For each room_detail:
     a. Verify room_detail.hotel_id (via room_type) = hotel_id
     b. Verify status = AVAILABLE
     c. Verify no room_tracker WHERE room_detail_id = X
        AND status IN ['RESERVED','BOOKED','CHECKED_IN']
        AND NOT (check_out <= check_in OR check_in >= check_out)
  3. For each room: resolve price
     - Check pricing_rules for overlapping date range → use rule price
     - Fallback: room_details.price
  4. Calculate nights = date diff check_out - check_in
  5. Calculate subtotal per room = price × nights
  6. Calculate total_price = sum of subtotals
  7. Calculate advance_amount = total_price × (advance_deposit_percent / 100)
  8. Generate booking_reference = generateRef()
  9. prisma.$transaction([
       INSERT user_bookings { status:RESERVED, reserved_until: addMinutes(now,10) }
       INSERT room_bookings[] (price snapshot)
       INSERT room_trackers[] (@@unique guard)
       UPDATE room_details SET status=UNAVAILABLE WHERE id IN [...]
     ])
  10. Return { booking_reference, reserved_until, total_price, advance_amount }
```

#### `PATCH /api/bookings/[reference]/expire`
```
requireAuth(['END_USER'])
Verify booking belongs to payload.actor_id
Sets: user_bookings.status = EXPIRED
      room_trackers.status = EXPIRED (for this booking_id)
      room_details.status = AVAILABLE (for rooms in this booking)
```

#### `PATCH /api/bookings/[reference]/cancel`
```
requireAuth(['END_USER', 'HOTEL_ADMIN', 'HOTEL_SUB_ADMIN', 'SYSTEM_ADMIN'])
Check cancellation policy for refund eligibility (to be shown, not processed yet)
Same state changes as expire
Sets status = CANCELLED
```

#### `POST /api/cron/expire-bookings`
```
Protected by CRON_SECRET header check (not JWT)
Finds: user_bookings WHERE status=RESERVED AND reserved_until < NOW()
For each:
  UPDATE user_bookings.status = EXPIRED
  UPDATE room_trackers.status = EXPIRED WHERE booking_id = X
  UPDATE room_details.status = AVAILABLE WHERE id IN booking's room_detail_ids
Returns: { expired_count: N }
```

### Pages to build
```
Index.tsx              → (public)/page.tsx
  HeroSection component (hero-search.tsx — search bar with city, dates, guests, rooms)
  DestinationsSection (city tiles — fetch from /api/public/cities)
  FeaturedHotels section
  NewsletterSection

ExploreHotels.tsx      → (public)/hotels/page.tsx
  Hotel cards in list/grid toggle
  Left: HotelFilterSidebar (price range, stars, hotel type, amenities, ac/smoking/pet)
  Right: hotel cards
  Pagination

HotelDetail.tsx        → (public)/hotels/[slug]/page.tsx
  Image gallery
  Hotel info + amenities
  Room type cards (each showing base_price, bed config, amenities, availability)
  "Reserve" button on each room type → selects specific available room_detail → triggers reserve

UserProfile.tsx        → (user)/profile/page.tsx
MyBookings.tsx         → (user)/bookings/page.tsx
UserSettings.tsx       → (user)/settings/page.tsx

                       → (user)/bookings/[reference]/page.tsx
  Booking detail: status badge, hotel info, rooms, price breakdown, cancel button

                       → (user)/bookings/[reference]/pay/page.tsx
  Booking summary (hotel, rooms, dates, price breakdown)
  10-min countdown timer component
  "Complete Payment" button (stub for Phase 12)
  On timer expiry: auto-fires PATCH /expire → shows "Expired" message + redirect

Destinations.tsx       → (public)/destinations/page.tsx
DestinationHotels.tsx  → (public)/destinations/[name]/page.tsx
Popular.tsx            → (public)/popular/page.tsx
SearchHotels.tsx       → (public)/search/page.tsx
```

### `src/components/booking/reservation-timer.tsx`
```typescript
'use client'
import { useEffect, useState } from 'react'

interface Props {
  expiresAt: string       // ISO datetime string
  onExpire: () => void    // called when timer hits 0
}

export function ReservationTimer({ expiresAt, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(diff)
      if (diff === 0) onExpire()
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpire])

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const isUrgent = secondsLeft < 120

  return (
    <div className={`text-2xl font-mono font-bold ${isUrgent ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
      {mm}:{ss}
    </div>
  )
}
```

### Day 7 Checklist
- [ ] Home page renders hero search, city tiles, featured hotels
- [ ] Hotel search with all filters returns correct results
- [ ] Hotel detail page shows images, amenities, room type cards
- [ ] Guest can browse freely — no login needed
- [ ] "Reserve" without login → redirected to `/login?callbackUrl=...` → after login returns to same page
- [ ] End user can create a reservation → 10-min hold created → redirected to `/pay` page
- [ ] Countdown timer counts down, turns red under 2 minutes
- [ ] Timer expiry: fires expire API → status EXPIRED → rooms freed
- [ ] Server-side cron correctly expires stuck RESERVED bookings
- [ ] User can view their bookings list and booking detail
- [ ] Cancel booking works for user + hotel staff
- [ ] User profile page loads and saves correctly

---

## Summary Table

| Day | API Routes | Pages | Components | Source (MERN) |
|---|---|---|---|---|
| 1 | 0 | 0 | 0 | — setup only |
| 2 | 6 | 4 pages + middleware | — | Login, Signup, AdminLogin, HotelAdminLogin |
| 3 | 0 | 7 shells + layouts | navbar, footer, 3 sidebars | AdminLayout, HotelAdminLayout |
| 4 | 12 | 7 pages | — | Admin hotel/user pages |
| 5 | 14 | 7 pages | — | HotelAdminHotelEdit, room type pages (new) |
| 6 | 18 | 13 pages | availability calendar | HotelAdminRooms, HotelAdminAddRoom etc. |
| 7 | 9 + cron | 10 pages | ReservationTimer, RoomSelector | Index, HotelDetail, MyBookings, UserProfile |
| **Total** | **59 + 1 cron** | **48 pages** | **8+ components** | |

---

## MERN → Next.js File Map (Complete)

```
MERN src/pages/Login.tsx                  → (auth)/login/page.tsx
MERN src/pages/Signup.tsx                 → (auth)/register/page.tsx
MERN src/pages/AdminLogin.tsx             → (auth)/admin-login/page.tsx
MERN src/pages/HotelAdminLogin.tsx        → (auth)/hotel-login/page.tsx
MERN src/pages/Index.tsx                  → (public)/page.tsx
MERN src/pages/HotelDetail.tsx            → (public)/hotels/[slug]/page.tsx
MERN src/pages/ExploreHotels.tsx          → (public)/hotels/page.tsx
MERN src/pages/SearchHotels.tsx           → (public)/search/page.tsx
MERN src/pages/Destinations.tsx           → (public)/destinations/page.tsx
MERN src/pages/DestinationHotels.tsx      → (public)/destinations/[name]/page.tsx
MERN src/pages/Popular.tsx                → (public)/popular/page.tsx
MERN src/pages/NotFound.tsx               → src/app/not-found.tsx
MERN src/pages/UserProfile.tsx            → (user)/profile/page.tsx
MERN src/pages/MyBookings.tsx             → (user)/bookings/page.tsx
MERN src/pages/UserSettings.tsx           → (user)/settings/page.tsx
MERN src/pages/AdminDashboardHome.tsx     → dashboard/system/page.tsx
MERN src/pages/AdminAddHotel.tsx          → dashboard/system/hotels/new/page.tsx
MERN src/pages/AdminCurrentHotels.tsx     → dashboard/system/hotels/page.tsx
MERN src/pages/AdminUpdateHotel.tsx       → dashboard/system/hotels/[id]/edit/page.tsx
MERN src/pages/AdminClientList.tsx        → dashboard/system/users/page.tsx
MERN src/pages/AdminClientProfile.tsx     → dashboard/system/users/[id]/page.tsx
MERN src/pages/AdminUpdateClient.tsx      → dashboard/system/users/[id]/edit/page.tsx
MERN src/pages/AdminClientHistory.tsx     → dashboard/system/users/[id]/history/page.tsx
MERN src/pages/AdminBookings.tsx          → dashboard/system/bookings/page.tsx
MERN src/pages/AdminBookingDetail.tsx     → dashboard/system/bookings/[id]/page.tsx
MERN src/pages/AdminAddSystemAdmin.tsx    → dashboard/system/admins/new/page.tsx
MERN src/pages/HotelAdminOverview.tsx     → dashboard/hotel/page.tsx
MERN src/pages/HotelAdminHotelEdit.tsx    → dashboard/hotel/details/page.tsx
MERN src/pages/HotelAdminRooms.tsx        → dashboard/hotel/rooms/page.tsx
MERN src/pages/HotelAdminAddRoom.tsx      → dashboard/hotel/rooms/new/page.tsx
MERN src/pages/HotelAdminEditRoom.tsx     → dashboard/hotel/rooms/[id]/page.tsx
MERN src/pages/HotelAdminReservations.tsx → dashboard/hotel/bookings/page.tsx
MERN src/pages/HotelAdminReservationDetail → dashboard/hotel/bookings/[reference]/page.tsx
MERN src/pages/HotelAdminAddSubAdmin.tsx  → dashboard/hotel/staff/new/page.tsx
MERN src/pages/HotelAdminGuestProfile.tsx → dashboard/hotel/guests/[id]/page.tsx
MERN src/pages/HotelAdminRevenue.tsx      → dashboard/hotel/revenue/page.tsx
MERN src/pages/HotelAdminSettings.tsx     → dashboard/hotel/settings/page.tsx

New pages (no MERN equivalent):
  dashboard/system/admins/page.tsx
  dashboard/system/cities/page.tsx
  dashboard/system/hotel-types/page.tsx
  dashboard/system/amenities/page.tsx
  dashboard/hotel/images/page.tsx
  dashboard/hotel/amenities/page.tsx
  dashboard/hotel/room-types/page.tsx         ← NEWLY ADDED (room type management)
  dashboard/hotel/room-types/new/page.tsx
  dashboard/hotel/room-types/[id]/page.tsx
  dashboard/hotel/room-types/[id]/images/page.tsx
  dashboard/hotel/availability/page.tsx
  dashboard/hotel/pricing/page.tsx
  dashboard/hotel/staff/page.tsx
  dashboard/sub/page.tsx
  dashboard/sub/rooms/page.tsx
  dashboard/sub/rooms/new/page.tsx
  dashboard/sub/rooms/[id]/page.tsx
  dashboard/sub/bookings/page.tsx
  dashboard/sub/bookings/[reference]/page.tsx
  (user)/bookings/[reference]/page.tsx
  (user)/bookings/[reference]/pay/page.tsx

MERN components:
  src/components/Navbar.tsx              → components/layout/navbar.tsx
  src/components/Footer.tsx             → components/layout/footer.tsx
  src/components/admin/AdminLayout.tsx  → components/layout/admin-layout.tsx
  src/components/hotel-admin/Layout.tsx → components/layout/hotel-admin-layout.tsx
  src/components/HeroSection.tsx        → components/home/hero-section.tsx
  src/components/DestinationsSection.tsx→ components/home/destinations-section.tsx
  src/components/FeaturedHotels.tsx     → components/home/featured-hotels.tsx
  src/components/NewsletterSection.tsx  → components/home/newsletter-section.tsx
  src/components/SearchBar.tsx          → components/search/search-bar.tsx
  src/components/HotelFilterSidebar.tsx → components/hotel/hotel-filter-sidebar.tsx
  src/components/FeaturedHotelCard.tsx  → components/hotel/hotel-card.tsx
  src/components/RoomDetailModal.tsx    → components/room/room-detail-modal.tsx
  src/components/BookingConfirmation.tsx→ components/booking/booking-confirmation.tsx
  src/components/NotificationPanel.tsx  → components/layout/notification-panel.tsx
  src/components/ui/*                   → components/ui/* (copy directly, no changes)
```
