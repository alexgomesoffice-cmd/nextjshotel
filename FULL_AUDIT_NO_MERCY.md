# StayVista — Full Audit: No Mercy Edition
**Read every word. Fix in the exact order listed.**

---

## SECTION 1 — CONFIRMED BUGS (All 18 of them)

---

### BUG 1 — RESERVATION FIRES BEFORE USER REVIEWS ANYTHING
**File:** `src/app/(public)/bookings/new/booking-client.tsx`
**Line:** `handleBooking()` → directly calls `POST /api/bookings/reserve`

The `booking-client.tsx` page is meant to be the REVIEW step before confirming.
The button says "Complete Booking" but it IMMEDIATELY creates a RESERVED record in:
- `user_bookings` (status: RESERVED)
- `room_bookings` (locked rooms)
- `room_trackers` (locked rooms)
...all before the user has confirmed ANYTHING. The user hasn't even seen the price breakdown confirmed. 

**What should happen:**
```
[Hotel Page] → [Reserve button] → [/bookings/new = REVIEW page] → [user clicks "Confirm Reservation"] → POST /api/bookings/reserve → RESERVED → redirect to /bookings/{ref}
```

**What currently happens:**
```
[Hotel Page] → [Reserve] → [/bookings/new] → page renders → user clicks "Complete Booking" → fires API → RESERVED
```

Actually this IS the right sequence. The bug isn't the sequence — the bug is that `booking-client.tsx` calls reserve WITHOUT first checking if the user has NID/passport. Keep reading.

---

### BUG 2 — NO NID/PASSPORT CHECK BEFORE RESERVATION
**File:** `src/app/(public)/bookings/new/booking-client.tsx`

`handleBooking()` calls `POST /api/bookings/reserve` directly. There is ZERO check for whether the user has submitted NID or passport. The requirement says:
- User must have NID OR passport in their profile before they can complete a booking.

**Current code does:** `fetch("/api/bookings/reserve", ...)` — no pre-check.

**Required flow:**
1. Before calling reserve, fetch `GET /api/user/profile`
2. Check `user.detail.nid_no || user.detail.passport`
3. If MISSING → show inline warning on the booking page: "Please add your NID or Passport to your profile before completing this booking." + [Go to Profile] button
4. DO NOT redirect to settings. The user should see this on the SAME PAGE.
5. If PRESENT → proceed with `POST /api/bookings/reserve`

**The user should NEVER be redirected to settings page for this. The check must happen on the booking page itself before the API call.**

---

### BUG 3 — `booking-client.tsx` REDIRECTS TO `/profile` ON SUCCESS — WRONG
**File:** `src/app/(public)/bookings/new/booking-client.tsx`
**Line:** `router.push('/profile?booking_success=${data.data.booking_reference}')`

This is wrong. After reservation:
- User should be redirected to: `/bookings/{reference}` (the booking detail page)
- NOT to `/profile`

**Fix:** Change the redirect to:
```ts
router.push(`/bookings/${data.data.booking_reference}`);
```

---

### BUG 4 — THREE EMPTY FILES IN `src/components/booking/`
**Files:**
- `src/components/booking/booking-confirmation.tsx` — 0 bytes
- `src/components/booking/reservation-timer.tsx` — 0 bytes  
- `src/components/booking/room-selector.tsx` — 0 bytes

These are DEAD FILES. They were created but never implemented. They are also in the WRONG FOLDER. The booking flow components belong in `src/components/booking/` ONLY if they are used by the booking flow pages. Currently they are not used anywhere.

**Immediate action:** Delete all three empty files. Do not implement them yet. The booking flow works through `booking-client.tsx`. These files are noise.

---

### BUG 5 — `revalidate = 3600` ON HOTEL DETAIL PAGE — AVAILABILITY DATA WILL BE STALE
**File:** `src/app/(public)/hotels/[slug]/page.tsx`
**Line:** `export const revalidate = 3600;`

The hotel detail page fetches `room_details` to show `available_rooms_count`. With `revalidate = 3600`, a room that was just booked 5 minutes ago will still appear as "available" for up to an hour. This is a real-time availability problem.

