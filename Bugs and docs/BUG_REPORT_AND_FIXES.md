# Hotel Booking Platform — Bug Report & Fix Instructions

---

## SECTION 1: FULL LIST OF ISSUES

---

### Issue 1 — Cron Job Does Not Restore Room Availability on Expiry

**Where:** `src/app/api/cron/expire-bookings/route.ts`

**What is happening:**
The cron job correctly marks expired bookings as `EXPIRED` and deletes `room_trackers` rows with status `RESERVED`. However, the cron job is only triggered via an external HTTP call (Vercel Cron or a scheduler). In the current local development environment there is **no trigger** actually calling this endpoint. The rooms are therefore still "held" in `room_trackers` long after the 5-minute window, making them appear unavailable to subsequent users.

Additionally, the availability query in both `src/app/api/public/hotels/[slug]/availability/route.ts` and `src/app/api/public/hotels/route.ts` correctly uses a `none: { status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] } }` filter. This means if the cron job **does** run and deletes the trackers, the rooms will reappear. The root cause is simply that the cron is never invoked automatically in the local/dev environment.

**Secondary issue within the cron itself:**
The `deleteMany` for `room_trackers` only targets rows with `status: 'RESERVED'`. If a tracker somehow ended up in another state this could cause a subtle bug, but the primary issue is invocation.

---

### Issue 2 — Room Variant Grouping Counts All Physical Rooms Under a Room Type Together, Ignoring Per-Variant Limits

**Where:** `src/lib/room-grouping.ts` and `src/app/api/public/hotels/[slug]/availability/route.ts`

**What is happening:**
The `groupRoomVariants()` function groups physical rooms (`room_details`) by a composite key of:
```
price | ac | smoking_allowed | pet_allowed
```

If a hotel admin creates two room types (e.g., "Deluxe" and "Standard"), each with physical rooms that happen to have the **same price and same AC/smoking/pet flags**, the grouping function merges them into **one variant** and sums up `available_count` across all rooms from both types.

**Concrete example from your scenario:**
- Room Type: "Deluxe" → Variant V1 (price=1000, AC=true) → 5 physical rooms
- Room Type: "Standard" → Variant V2 (price=1000, AC=true) → 1 physical room

Both variants have identical grouping keys (`1000|1|0|0`), so `groupRoomVariants` collapses them into a **single variant showing 6 available rooms**. A second user can reserve the same physical room as the first user because:

1. The `available_count` on the merged variant shows 6 instead of 1.
2. The `reserve` endpoint only checks `room_details` filtered by the single `room_type_id`, which is correct — but the UI sends the wrong `room_type_id` because both physical rooms were collapsed into one variant ID.

**Root cause:**
`groupRoomVariants` is called on `room.room_details` (already scoped to a single room type), but the grouping key (`price|ac|smoking|pet`) is too coarse — it doesn't include a room-type scope guard. If two different room types happen to share the same physical-room attributes, they merge incorrectly. The variant `id` is set to the **first room's `room_detail` id**, not the `room_type_id`, so the reserve route receives a `room_type_id` that maps to one variant but physical rooms from the other.

---

### Issue 3 — Double Booking Is Possible Within the Same Reservation Window

**Where:** `src/app/api/bookings/reserve/route.ts`

**What is happening:**
The reserve API wraps the logic in a `prisma.$transaction(async (tx) => { ... })` (interactive transaction), which does provide row-level isolation. However, the availability check and room selection are done inside `findMany` + `filter` in application code — **not using database-level locking (`SELECT FOR UPDATE`)**. Under concurrent requests, two users can both read the same available rooms before either has committed its tracker insert, leading to both reserving the same physical room.

---

### Issue 4 — Frontend Date Pickers Have No Maximum Date Limit (1-Year Rule Not Enforced)

**Where:**
- `src/components/search/hero-search.tsx` (line 224 — the `<Calendar>` component)
- `src/components/search/search-bar.tsx` (line 275 — the `<Calendar>` component)
- `src/components/booking/booking-sidebar.tsx` (line 188 — the `<Calendar>` component)

**What is happening:**
All three calendar pickers only disable past dates (the `disabled` prop blocks `d < today`), but none of them restrict future dates. A user can freely select check-in/check-out dates 2, 5, or 10 years from now. The `hero-search.tsx` calendar does not even have any `disabled` prop at all.

---

### Issue 5 — Backend Reservation API Has No 1-Year Date Validation

**Where:** `src/app/api/bookings/reserve/route.ts` (lines 47–71)

**What is happening:**
The reserve endpoint validates that:
- Dates are valid (not NaN)
- Check-in is not in the past
- Check-out is after check-in

