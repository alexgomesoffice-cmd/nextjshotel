# StayVista — V1 Audit Results + V2 Instructions
**For VS Code Claude. Read entirely before touching any file.**

---

## PART A — V1 AUDIT: WHAT WAS DONE CORRECTLY

These are confirmed correct. Do NOT touch them.

| ✅ Done | File |
|---------|------|
| `force-dynamic` export | `src/app/(public)/hotels/[slug]/page.tsx` |
| `buildRoomDetailWhere()` with room_trackers filter | `src/app/(public)/hotels/[slug]/page.tsx` |
| Reserve route uses `room.price` not `base_price` for total | `src/app/api/bookings/reserve/route.ts` |
| NID/passport gate in booking-client | `src/app/(public)/bookings/new/booking-client.tsx` |
| Redirects to `/bookings/{ref}` on success | `src/app/(public)/bookings/new/booking-client.tsx` |
| User profile shown on review page | `src/app/(public)/bookings/new/booking-client.tsx` |
| `ReservationTimer` component built | `src/components/booking/reservation-timer.tsx` |
| Timer shown on single booking detail page | `src/app/(user)/bookings/[reference]/page.tsx` |
| `hotel-card.tsx` passes dates in href | `src/components/hotel/hotel-card.tsx` |
| Search page threads dates to HotelCard | `src/app/(public)/search/page.tsx` |
| Hotels page threads dates to HotelCard | `src/app/(public)/hotels/page.tsx` |
| DateRange single picker in booking-sidebar | `src/components/room/booking-sidebar.tsx` |
| Guests stepper in booking-sidebar | `src/components/room/booking-sidebar.tsx` |
| `onDatesChange` callback wired | `src/components/room/hotel-detail-client.tsx` |
| Date-change warning banner | `src/components/room/hotel-detail-client.tsx` |
| Reserve API: room_trackers overlap check | `src/app/api/bookings/reserve/route.ts` |

---

## PART B — V1 AUDIT: WHAT IS STILL WRONG

Fix these in the exact order listed below.

---

### WRONG 1 — Profile link goes to `/profile` — route does not exist
**File:** `src/app/(public)/bookings/new/booking-client.tsx`
**Line 125:** `href="/profile"`

`/profile` is not a valid route in this project. The user profile page is at `/user/profile`.

**Fix — change line 125 from:**
```tsx
href="/profile"
```
**To:**
```tsx
href="/user/profile"
```
That is the only change needed in this file.

---

### WRONG 2 — Guest mismatch rooms are FILTERED OUT (hidden) instead of DISABLED
**File:** `src/components/room/hotel-detail-client.tsx`
**Lines 111-113:**
```ts
if (sidebarGuests > 1) {
  types = types.filter(rt => rt.max_occupancy >= sidebarGuests);
}
```

This removes room types from the list entirely. The requirement is:
> "dont make them disappear, if they dont match, then they shouldnt be clickable, with proper reason given to the ui"

**Fix — change the `filteredRoomTypes` useMemo:** Remove the guest occupancy filter entirely from `filteredRoomTypes`. Instead, pass ALL room types to `RoomsSectionClient` and let each card know if it's mismatched.

Replace lines 100–114 with:
```ts
// Only filter by AC — never hide rooms due to guest count
const filteredRoomTypes = useMemo(() => {
  if (acFilter === 'all') return roomTypes;
  return roomTypes.filter(rt =>
    rt.room_variants.some(v =>
      acFilter === 'ac' ? v.ac : !v.ac
    )
  );
}, [roomTypes, acFilter]);
```

Then pass `sidebarGuests` to `RoomsSectionClient`:
```tsx
<RoomsSectionClient
  roomTypes={filteredRoomTypes}
  quantities={quantities}
  onQuantityChange={handleQuantityChange}
  guests={sidebarGuests}    // ← ADD THIS LINE
/>
```

---

### WRONG 3 — `RoomsSectionClient` does not receive or use `guests`
**File:** `src/components/room/rooms-section-client.tsx`

The component has no `guests` prop and never computes guest mismatch.

**Fix — add `guests` prop and compute mismatch per card:**

**Step 1:** Add `guests` to the props interface:
```ts
interface RoomsSectionClientProps {
  roomTypes: RoomType[];
  quantities: Record<number, number>;
  onQuantityChange: (variantId: number, qty: number, roomTypeId: number) => void;
  guests?: number;    // ← ADD
}
```