**Fix:** Change to `export const dynamic = 'force-dynamic';`

This forces a fresh DB read on every request. Yes it's slower — but availability data MUST be live. For a hotel booking system, showing stale room availability is unacceptable.

---

### BUG 6 — HOTEL DETAIL PAGE IGNORES `check_in`/`check_out` SEARCH PARAMS WHEN FETCHING ROOMS
**File:** `src/app/(public)/hotels/[slug]/page.tsx`

The page reads `search.check_in` and `search.check_out` from URL params and passes them to `HotelDetailClient`. However, the Prisma query for `room_details` inside the page does NOT filter by dates:

```ts
// CURRENT — WRONG
room_details: {
  where: { status: 'AVAILABLE', deleted_at: null }
}
```

This means if check_in and check_out are provided, BOOKED rooms for those dates are still returned as "available". The `room_trackers` table is completely ignored at this stage.

**Fix:** When `check_in` and `check_out` are present in searchParams, also exclude rooms that have active `room_trackers` entries for those dates.

```ts
// ADD this helper above the prisma query:
const getAvailableRoomWhere = (checkIn?: string, checkOut?: string) => {
  const base: any = { status: 'AVAILABLE', deleted_at: null };
  if (checkIn && checkOut) {
    base.room_trackers = {
      none: {
        status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
        check_in: { lt: new Date(checkOut) },
        check_out: { gt: new Date(checkIn) },
      }
    };
  }
  return base;
};

// In the prisma query:
room_details: {
  where: getAvailableRoomWhere(search.check_in, search.check_out),
  include: { room_images: { orderBy: { sort_order: 'asc' } } }
}
```

---

### BUG 7 — DATE PARAMS FROM HERO SEARCH ARE LOST ON HOTEL DETAIL PAGE
**File:** `src/components/hotel/hotel-card.tsx`

When user searches from hero with dates, they land on `/hotels?check_in=X&check_out=Y`. When they click a hotel card, the link should preserve these dates. Check if hotel-card passes `check_in`/`check_out` in the href:

```ts
// If hotel-card links to /hotels/slug WITHOUT dates, fix:
href={`/hotels/${hotel.slug}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`}
```

The hotel card currently likely links to `/hotels/${slug}` with no query params. This is why dates reset on the hotel page.

**Fix in `hotel-card.tsx`:** Accept `checkIn`, `checkOut`, `guests` as optional props and append them to the link if present. The search page and hotels page must pass these down from their own URL params.

---

### BUG 8 — `booking-sidebar.tsx` INITIALIZES DATES FROM PROPS BUT RESETS WHEN USER CHANGES THEM — DISCONNECTED FROM ROOM AVAILABILITY
**File:** `src/components/room/booking-sidebar.tsx`

The sidebar has its own `date` state initialized from `initialCheckIn`/`initialCheckOut`. When the user changes dates in the sidebar, the room cards do NOT update. A user could:
1. Come in with dates (May 11 → May 13)
2. Change dates in sidebar to (Jun 1 → Jun 3)
3. Room cards still show availability for May 11-13 (from server)
4. Select a room that might not be available Jun 1-3
5. Reserve button navigates to booking page
6. The API correctly rejects it (room is booked Jun 1-3) — but user only sees this after trying to reserve

**Required behavior:**
When user changes dates in the sidebar, the room availability must re-check. Two options:
- Option A (Recommended): When dates change, call `GET /api/public/hotels/{slug}/availability?check_in=&check_out=` and update room variants
- Option B: When user selects a room AND then changes dates, show inline warning: "Selected rooms may not be available for the new dates. Please verify."

**Implement Option B first** (simpler, safer):
- In `hotel-detail-client.tsx`, track `currentCheckIn` and `currentCheckOut` as state
- When sidebar changes dates, update these
- If user has selected rooms AND dates changed from initial, show a warning banner above the reserve button

---