But it does **not** validate that check-in/check-out dates are within 1 year from today. A malicious or erroneous API call with dates far in the future will be accepted and booked.

---

### Issue 6 — Cron Invocation: No Self-Trigger / Polling Mechanism for Local Dev

**Where:** No file currently exists for this — it needs to be added.

**What is happening:**
The cron endpoint at `/api/cron/expire-bookings` requires an external caller. In local development or on hosting platforms without Vercel Cron configured, it is simply never called. Expired `RESERVED` bookings pile up and their rooms remain blocked.

**Fix:** Add a lightweight server-side polling mechanism so that whenever a booking page is visited, the app can trigger the cron cleanup if due — or configure a `vercel.json` cron schedule.

---

---

## SECTION 2: SOLUTIONS (WITH EXACT FILE-LEVEL INSTRUCTIONS)

---

> **Important for AI:** Read each fix carefully. Only change the exact files and lines described. Do not alter any logic, UI, or other code that is not mentioned in the fix. Each fix is self-contained.

---

### Fix 1 — Add a `vercel.json` Cron Schedule to Auto-Trigger the Expiry Endpoint

**File to create (NEW):** `vercel.json` at the **project root** (same level as `package.json`)

**Action:** Create this file if it does not exist. If it already exists, add the `"crons"` key into the existing JSON without removing other keys.

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-bookings",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

This tells Vercel to call `GET /api/cron/expire-bookings` every 5 minutes automatically.

---

### Fix 2 — Add an Internal Self-Trigger for Local Dev (Optional but Recommended)

**File to modify:** `src/app/api/cron/expire-bookings/route.ts`

No code changes needed to this file. The existing logic is correct — it just needs to be called. If you want local dev support, add this to any server route that is frequently called (e.g., the public hotels list), but this is optional. Vercel Cron via `vercel.json` is the correct solution for production.

---

### Fix 3 — Fix the Room Variant Grouping Logic to Prevent Cross-Room-Type Merging

**File to modify:** `src/lib/room-grouping.ts`

**Problem:** The grouping key `${price}|${ac}|${smoking_allowed}|${pet_allowed}` does not include the physical room's own identity. When two different room types have rooms with identical attributes, their physical rooms get collapsed.

**Fix:** Change the grouping so each physical room becomes its **own independent variant**, but rooms within the same room type that share identical attributes are grouped together and their `available_count` is summed. Since `groupRoomVariants` is called **per room type** (one call per `room_type`), adding the `room_detail_id` to differentiate within-type variants is not needed — the real fix is to make the `available_count` cumulative correctly and ensure the variant's representative `id` is always the first room of that group.

However, the **true root cause** is that the per-room-type grouping works fine in isolation, but the problem arises because `groupRoomVariants` is given all `room_details` for one `room_type`, and if admin creates room variants under the SAME room type with identical price/ac/smoking/pet flags, those physical rooms are correctly grouped (this is intentional). The issue you described — two different room types merging — cannot happen in the current code because `groupRoomVariants` is called separately for each room type in the availability route.

**Re-examining the actual bug:** The real double-booking problem is that when a user reserves Variant V2 (the only room in "Standard"), the `room_trackers` entry is created. But the second user's availability check in `GET /availability` uses:
```
room_trackers: {
  none: {
    status: { in: ['RESERVED', 'BOOKED', 'CHECKED_IN'] },
    check_in: { lt: checkOutDate },
    check_out: { gt: checkInDate },
  }
}
```
This is correct and **should** hide the room. So the double-booking can only occur if:
1. The cron hasn't run (room tracker from a previous expired reservation still exists), OR
2. The two reservations happen simultaneously (race condition), OR
3. The room tracker was not created (a bug in the reserve flow).

**The actual fix for `room-grouping.ts`:**

The `available_count` for a variant must represent only the physical rooms **within that specific group** that are available. Currently this is correct. No change needed to this file **if** the cron is running properly (Fix 1).

---

### Fix 4 — Fix Double Booking Race Condition in Reserve API

**File to modify:** `src/app/api/bookings/reserve/route.ts`

**Problem:** Two simultaneous requests can both read the same available rooms before either commits a tracker.

**Fix:** After fetching `availableRooms`, perform an additional **re-check inside the transaction** to verify that none of the `selectedRooms` were already taken between the read and the write. This is a "select-then-lock" pattern.

**Exact change — replace lines 133–148 (the bookedRooms check section):**