**Step 2:** Add it to the destructured parameters:
```ts
export default function RoomsSectionClient({
  roomTypes,
  quantities,
  onQuantityChange,
  guests = 1,    // ← ADD
}: RoomsSectionClientProps) {
```

**Step 3:** Inside the `.map()` that renders each `RoomTypeCard`, compute:
```ts
roomTypes.map((roomType) => {
  const isGuestMismatch = guests > 1 && roomType.max_occupancy < guests;
  const guestMismatchReason = isGuestMismatch
    ? `This room fits up to ${roomType.max_occupancy} guest${roomType.max_occupancy !== 1 ? 's' : ''}. Your search needs ${guests}.`
    : undefined;

  return (
    <RoomTypeCard
      key={roomType.id}
      {...roomTypeProps}
      isGuestMismatch={isGuestMismatch}
      guestMismatchReason={guestMismatchReason}
    />
  );
})
```

---

### WRONG 4 — `RoomTypeCard` has no `isGuestMismatch` or `guestMismatchReason` props
**File:** `src/components/room/room-type-card.tsx`

The card does not receive or use mismatch info. The +/- steppers are always active.

**Fix — add props and apply visual disabled state:**

**Step 1:** Add to the props interface:
```ts
isGuestMismatch?: boolean;
guestMismatchReason?: string;
```

**Step 2:** Destructure in the function signature.

**Step 3:** Apply grey overlay to the whole card when mismatched. Find the outermost `<div>` of the card and add to its `className`:
```tsx
className={cn(
  "rounded-2xl border overflow-hidden transition-all duration-200",
  isGuestMismatch
    ? "opacity-60 border-border/30"
    : hasSelection
      ? "border-primary/60 shadow-sm shadow-primary/10"
      : "border-border/50 hover:border-border"
)}
```

**Step 4:** Inside the expanded section where the VariantRow renders, replace the `+/-` stepper with a reason message when mismatched:

Find the VariantRow component (or wherever the `+` and `−` buttons are inside the expanded area). Wrap the stepper:
```tsx
{isGuestMismatch ? (
  <div className="text-xs text-muted-foreground bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 max-w-45 text-right">
    {guestMismatchReason}
  </div>
) : (
  // existing + / - stepper JSX
)}
```

**Step 5:** Also block the `onSelect`/`onQuantityChange` call when mismatched. In the collapsed header row click handler:
```tsx
onClick={() => {
  if (!isGuestMismatch) setIsExpanded(!isExpanded);
}}
```
This prevents the card from even expanding if the guest count doesn't match.

---

### WRONG 5 — Cron job file is 0 bytes
**File:** `src/app/api/cron/expire-bookings/route.ts`

This is completely empty. This is the most important background task — it expires RESERVED bookings that weren't confirmed within 5 minutes (changed from 10 per your instruction).

**Fix — replace the entire file with:**

```ts
// filepath: src/app/api/cron/expire-bookings/route.ts
// Called by Vercel Cron (or any cron scheduler) every minute.
// Finds all RESERVED bookings whose reserved_until has passed and marks them EXPIRED.
// Also releases the room_trackers for those bookings.
// Protected by CRON_SECRET env var.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all RESERVED bookings that have passed their reserved_until time
    const expiredBookings = await prisma.user_bookings.findMany({
      where: {
        status: 'RESERVED',
        reserved_until: { lt: now },
      },
      select: { id: true, booking_reference: true },
    });

    if (expiredBookings.length === 0) {
      return NextResponse.json({ success: true, expired: 0, message: 'Nothing to expire' });
    }

    const expiredIds = expiredBookings.map((b) => b.id);

    // Run in a transaction: update booking status + update room_trackers
    await prisma.$transaction([
      // 1. Mark bookings as EXPIRED
      prisma.user_bookings.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: 'EXPIRED' },
      }),
      // 2. Release the room_trackers (set status to EXPIRED so rooms become available)
      prisma.room_trackers.updateMany({
        where: {
          booking_id: { in: expiredIds },
          status: 'RESERVED',
        },
        data: { status: 'EXPIRED' },
      }),
    ]);

    console.log(`[Cron] Expired ${expiredBookings.length} bookings:`, expiredBookings.map(b => b.booking_reference));

    return NextResponse.json({
      success: true,
      expired: expiredBookings.length,
      references: expiredBookings.map((b) => b.booking_reference),
    });
  } catch (error: any) {
    console.error('[Cron] expire-bookings error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
```