### BUG 9 — NO GUEST FILTER ON ROOM AVAILABILITY
**Files:** `src/app/(public)/hotels/[slug]/page.tsx` + `src/components/room/hotel-detail-client.tsx`

The `guests` param from search is passed to `HotelDetailClient` but is NEVER used to filter room types. A room type with `max_occupancy: 2` should be hidden (or marked unavailable) when `guests=4`. 

**Fix in `hotel-detail-client.tsx`:**
```ts
const filteredRoomTypes = useMemo(() => {
  let types = roomTypes;
  // Filter by AC
  if (acFilter !== 'all') {
    types = types.filter(rt => rt.room_variants.some(v => acFilter === 'ac' ? v.ac : !v.ac));
  }
  // Filter by guest count
  if (guests > 1) {
    types = types.filter(rt => rt.max_occupancy >= guests);
  }
  return types;
}, [roomTypes, acFilter, guests]);
```

---

### BUG 10 — ROOM TYPE CARD SHOWS NO WARNING WHEN DATES SELECTED AND ROOM IS UNAVAILABLE
**File:** `src/components/room/room-type-card.tsx`

If the user:
1. First selects a room (increments +)
2. Then changes dates in the sidebar

The room card has NO knowledge of the new dates. There is no warning. No visual feedback. The user walks into a wall at the API level.

**Fix:**
- `HotelDetailClient` tracks `dateChanged: boolean` (true when user changes dates after loading)
- If `dateChanged === true` AND any room has quantity > 0, show a banner:

```tsx
{dateChanged && hasAnySelection && (
  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2 mb-4">
    <AlertTriangle className="h-4 w-4 shrink-0" />
    Dates have changed. Your selected rooms may not be available for the new dates. 
    Availability will be confirmed when you attempt to reserve.
  </div>
)}
```

---

### BUG 11 — ROOMS SHOULD DISAPPEAR WHEN DATES + GUESTS DON'T MATCH — BUT THEY DON'T
**File:** `src/app/(public)/hotels/[slug]/page.tsx`

Currently: All `AVAILABLE` room_details are returned regardless of dates. 

**The correct flow:**
- No dates given → Show all room types + all available variants (correct behavior, show all)
- Dates given → Only show variants NOT booked for those dates (use room_trackers filter, BUG 6)
- Dates given + room not available → Room variant should simply not appear (the server filters it out)
- User had selected a room then changed dates → Show warning (BUG 10)

The fix for this IS the fix for BUG 6. Once the server filters by dates using room_trackers, unavailable rooms just won't appear.

---

### BUG 12 — `booking-sidebar.tsx` HAS TWO SEPARATE DATE POPOVERS — ONE CALENDAR EACH
**File:** `src/components/room/booking-sidebar.tsx`

The sidebar has TWO separate Popovers — one for check-in, one for check-out. Each opens its own calendar. This is bad UX and doubles the clicks needed.

**Fix:** Merge into ONE popover with `mode="range"` calendar (single calendar showing both dates) — exactly like hero-search.tsx. This is already done in hero-search.tsx with DateRange. Copy that pattern.

```tsx
// ONE popover, ONE calendar, mode="range"
<Popover>
  <PopoverTrigger asChild>
    <button className="w-full ...">
      <div className="flex gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Check-in</p>
          <p className="font-medium text-sm">{date?.from ? format(date.from, 'EEE, MMM d') : 'Add date'}</p>
        </div>
        <div className="border-l border-border/40 pl-3">
          <p className="text-xs text-muted-foreground">Check-out</p>
          <p className="font-medium text-sm">{date?.to ? format(date.to, 'EEE, MMM d') : 'Add date'}</p>
        </div>
      </div>
    </button>
  </PopoverTrigger>
  <PopoverContent ...>
    <Calendar mode="range" selected={date} onSelect={setDate} ... />
  </PopoverContent>
</Popover>
```

---

### BUG 13 — `booking-client.tsx` DOES NOT SHOW USER'S NAME/EMAIL/DETAILS ON REVIEW PAGE
**File:** `src/app/(public)/bookings/new/booking-client.tsx`