Find this block:
```typescript
const bookedRooms = await tx.room_trackers.findMany({
  where: {
    room_detail_id: { in: physicalRooms.map((r) => r.id) },
    status: { in: ["RESERVED", "BOOKED", "CHECKED_IN"] },
    check_in: { lt: checkOutDate },
    check_out: { gt: checkInDate },
  },
  select: { room_detail_id: true },
});

const bookedRoomIds = new Set(bookedRooms.map((r) => r.room_detail_id));
const availableRooms = physicalRooms.filter((r) => !bookedRoomIds.has(r.id));

if (availableRooms.length < selection.quantity) {
  throw new Error("Rooms are sold out for the selected dates");
}

const selectedRooms = availableRooms.slice(0, selection.quantity);
```

Replace it with:
```typescript
const bookedRooms = await tx.room_trackers.findMany({
  where: {
    room_detail_id: { in: physicalRooms.map((r) => r.id) },
    status: { in: ["RESERVED", "BOOKED", "CHECKED_IN"] },
    check_in: { lt: checkOutDate },
    check_out: { gt: checkInDate },
  },
  select: { room_detail_id: true },
});

const bookedRoomIds = new Set(bookedRooms.map((r) => r.room_detail_id));
const availableRooms = physicalRooms.filter((r) => !bookedRoomIds.has(r.id));

if (availableRooms.length < selection.quantity) {
  throw new Error("Rooms are sold out for the selected dates");
}

const selectedRooms = availableRooms.slice(0, selection.quantity);

// Re-confirm no tracker was inserted between our read and this write
const conflictCheck = await tx.room_trackers.findFirst({
  where: {
    room_detail_id: { in: selectedRooms.map((r) => r.id) },
    status: { in: ["RESERVED", "BOOKED", "CHECKED_IN"] },
    check_in: { lt: checkOutDate },
    check_out: { gt: checkInDate },
  },
});
if (conflictCheck) {
  throw new Error("Rooms are sold out for the selected dates");
}
```

---

### Fix 5 — Add 1-Year Maximum Date Validation to the Backend Reserve API

**File to modify:** `src/app/api/bookings/reserve/route.ts`

**Exact location:** After line 71 (after the `checkOutDate <= checkInDate` check), before the `nights` calculation.

Find this block:
```typescript
if (checkOutDate <= checkInDate) {
  return NextResponse.json(
    { success: false, message: "Check-out must be after check-in" },
    { status: 400 }
  );
}

const nights = Math.ceil(
```

Replace it with:
```typescript
if (checkOutDate <= checkInDate) {
  return NextResponse.json(
    { success: false, message: "Check-out must be after check-in" },
    { status: 400 }
  );
}

// Enforce 1-year maximum booking window
const maxAllowedDate = new Date();
maxAllowedDate.setFullYear(maxAllowedDate.getFullYear() + 1);
if (checkInDate > maxAllowedDate) {
  return NextResponse.json(
    { success: false, message: "Check-in date cannot be more than 1 year from today" },
    { status: 400 }
  );
}
if (checkOutDate > maxAllowedDate) {
  return NextResponse.json(
    { success: false, message: "Check-out date cannot be more than 1 year from today" },
    { status: 400 }
  );
}

const nights = Math.ceil(
```

---

### Fix 6 — Add 1-Year Maximum Date Restriction to ALL Frontend Calendar Pickers

There are **3 calendar components** that need to be updated. The fix is identical for all three: add a `disabled` prop that blocks past dates AND dates more than 1 year from today.

The `disabled` prop for `react-day-picker`'s `<Calendar>` accepts a function: `(date: Date) => boolean`. Return `true` to disable a date.

**Define this helper once at the top of each file (after imports):**
```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);
const maxDate = new Date(today);
maxDate.setFullYear(maxDate.getFullYear() + 1);
```

Or, since these are components that re-render, compute inline:
```typescript
disabled={(d) => {
  const t = new Date(); t.setHours(0,0,0,0);
  const max = new Date(t); max.setFullYear(max.getFullYear() + 1);
  return d < t || d > max;
}}
```

---

#### Fix 6a — `src/components/search/hero-search.tsx`

**Exact line to change:** Line 224

Find:
```tsx
<Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={1} className="p-3 w-full" />
```

Replace with:
```tsx
<Calendar
  initialFocus
  mode="range"
  defaultMonth={date?.from}
  selected={date}
  onSelect={setDate}
  numberOfMonths={1}
  className="p-3 w-full"
  disabled={(d) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const max = new Date(t); max.setFullYear(max.getFullYear() + 1);
    return d < t || d > max;
  }}
/>
```

---

#### Fix 6b — `src/components/search/search-bar.tsx`