---

### WRONG 6 — `expire/route.ts` is 0 bytes
**File:** `src/app/api/bookings/[reference]/expire/route.ts`

This is called by the client-side timer when it hits 0 (optional but important for immediate expiry when user is watching).

**Fix — replace the entire file with:**

```ts
// filepath: src/app/api/bookings/[reference]/expire/route.ts
// Called by the client (ReservationTimer) when countdown hits 0.
// Also called by the cron job indirectly.
// Marks a RESERVED booking as EXPIRED and releases room_trackers.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

type Params = { params: Promise<{ reference: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { payload, error } = await requireAuth(req, ['END_USER']);
  if (error) return error;

  try {
    const { reference } = await params;

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: { id: true, status: true, end_user_id: true, reserved_until: true },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    // Security: only the owner can expire their own booking
    if (booking.end_user_id !== payload.actor_id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
    }

    if (booking.status !== 'RESERVED') {
      return NextResponse.json(
        { success: false, message: `Cannot expire a booking with status: ${booking.status}` },
        { status: 400 }
      );
    }

    // Update booking + release trackers in one transaction
    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: 'EXPIRED' },
      }),
      prisma.room_trackers.updateMany({
        where: { booking_id: booking.id, status: 'RESERVED' },
        data: { status: 'EXPIRED' },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Booking expired' });
  } catch (error: any) {
    console.error('expire booking error:', error);
    return NextResponse.json({ success: false, message: 'Failed to expire booking' }, { status: 500 });
  }
}
```

---

### WRONG 7 — `confirm/route.ts` is 0 bytes
**File:** `src/app/api/bookings/[reference]/confirm/route.ts`

This should upgrade a RESERVED booking to BOOKED (payment confirmed / hotel staff confirmed).

**Fix — replace the entire file with:**

```ts
// filepath: src/app/api/bookings/[reference]/confirm/route.ts
// PATCH: Upgrade booking from RESERVED → BOOKED.
// Called when payment is confirmed or hotel manually confirms.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-middleware';

type Params = { params: Promise<{ reference: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  // Both END_USER (self-confirm) and HOTEL_ADMIN/SUB (manual confirm) can call this
  const { payload, error } = await requireAuth(req, ['END_USER', 'HOTEL_ADMIN', 'HOTEL_SUB_ADMIN']);
  if (error) return error;

  try {
    const { reference } = await params;

    const booking = await prisma.user_bookings.findUnique({
      where: { booking_reference: reference },
      select: { id: true, status: true, end_user_id: true, reserved_until: true },
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'RESERVED') {
      return NextResponse.json(
        { success: false, message: `Booking is already ${booking.status}` },
        { status: 400 }
      );
    }

    // Check reservation hasn't expired
    if (booking.reserved_until && new Date(booking.reserved_until) < new Date()) {
      // Auto-expire it
      await prisma.$transaction([
        prisma.user_bookings.update({ where: { id: booking.id }, data: { status: 'EXPIRED' } }),
        prisma.room_trackers.updateMany({
          where: { booking_id: booking.id, status: 'RESERVED' },
          data: { status: 'EXPIRED' },
        }),
      ]);
      return NextResponse.json(
        { success: false, message: 'Reservation has expired. Please book again.' },
        { status: 409 }
      );
    }

    // Confirm: RESERVED → BOOKED, update room_trackers status
    await prisma.$transaction([
      prisma.user_bookings.update({
        where: { id: booking.id },
        data: { status: 'BOOKED', reserved_until: null },
      }),
      prisma.room_trackers.updateMany({
        where: { booking_id: booking.id, status: 'RESERVED' },
        data: { status: 'BOOKED' },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Booking confirmed' });
  } catch (error: any) {
    console.error('confirm booking error:', error);
    return NextResponse.json({ success: false, message: 'Failed to confirm booking' }, { status: 500 });
  }
}
```

---

### WRONG 8 — Reservation timer is set to 10 minutes — must be 5
**File:** `src/app/api/bookings/reserve/route.ts`
**Line 120:** `reservedUntil.setMinutes(reservedUntil.getMinutes() + 10); // Hold for 10 minutes`

**Fix — change line 120 from:**
```ts
reservedUntil.setMinutes(reservedUntil.getMinutes() + 10); // Hold for 10 minutes
```
**To:**
```ts
reservedUntil.setMinutes(reservedUntil.getMinutes() + 5); // Hold for 5 minutes
```
That is the only change in this file.