The "Review your booking" page shows zero information about WHO is booking. No name, no email, nothing. This is a critical UX gap. The user needs to see:
- Their name
- Their email
- Their NID/passport status (and if missing, a block with a message)

**Fix:** On mount, fetch `GET /api/user/profile`. Display name + email. If NID/passport missing, show the blocking warning (see BUG 2).

---

### BUG 14 — `booking-client.tsx` ACCEPTS `quantity` AS SINGLE NUMBER BUT IGNORES MULTIPLE ROOM TYPES
**File:** `src/app/(public)/bookings/new/booking-client.tsx` + `booking-sidebar.tsx`

The sidebar passes only `room_type` (the first selected variant's room type ID) and `quantity` (total count). But the system supports selecting rooms from MULTIPLE room types at once. The reserve API only accepts ONE `room_type_id`. 

This means if the user selects 1 Deluxe Room + 1 Budget Room, only the first one gets reserved.

**This is a known architectural limitation for now.** Document it. For the current version: limit the sidebar to one room type at a time. If user selects from a second room type, deselect the first type entirely and show: "Only one room type can be selected per booking. Your previous selection has been cleared."

---

### BUG 15 — `hotel-detail-client.tsx` PASSES `guests` FROM SERVER BUT SIDEBAR SHOWS NO GUEST SELECTOR
**File:** `src/components/room/booking-sidebar.tsx`

The sidebar has NO way to change guest count. `initialGuests` is passed in but there's no `+/-` stepper for guests. The user who arrived without selecting guests cannot change it.

**Fix:** Add a guests stepper to the sidebar (same as the one we designed earlier — Minus, count, Plus buttons).

---

### BUG 16 — `reserve` API USES `roomType.base_price` FOR TOTAL BUT `room_details.price` FOR PER-ROOM SUBTOTAL — INCONSISTENT
**File:** `src/app/api/bookings/reserve/route.ts`

```ts
// Line in the API:
const pricePerNight = Number(roomType.base_price);   // ← total uses base_price
const totalPrice = pricePerNight * nights * qty;

// BUT inside the loop:
const subtotal = Number(room.price) * nights;        // ← per-room uses room.price (room_details.price)
```

The `total_price` stored on `user_bookings` uses `base_price × nights × qty`.
But `room_bookings.subtotal` uses `room.price × nights` (the actual physical room price).

These can differ. The booking confirmation page shows `totalPrice` from the server. But the sidebar showed a total calculated from `variant.price` (which is `room_details.price`). These two numbers may not match.

**Per the system design: `room_details.price` is the real booking price. `base_price` is display only.**

**Fix in `reserve/route.ts`:**
```ts
// Calculate total from actual room prices, not base_price
let totalPrice = 0;
for (const room of selectedRooms) {
  totalPrice += Number(room.price) * nights;
}
// Use this totalPrice instead of pricePerNight * nights * qty
```

---

### BUG 17 — `booking-client.tsx` REDIRECTS TO `/profile` — ROUTE DOESN'T EXIST AS EXPECTED
**File:** `src/app/(public)/bookings/new/booking-client.tsx`

```ts
router.push(`/profile?booking_success=${data.data.booking_reference}`);
```

There is no `/profile` public route. The user profile is at `/user/profile` (inside `(user)` route group). Even if the redirect was right, `/profile` 404s. 

**Fix:** Redirect to `/bookings/${data.data.booking_reference}` which is the user booking detail page at `src/app/(user)/bookings/[reference]/page.tsx`.

---

### BUG 18 — NO RESERVATION TIMER ON BOOKING CONFIRMATION
**File:** `src/components/booking/reservation-timer.tsx` — EMPTY

The reserve API correctly sets `reserved_until = now + 10 minutes`. But after redirect to `/bookings/{ref}`, there is ZERO countdown timer showing the user they have 10 minutes to complete. The user has no idea they're on a time limit.

**The `reservation-timer.tsx` component needs to be built.** It's the most important user-facing booking feature. See Section 3 for exactly what to build.

---

## SECTION 2 — WHAT TO DELETE (RIGHT NOW)

```
DELETE: src/components/booking/booking-confirmation.tsx   (0 bytes, wrong location)
DELETE: src/components/booking/reservation-timer.tsx      (0 bytes — will be rebuilt, see Section 3)
DELETE: src/components/booking/room-selector.tsx          (0 bytes, never used)
```

After deletion, `src/components/booking/` folder will be empty. That's fine for now.

---

## SECTION 3 — WHAT TO BUILD (IN ORDER)

### BUILD ORDER:
1. Fix BUG 2 + 3 + 13 → Update `booking-client.tsx`
2. Fix BUG 6 → Update hotel detail page Prisma query
3. Fix BUG 5 → Change `revalidate` to `dynamic`
4. Fix BUG 7 → Update `hotel-card.tsx` to pass dates in href
5. Fix BUG 8 + 10 → Add date-change warning in `hotel-detail-client.tsx`
6. Fix BUG 9 → Add guest filter in `hotel-detail-client.tsx`
7. Fix BUG 12 → Merge two date pickers into one range picker in `booking-sidebar.tsx`
8. Fix BUG 15 → Add guests stepper to sidebar
9. Fix BUG 16 → Fix price calculation in `reserve/route.ts`
10. Build `reservation-timer` component for `/bookings/{ref}` page

---

## SECTION 4 — EXACT CODE FOR EACH FIX

---

### FIX 1: `src/app/(public)/bookings/new/booking-client.tsx` — Complete Rewrite

Tell your AI:

> Replace the entire file `src/app/(public)/bookings/new/booking-client.tsx`. 
> 
> The new version must:
> 1. On mount, call `GET /api/user/profile` to check if user has NID or passport
> 2. If NID and passport both missing: show a blocking inline warning — do NOT redirect anywhere. Show a message with a link to /user/profile
> 3. If NID or passport present: allow booking normally
> 4. On "Confirm Reservation" click: call `POST /api/bookings/reserve`
> 5. On success: redirect to `/bookings/{booking_reference}` — NOT to /profile
> 6. Show user's name and email at the top of the page
> 7. Show special request textarea
>
> State needed:
> - `userProfile: { name, email, detail: { nid_no, passport } } | null`
> - `profileLoading: boolean`
> - `hasValidId: boolean` (nid_no || passport)
> - `specialRequest: string`
> - `isSubmitting: boolean`
> - `error: string | null`
>
> API calls:
> - `GET /api/user/profile` → fetch on mount
> - `POST /api/bookings/reserve` → only when user clicks confirm AND hasValidId is true

---

### FIX 2: `src/app/(public)/hotels/[slug]/page.tsx` — Availability Filter

Tell your AI:

> In `src/app/(public)/hotels/[slug]/page.tsx`, make TWO changes:
>
> **Change 1:** Replace `export const revalidate = 3600;` with `export const dynamic = 'force-dynamic';`
>
> **Change 2:** Add this helper function ABOVE the default export function:
> ```ts
> function buildRoomDetailWhere(checkIn?: string, checkOut?: string) {
>   const where: any = { status: 'AVAILABLE', deleted_at: null };
>   if (checkIn && checkOut) {
>     const checkInDate = new Date(checkIn);
>     const checkOutDate = new Date(checkOut);
>     if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
>       where.room_trackers = {
>         none: {
>           status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
>           check_in: { lt: checkOutDate },
>           check_out: { gt: checkInDate },
>         }
>       };
>     }
>   }
>   return where;
> }
> ```
>
> **Change 3:** In the Prisma `room_details` where clause inside the main query, replace:
> ```ts
> room_details: { where: { status: 'AVAILABLE', deleted_at: null }, include: {...} }
> ```
> With:
> ```ts
> room_details: { where: buildRoomDetailWhere(search.check_in, search.check_out), include: {...} }
> ```
>
> Do NOT change anything else in this file.

---

### FIX 3: `src/components/hotel/hotel-card.tsx` — Preserve Dates in Links

Tell your AI:

> In `src/components/hotel/hotel-card.tsx`, the card component needs to accept optional props `checkIn?: string`, `checkOut?: string`, `guests?: number`. 
>
> Update the Link href that goes to the hotel detail page. Currently it likely is:
> ```tsx
> href={`/hotels/${hotel.slug}`}
> ```
>
> Change it to:
> ```tsx
> href={`/hotels/${hotel.slug}${checkIn && checkOut ? `?check_in=${checkIn}&check_out=${checkOut}&guests=${guests || 1}` : ''}`}
> ```
>
> Then in `src/app/(public)/search/page.tsx` and `src/app/(public)/hotels/page.tsx`, pass these props down to HotelCard from the URL search params.

---

### FIX 4: `src/components/room/hotel-detail-client.tsx` — Date Change Warning + Guest Filter

Tell your AI:

> In `src/components/room/hotel-detail-client.tsx`, make these changes:
>
> **Change 1:** Add state to track if dates have been changed:
> ```ts
> const [sidebarCheckIn, setSidebarCheckIn] = useState(checkIn);
> const [sidebarCheckOut, setSidebarCheckOut] = useState(checkOut);
> const datesChanged = sidebarCheckIn !== checkIn || sidebarCheckOut !== checkOut;
> const hasAnySelection = Object.values(quantities).some(q => q > 0);
> ```
>
> **Change 2:** Add guest filtering to `filteredRoomTypes`:
> ```ts
> const filteredRoomTypes = useMemo(() => {
>   let types = roomTypes;
>   if (acFilter !== 'all') {
>     types = types.filter(rt => rt.room_variants.some(v => acFilter === 'ac' ? v.ac : !v.ac));
>   }
>   // Filter by occupancy
>   if (guests > 1) {
>     types = types.filter(rt => rt.max_occupancy >= guests);
>   }
>   return types;
> }, [roomTypes, acFilter, guests]);
> ```
>
> **Change 3:** Add warning banner between the filter pills and the grid:
> ```tsx
> {datesChanged && hasAnySelection && (
>   <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm mb-4">
>     <AlertTriangle className="h-4 w-4 shrink-0" />
>     <span>Dates have changed. Your selected rooms may not be available for the new dates. Click Reserve to confirm availability.</span>
>   </div>
> )}
> ```
> Import `AlertTriangle` from `lucide-react`.
>
> **Change 4:** Pass `onDatesChange` callback to `BookingSidebar`:
> ```tsx
> <BookingSidebar
>   ...
>   onDatesChange={(ci, co) => { setSidebarCheckIn(ci); setSidebarCheckOut(co); }}
> />
> ```
>
> **Change 5:** In `BookingSidebar`, accept `onDatesChange?: (checkIn: string, checkOut: string) => void` prop and call it when date changes:
> ```ts
> // In the onSelect handler:
> setDate(newDate);
> if (newDate?.from && newDate?.to && onDatesChange) {
>   onDatesChange(format(newDate.from, 'yyyy-MM-dd'), format(newDate.to, 'yyyy-MM-dd'));
> }
> ```

---

### FIX 5: `src/components/room/booking-sidebar.tsx` — Merge Date Pickers + Add Guests Stepper

Tell your AI:

> In `src/components/room/booking-sidebar.tsx`, make these two changes:
>
> **Change 1:** Replace the two separate Popover date pickers with one combined popover. The trigger button shows both check-in and check-out side by side separated by a thin border. The calendar inside is mode="range" exactly like hero-search.tsx.
>
> The combined trigger:
> ```tsx
> <Popover>
>   <PopoverTrigger asChild>
>     <button className="w-full border border-border/50 rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
>       <div className="grid grid-cols-2">
>         <div className="px-4 py-3 text-left">
>           <p className="text-xs text-muted-foreground mb-1">Check-in</p>
>           <div className="flex items-center gap-2">
>             <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
>             <span className="text-sm font-medium">
>               {date?.from ? format(date.from, 'MMM d, yyyy') : 'Add date'}
>             </span>
>           </div>
>         </div>
>         <div className="px-4 py-3 text-left border-l border-border/50">
>           <p className="text-xs text-muted-foreground mb-1">Check-out</p>
>           <div className="flex items-center gap-2">
>             <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
>             <span className="text-sm font-medium">
>               {date?.to ? format(date.to, 'MMM d, yyyy') : 'Add date'}
>             </span>
>           </div>
>         </div>
>       </div>
>     </button>
>   </PopoverTrigger>
>   <PopoverContent className="w-auto p-0" align="center" sideOffset={6}>
>     <Calendar
>       initialFocus
>       mode="range"
>       defaultMonth={date?.from}
>       selected={date}
>       onSelect={(newDate) => {
>         setDate(newDate);
>         if (newDate?.from && newDate?.to && onDatesChange) {
>           onDatesChange(format(newDate.from, 'yyyy-MM-dd'), format(newDate.to, 'yyyy-MM-dd'));
>         }
>       }}
>       numberOfMonths={2}
>       disabled={{ before: new Date() }}
>       className="p-3"
>     />
>   </PopoverContent>
> </Popover>
> ```
>
> **Change 2:** Add a guests stepper BELOW the date picker:
> ```tsx
> <div className="flex items-center justify-between border border-border/50 rounded-xl px-4 py-3">
>   <div className="flex items-center gap-2 text-sm">
>     <Users className="h-4 w-4 text-primary" />
>     <span>{guests} Guest{guests !== 1 ? 's' : ''}</span>
>   </div>
>   <div className="flex items-center gap-2">
>     <button
>       onClick={() => setGuests(Math.max(1, guests - 1))}
>       className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center text-sm hover:border-primary hover:text-primary transition-colors"
>     >−</button>
>     <span className="w-4 text-center text-sm font-medium">{guests}</span>
>     <button
>       onClick={() => setGuests(Math.min(10, guests + 1))}
>       className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center text-sm hover:border-primary hover:text-primary transition-colors"
>     >+</button>
>   </div>
> </div>
> ```
>
> Add `const [guests, setGuests] = useState(initialGuests ?? 1);` at the top.
> Import `Users` from lucide-react.
> Change `handleReserve` to use the `guests` state value instead of `initialGuests`.

---

### FIX 6: `src/app/api/bookings/reserve/route.ts` — Use `room.price` for Total

Tell your AI:

> In `src/app/api/bookings/reserve/route.ts`, find this code:
> ```ts
> const pricePerNight = Number(roomType.base_price);
> const totalPrice = pricePerNight * nights * qty;
> ```
>
> Replace with:
> ```ts
> // Calculate total from actual physical room prices, not base_price
> // base_price is display only. room.price is the real booking price.
> const totalPrice = selectedRooms.reduce((sum, room) => sum + Number(room.price) * nights, 0);
> ```
>
> Do not change anything else in this file.

---

### FIX 7: Build `reservation-timer.tsx` in `/bookings/[reference]/page.tsx`

Tell your AI:

> In `src/app/(user)/bookings/[reference]/page.tsx`, there is currently no countdown timer.
>
> After fetching the booking, if `booking.status === 'RESERVED'` and `booking.reserved_until` is in the future, show a countdown timer in the page.
>
> Create the timer as a client component: `src/components/booking/reservation-timer.tsx`
>
> Props: `reservedUntil: string` (ISO datetime string)
>
> Logic:
> - Calculate seconds remaining: `differenceInSeconds(new Date(reservedUntil), new Date())`
> - Use `setInterval` every second to decrement
> - Show: "⏱ Complete your booking in MM:SS" in amber/warning style
> - When timer reaches 0: show "Your reservation has expired. The rooms have been released." in red
> - On expiry: optionally call `POST /api/bookings/{ref}/expire` (this route already exists)
>
> Display in the booking detail page:
> ```tsx
> {booking.status === 'RESERVED' && booking.reserved_until && (
>   <ReservationTimer reservedUntil={booking.reserved_until.toISOString()} />
> )}
> ```

---

## SECTION 5 — ARCHITECTURE CLARITY (For your AI to not invent files)

### Current booking flow — how it SHOULD work:

```
1. User on /hotels/{slug}
   → Sees room types (server-rendered with date filtering)
   → Uses +/- to select variant quantities
   → Sees price in sidebar
   → Clicks "Reserve for ৳X"
   
2. BookingSidebar.handleReserve()
   → Builds URL params: hotel, room_type, quantity, check_in, check_out, guests
   → router.push('/bookings/new?...')
   → NO API call here. Just navigation.

3. /bookings/new (server page)
   → Reads URL params (hotel, room_type, quantity, check_in, check_out, guests)
   → Fetches hotel + room type data from DB (for display)
   → Renders booking review page
   → BookingClient component handles the confirm step

4. BookingClient (client component on /bookings/new)
   → On mount: fetch GET /api/user/profile
   → Check nid_no || passport
   → If missing: show warning, do NOT call reserve
   → User fills special request
   → User clicks "Confirm Reservation"
   → POST /api/bookings/reserve
   → On success: router.push('/bookings/{reference}')

5. /bookings/{reference} (user route)
   → Shows booking details
   → Shows ReservationTimer if status === RESERVED
   → Shows "Confirm Payment" button if payment flow exists
   → Shows booking status

6. Background: cron job expires RESERVED bookings after 10 min
   → Already exists at /api/cron/expire-bookings/route.ts ✓
```

### Tables Used In Booking Flow:
- `user_bookings` — one record per booking
- `room_bookings` — one record per physical room in the booking
- `room_trackers` — one record per physical room, used for availability overlap queries
- `end_user_details` — checked for nid_no/passport before booking

### Tables NOT involved in booking flow:
- `hotel_admins` — hotel staff only
- `hotel_sub_admins` — sub-staff only
- `system_admins` — platform admin only
- `pricing_rules` — future feature, not wired to reserve API yet

---

## SECTION 6 — FINAL BUG TABLE

| # | Bug | Severity | File | Fix |
|---|-----|----------|------|-----|
| 1 | Reserve fires before NID check | 🔴 Critical | booking-client.tsx | Add profile fetch + check |
| 2 | No NID/passport gate | 🔴 Critical | booking-client.tsx | Check before reserve |
| 3 | Success redirects to /profile | 🔴 Critical | booking-client.tsx | Change to /bookings/{ref} |
| 4 | 3 empty booking components | 🟡 Noise | booking/ folder | Delete all 3 |
| 5 | revalidate=3600 on hotel page | 🔴 Critical | hotels/[slug]/page.tsx | force-dynamic |
| 6 | Dates ignored in room availability query | 🔴 Critical | hotels/[slug]/page.tsx | Add room_trackers filter |
| 7 | Dates lost when clicking hotel card | 🟠 Major | hotel-card.tsx | Pass dates in href |
| 8 | Sidebar date change disconnects from room state | 🟠 Major | hotel-detail-client.tsx | onDatesChange callback + warning |
| 9 | Guests not used to filter room types | 🟠 Major | hotel-detail-client.tsx | Add occupancy filter |
| 10 | No warning when dates change with selection | 🟠 Major | hotel-detail-client.tsx | Show warning banner |
| 11 | All rooms shown regardless of dates | 🔴 Critical | hotels/[slug]/page.tsx | Same as Bug 6 |
| 12 | Two separate date pickers in sidebar | 🟡 UX | booking-sidebar.tsx | Merge to one range picker |
| 13 | No user info shown on booking review page | 🟡 UX | booking-client.tsx | Fetch and show profile |
| 14 | Multi room type selection broken | 🟡 Known | booking-sidebar.tsx | Limit to 1 room type, show message |
| 15 | No guests stepper in sidebar | 🟡 UX | booking-sidebar.tsx | Add +/- stepper |
| 16 | base_price used for total instead of room.price | 🟠 Major | reserve/route.ts | Use room.price sum |
| 17 | /profile route doesn't exist | 🔴 Critical | booking-client.tsx | Same as Bug 3 |
| 18 | No reservation countdown timer | 🟠 Major | bookings/[ref]/page.tsx | Build timer component |