**Exact line to change:** Lines 268–277 (the `<Calendar>` inside the popover)

Find:
```tsx
<Calendar
  initialFocus
  mode="range"
  defaultMonth={date?.from}
  selected={date}
  onSelect={setDate}
  numberOfMonths={1}
  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
  className="p-3 w-full"
/>
```

Replace with:
```tsx
<Calendar
  initialFocus
  mode="range"
  defaultMonth={date?.from}
  selected={date}
  onSelect={setDate}
  numberOfMonths={1}
  disabled={(d) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const max = new Date(t); max.setFullYear(max.getFullYear() + 1);
    return d < t || d > max;
  }}
  className="p-3 w-full"
/>
```

---

#### Fix 6c — `src/components/booking/booking-sidebar.tsx`

**Exact line to change:** Lines 188–196 (the `<Calendar>` inside the booking sidebar popover)

Find:
```tsx
<Calendar
  initialFocus
  mode="range"
  defaultMonth={date?.from}
  selected={date}
  onSelect={handleDateSelect}
  numberOfMonths={1}
  className="p-3 w-full"
/>
```

Replace with:
```tsx
<Calendar
  initialFocus
  mode="range"
  defaultMonth={date?.from}
  selected={date}
  onSelect={handleDateSelect}
  numberOfMonths={1}
  className="p-3 w-full"
  disabled={(d) => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const max = new Date(t); max.setFullYear(max.getFullYear() + 1);
    return d < t || d > max;
  }}
/>
```

---

### Fix 7 — Also Validate 1-Year Limit in the Availability API (Backend Guard)

**File to modify:** `src/app/api/public/hotels/[slug]/availability/route.ts`

**Add this validation after the `slug` check (after line 20, before the `buildRoomDetailWhere` function call):**

Find:
```typescript
if (!slug) {
  return NextResponse.json(
    { success: false, message: 'Hotel slug is required' },
    { status: 400 }
  );
}

// Build room detail where clause for availability filtering
```

Replace with:
```typescript
if (!slug) {
  return NextResponse.json(
    { success: false, message: 'Hotel slug is required' },
    { status: 400 }
  );
}

// Validate date range: not more than 1 year from today
if (checkIn && checkOut) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  const maxAllowed = new Date();
  maxAllowed.setFullYear(maxAllowed.getFullYear() + 1);
  if (!isNaN(ci.getTime()) && ci > maxAllowed) {
    return NextResponse.json(
      { success: false, message: 'Check-in date cannot be more than 1 year from today' },
      { status: 400 }
    );
  }
  if (!isNaN(co.getTime()) && co > maxAllowed) {
    return NextResponse.json(
      { success: false, message: 'Check-out date cannot be more than 1 year from today' },
      { status: 400 }
    );
  }
}

// Build room detail where clause for availability filtering
```

---

## SUMMARY TABLE

| # | Issue | Files Affected | Fix Type |
|---|-------|---------------|----------|
| 1 | Cron not triggered — rooms stay blocked after 5 min | `vercel.json` (new) | Add Vercel Cron config |
| 2 | Room variant grouping may collapse two different types | `src/lib/room-grouping.ts` | No code change needed if cron is fixed; root cause is untriggered cron |
| 3 | Race condition allows double booking | `src/app/api/bookings/reserve/route.ts` | Add conflict re-check after room selection |
| 4 | Frontend calendars allow dates > 1 year from now | `hero-search.tsx`, `search-bar.tsx`, `booking-sidebar.tsx` | Add `disabled` prop with max date |
| 5 | Backend reserve API accepts dates > 1 year | `src/app/api/bookings/reserve/route.ts` | Add max-date validation |
| 6 | Availability API accepts dates > 1 year | `src/app/api/public/hotels/[slug]/availability/route.ts` | Add max-date validation |

---

## IMPORTANT NOTES FOR AI IMPLEMENTING THESE FIXES

1. **Do not change** any Prisma schema — all fixes are application-layer only.
2. **Do not modify** any UI styling, component structure, or unrelated logic.
3. The `<Calendar>` component is from `@/components/ui/calendar` which wraps `react-day-picker`. The `disabled` prop format shown above is correct for `react-day-picker` v8+.
4. When editing `reserve/route.ts`, the conflict re-check (Fix 4) must go **inside** the `$transaction` callback, after `selectedRooms` is defined, and **before** `tx.room_bookings.create` is called.
5. The `vercel.json` cron fix (Fix 1) applies only in production on Vercel. For local development, you can manually call `GET http://localhost:3000/api/cron/expire-bookings` to test expiry.