---

### WRONG 9 — ReservationTimer is NOT shown on the bookings LIST page
**File:** `src/app/(user)/bookings/page.tsx`

The timer shows on the individual booking detail page (`/bookings/[reference]`). But per your requirement:
> "the user should see the countdown on the single booking container as he can have multiple reservations"

This means the timer must ALSO appear on each booking card in the `/bookings` list, inside the card for that specific RESERVED booking.

The `Booking` interface in this file already has `reserved_until: string | null`. The `STATUS_CONFIG` already has `RESERVED`.

**Fix — three changes in `src/app/(user)/bookings/page.tsx`:**

**Step 1:** Add import at the top of the file:
```ts
import ReservationTimer from '@/components/booking/reservation-timer';
```

**Step 2:** Find the booking card JSX — specifically the section where the status badge renders for each booking. It should be inside the `.map()` that renders each booking. After the status badge (or wherever the top of each card's content area is), add:

```tsx
{/* Show countdown timer for RESERVED bookings with active reserved_until */}
{booking.status === 'RESERVED' && booking.reserved_until && new Date(booking.reserved_until) > new Date() && (
  <div className="mt-3">
    <ReservationTimer reservedUntil={booking.reserved_until} />
  </div>
)}
```

Place this INSIDE each booking card, directly below the status badge row or hotel name row — wherever the card's body begins. This way each card independently shows its own timer if that specific booking is RESERVED and still within the window.

---

## PART C — V2 FOLDER RESTRUCTURE (Do After All Above Fixes)

This is the folder convention from v2 of the audit. The AI created files in the wrong folders. Fix the structure after the bugs above are resolved.

### The Problem

Currently in `src/components/room/` there are two files that do NOT belong there:
- `hotel-detail-client.tsx` — this is a booking flow orchestration component, not a pure room display component
- `booking-sidebar.tsx` — this is explicitly a booking flow component

The `src/components/booking/` folder should have:
- `room-selector.tsx` ← renamed/moved from `hotel-detail-client.tsx`
- `booking-sidebar.tsx` ← moved from `room/`
- `booking-confirmation.tsx` ← still needs to be created
- `reservation-timer.tsx` ← already correct ✅

### Exact Steps

**Step 1: Create `src/components/booking/room-selector.tsx`**
Copy the ENTIRE contents of `src/components/room/hotel-detail-client.tsx` into this new file.
At the top, update the two imports:
```ts
// Change this:
import RoomsSectionClient, { type RoomType } from "@/components/room/rooms-section-client";
import BookingSidebar, { type SelectedVariant } from "@/components/room/booking-sidebar";

// To this:
import RoomsSectionClient, { type RoomType } from "@/components/room/rooms-section-client";
import BookingSidebar, { type SelectedVariant } from "@/components/booking/booking-sidebar";
```
Change the export name:
```ts
// Change:
export default function HotelDetailClient(...) {
// To:
export default function RoomSelector(...) {
```
Everything else in the file stays identical.

**Step 2: Move `src/components/room/booking-sidebar.tsx`**
Copy the ENTIRE contents of `src/components/room/booking-sidebar.tsx` into `src/components/booking/booking-sidebar.tsx` (create this file).
Do not change any code inside it.
After confirming the new file works, delete `src/components/room/booking-sidebar.tsx`.

**Step 3: Update `src/app/(public)/hotels/[slug]/page.tsx`**
```ts
// Change:
import HotelDetailClient from "@/components/room/hotel-detail-client";
// To:
import RoomSelector from "@/components/booking/room-selector";

// Change JSX:
<HotelDetailClient .../>
// To:
<RoomSelector .../>
```
Props stay exactly the same. Only the import path and component name change.

**Step 4: Delete `src/components/room/hotel-detail-client.tsx`**
After confirming `room-selector.tsx` works and hotel detail page renders correctly, delete this file.

**Step 5: Create `src/components/booking/booking-confirmation.tsx`**
This is the booking detail view used on `/bookings/[reference]/page.tsx`.
Currently that page renders the full detail inline as a client component. The requirement is to extract this into `booking-confirmation.tsx`.

The current `/bookings/[reference]/page.tsx` is a client component with all the UI inside it. Move all JSX below the status loading check into `booking-confirmation.tsx`:

```tsx
// filepath: src/components/booking/booking-confirmation.tsx
'use client';

// Takes a fully-loaded booking object and renders the detail view.
// Includes: ReservationTimer (if RESERVED), hotel info, dates, room breakdown, price total, special request.
// Props: exactly the Booking interface already defined in /bookings/[reference]/page.tsx

import ReservationTimer from '@/components/booking/reservation-timer';
// ... all other imports from that page

interface BookingConfirmationProps {
  booking: Booking; // use the same Booking interface defined in the page
}

export default function BookingConfirmation({ booking }: BookingConfirmationProps) {
  // Move ALL the JSX that's currently in BookingDetailPage (after the loading/error guards)
  // into here. The page becomes a thin wrapper:
  //
  // if (loading) return <spinner>
  // if (error) return <error state>
  // return <BookingConfirmation booking={booking} />
}
```

Then in `/bookings/[reference]/page.tsx`:
```tsx
import BookingConfirmation from '@/components/booking/booking-confirmation';
// ...
// After data loads:
return <BookingConfirmation booking={booking} />;
```

---

## PART D — VERCEL CRON CONFIGURATION

The cron job in `src/app/api/cron/expire-bookings/route.ts` (filled in WRONG 5 above) must be scheduled. Add this to `vercel.json` in the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "* * * * *"
    }
  ]
}
```

`"* * * * *"` = runs every minute. This ensures no reservation stays beyond 5 minutes past expiry.

For local development, since Vercel Cron doesn't run locally, test by calling the endpoint manually:
```bash
curl http://localhost:3000/api/cron/expire-bookings
```

Add `CRON_SECRET` to `.env`:
```env
CRON_SECRET="generate_with: openssl rand -base64 32"
```

In production (Vercel), add the same `CRON_SECRET` as an environment variable in the Vercel dashboard. Vercel automatically passes `Authorization: Bearer {CRON_SECRET}` to cron endpoints.

---

## PART E — COMPLETE FIX ORDER

Execute exactly in this sequence:

```
1.  booking-client.tsx line 125: /profile → /user/profile
2.  reserve/route.ts line 120: +10 minutes → +5 minutes
3.  hotel-detail-client.tsx: remove guest filter from filteredRoomTypes, pass guests to RoomsSectionClient
4.  rooms-section-client.tsx: add guests prop, compute isGuestMismatch per card
5.  room-type-card.tsx: add isGuestMismatch + guestMismatchReason props, grey card, disable expand + steppers
6.  cron/expire-bookings/route.ts: fill with full implementation (WRONG 5)
7.  bookings/[reference]/expire/route.ts: fill with full implementation (WRONG 6)
8.  bookings/[reference]/confirm/route.ts: fill with full implementation (WRONG 7)
9.  bookings/page.tsx: import ReservationTimer, add timer inside RESERVED booking cards
10. booking/ folder restructure:
    a. Create booking/room-selector.tsx (copy from room/hotel-detail-client.tsx, update imports + name)
    b. Create booking/booking-sidebar.tsx (copy from room/booking-sidebar.tsx)
    c. Update hotels/[slug]/page.tsx imports
    d. Delete room/hotel-detail-client.tsx
    e. Delete room/booking-sidebar.tsx
    f. Create booking/booking-confirmation.tsx (extract from bookings/[reference]/page.tsx)
11. Create vercel.json with cron config
```

---

## PART F — DO NOT TOUCH (Working Correctly)

```
src/components/booking/reservation-timer.tsx           ✅ DO NOT TOUCH
src/components/room/room-type-card.tsx                 ✅ only add mismatch props (step 5)
src/components/room/room-detail-modal.tsx              ✅ DO NOT TOUCH
src/components/room/rooms-section-client.tsx           ✅ only add guests prop (step 4)
src/app/(public)/hotels/[slug]/page.tsx                ✅ only update import (step 10c)
src/app/api/bookings/reserve/route.ts                  ✅ only change +10 to +5 (step 2)
src/app/(public)/bookings/new/booking-client.tsx       ✅ only fix profile href (step 1)
src/app/(user)/bookings/[reference]/page.tsx           ✅ only refactor into component (step 10f)
All auth routes                                        ✅ DO NOT TOUCH
All admin dashboard routes                             ✅ DO NOT TOUCH
All search components                                  ✅ DO NOT TOUCH
src/middleware.ts                                      ✅ DO NOT TOUCH
src/lib/jwt.ts                                         ✅ DO NOT TOUCH
```
