# Hotel Booking System - Development Update

## Project Overview
A production-ready hotel booking web application for Bangladesh built with Next.js 15, TypeScript, Tailwind CSS, and MariaDB via Prisma 7.

---

## Completed: Day 1 & Day 2

### Day 1 — Foundation (Pre-existing Setup)

The user had already completed the foundational setup before I joined:

1. **Project Structure**
   - Next.js 15 with App Router
   - TypeScript, Tailwind CSS
   - `src/` directory structure

2. **Database Setup**
   - Prisma 7 with MariaDB adapter
   - Full database schema with all tables
   - Database migrated and tables created

3. **Core Library Files**
   - `src/lib/prisma.ts` — MariaDB adapter singleton
   - `src/lib/jwt.ts` — JWT sign/verify, token blacklist
   - `src/lib/auth-middleware.ts` — `requireAuth()` for protected routes
   - `src/lib/utils.ts` — `cn()`, `formatBDT()`, `slugify()`, `generateRef()`

---

### Day 2 — Authentication (Completed Today)

#### 1. Created Validation Schemas

**`src/lib/validations/auth.ts`**
```typescript
- loginSchema: { email, password }
- endUserRegisterSchema: { name, email, password }
```

**`src/lib/validations/hotel.ts`**
- createHotelSchema, updateHotelSchema for system admin

**`src/lib/validations/room-type.ts`**
- createRoomTypeSchema, updateRoomTypeSchema

**`src/lib/validations/room.ts`**
- createRoomSchema, bulkCreateRoomSchema, updateRoomSchema

**`src/lib/validations/booking.ts`**
- reserveBookingSchema, confirmBookingSchema, cancelBookingSchema

#### 2. Created Constants File

**`src/lib/constants.ts`**
- MAX_LOGIN_ATTEMPTS = 5
- LOCK_DURATION_MINUTES = 15
- TOKEN_MAX_AGE = 604800 (7 days)
- RESERVATION_TIMEOUT_MINUTES = 10
- Upload directory paths
- API response helpers
- ROLE_ROUTES and LOGIN_ROUTES mappings

#### 3. Created Upload Utility

**`src/lib/upload.ts`**
- Multer storage configuration
- File filter for images (JPEG, PNG, WebP, GIF)
- Sharp image processing functions
- Thumbnail generation

#### 4. Created Auth API Routes

| Endpoint | File | Functionality |
|----------|------|---------------|
| `POST /api/auth/end-user/register` | `src/app/api/auth/end-user/register/route.ts` | End user registration with bcrypt password hashing |
| `POST /api/auth/end-user/login` | `src/app/api/auth/end-user/login/route.ts` | End user login with login attempt tracking, locking |
| `POST /api/auth/system-admin/login` | `src/app/api/auth/system-admin/login/route.ts` | System admin login |
| `POST /api/auth/hotel/login` | `src/app/api/auth/hotel/login/route.ts` | Hotel admin + sub-admin login (checks both tables) |
| `POST /api/auth/logout` | `src/app/api/auth/logout/route.ts` | Logout + token blacklist |
| `GET /api/auth/me` | `src/app/api/auth/me/route.ts` | Get current user info by actor_type |

**Key Features Implemented:**
- Zod validation for all inputs
- Password bcrypt hashing (cost factor 10)
- Login attempt tracking (max 5 attempts)
- Account locking (15 minutes) after max attempts
- Blocked/inactive account checks
- HttpOnly cookie token (7 days, SameSite=Lax)
- Token blacklist on logout

#### 5. Created Auth Pages

| Page | File | Functionality |
|------|------|---------------|
| End User Login | `src/app/(auth)/login/page.tsx` | Login with callbackUrl support |
| End User Register | `src/app/(auth)/register/page.tsx` | Registration form |
| System Admin Login | `src/app/(auth)/admin-login/page.tsx` | → `/dashboard/system` |
| Hotel Admin Login | `src/app/(auth)/hotel-login/page.tsx` | Role-based redirect |

**Key Features:**
- `'use client'` for client-side interactivity
- Next.js navigation (`useRouter`, `useSearchParams`)
- `credentials: 'include'` for fetch requests
- LocalStorage for UI hints only (not security)
- Error display with proper styling
- Loading states on forms

#### 6. Middleware Protection

**`src/middleware.ts`**
```typescript
- Role-based route protection:
  /dashboard/system → SYSTEM_ADMIN
  /dashboard/hotel → HOTEL_ADMIN
  /dashboard/sub → HOTEL_SUB_ADMIN
  /profile → END_USER
  /bookings → END_USER

- Automatic redirect to appropriate login page
- callbackUrl preservation for post-login redirect
```

#### 7. Installed shadcn/ui Components

Installed 28 components:
- button, input, label, card, badge, table
- dialog, sheet, select, textarea, checkbox
- switch, radio-group, slider, dropdown-menu
- popover, calendar, sonner, tooltip
- avatar, separator, skeleton, progress
- tabs, accordion, alert, form
- breadcrumb, pagination, scroll-area

#### 8. Created Upload Directories

```
public/uploads/hotels
public/uploads/rooms/types
public/uploads/rooms/units
public/uploads/staff/sys-admin
public/uploads/staff/hotel-admin
public/uploads/staff/sub-admin
public/uploads/users
public/uploads/cities
```

---

## Technical Details

### Authentication Flow
1. User submits credentials → API validates with Zod
2. Password compared with bcrypt
3. Login attempts tracked, account locked if exceeded
4. JWT token generated with payload:
   ```typescript
   { actor_id, actor_type, hotel_id?, iat, exp }
   ```
5. Token set as HttpOnly cookie (not localStorage)
6. Client redirected based on role

### Token Blacklist
- On logout, token hash stored in `blacklisted_tokens` table
- `requireAuth()` checks blacklist on every protected request
- Middleware does NOT check (edge-compatible)

### Error Handling
- All APIs return consistent format:
  ```typescript
  { success: true, data: {...} }
  { success: false, message: "error message" }
  ```

---

## What's Ready to Test

1. **End User Flow:** `/register` → `/login` → cookie set → home
2. **System Admin:** `/admin-login` → `/dashboard/system`
3. **Hotel Admin:** `/hotel-login` → `/dashboard/hotel`
4. **Hotel Sub-Admin:** `/hotel-login` → `/dashboard/sub`
5. **Logout:** Clears cookie, blacklists token
6. **Route Protection:** Unauthenticated users redirected to login

---

## Notes

- Prisma schema and prisma.ts kept as-is (user's working configuration)
- Zod v4 API used (`error.issues` instead of `error.errors`)
- JWT stored as HttpOnly cookie (more secure than localStorage)
- All four actor types supported: SYSTEM_ADMIN, HOTEL_ADMIN, HOTEL_SUB_ADMIN, END_USER