# Bug: Reservations don't respect the selected room variant

## Instructions for the coding assistant

Open this repo in the workspace. Read the "Root cause" section below fully before
touching any code — the bug spans 4 files and the fix only works if all 4 are
updated together. Do not modify anything related to date-range limits; that is a
separate, unrelated task and is explicitly out of scope here.

---

## Symptom

Hotel has one room type ("Budget") with 6 physical rooms split into two variants:
- Variant A: 5 identical rooms (same price/AC/smoking/pet attributes)
- Variant B: 1 room with different attributes

A user reserves the single room in Variant B. After the reservation, Variant B
still shows as available with its full count, and can be reserved again by
another user. Meanwhile Variant A's count silently drops by one, even though
nobody selected Variant A.

More generally: two users selecting rooms from the same room type are drawing
from one shared, undifferentiated pool of physical rooms instead of two
isolated pools per variant.

## Root cause

Room **creation** and **display grouping** are both correct — verified in
`src/app/api/hotel-admin/rooms/route.ts` (single creation ~line 220, bulk
creation ~line 148) and `src/lib/room-grouping.ts` (groups by
`price|ac|smoking_allowed|pet_allowed`). Each physical room is its own
`room_details` row, and the grouping into "variants" for display is accurate.

The bug is entirely in the **reservation** path, which throws away the variant
selection between the UI and the database write:

1. **`src/components/booking/room-selector.tsx`** — tracks selections keyed by
   `variantId` (a specific `room_detail.id`). This part is correct.

2. **`src/components/booking/booking-sidebar.tsx`**, function `handleReserve()`
   — **this is where the variant identity is lost.** It collapses
   `selectedVariants` down to a plain `roomTypeId -> quantity` map:
   ```js
   const selectionsByRoomType = selectedVariants.reduce((acc, variant) => {
     acc[variant.roomTypeId] = (acc[variant.roomTypeId] || 0) + variant.quantity;
     return acc;
   }, {});
   ```
   It then pushes `room_type_ids[]` and `quantities[]` into the URL for
   `/bookings/new`. `variantId` is never included.

3. **`src/app/(public)/bookings/new/page.tsx`** and
   **`src/app/(public)/bookings/new/booking-client.tsx`** — read
   `room_type_ids[]` / `quantities[]` from the URL and forward that same
   `{ room_type_id, quantity }` shape as `room_selections` in the POST body to
   `/api/bookings/reserve`. No variant information passes through here either.

4. **`src/app/api/bookings/reserve/route.ts`** — receives only
   `room_type_id` + `quantity` per selection. It queries **every** `AVAILABLE`
   physical room under that room type (no filter on price/ac/smoking/pet),
   removes rooms with clashing `room_trackers`, and takes the first N with no
   deterministic ordering:
   ```js
   const physicalRooms = await tx.room_details.findMany({
     where: { room_type_id: roomType.id, status: "AVAILABLE", deleted_at: null },
   });
   // ...
   const selectedRooms = availableRooms.slice(0, selection.quantity);
   ```
   This treats all physical rooms of a room type as one interchangeable pool,
   so the physical room actually reserved may not be the one the user picked
   on screen.

**Supporting evidence this is a regression, not a design choice:**
`src/lib/validations/booking.ts` already defines a `reserveBookingSchema` with
a `rooms: [{ room_type_id, room_detail_id }]` shape — i.e. someone already
designed the correct per-room-detail contract. It is never imported or used
anywhere in the codebase. The route was implemented against a different,
coarser payload instead.

## Fix plan

Goal: carry the selected variant's identity all the way from the room card
click to the database query, and make the backend match physical rooms by
variant attributes (not just room type) before picking which ones to lock.

### 1. `src/lib/validations/booking.ts`

Update `reserveBookingSchema` to match the real payload and actually use it
(it currently isn't imported by the reserve route at all):

```ts
export const reserveBookingSchema = z.object({
  hotel_id: z.number().int().positive(),
  check_in: z.string().refine((val) => !isNaN(Date.parse(val))),
  check_out: z.string().refine((val) => !isNaN(Date.parse(val))),
  guests: z.number().int().positive(),
  room_selections: z.array(z.object({
    room_type_id: z.number().int().positive(),
    variant_id: z.number().int().positive(), // representative room_detail.id of the chosen variant
    quantity: z.number().int().positive(),
  })).min(1, "At least one room required"),
  special_request: z.string().optional(),
})
```

### 2. `src/components/booking/booking-sidebar.tsx`

In `handleReserve()`, stop collapsing to `roomTypeId -> quantity`. Keep each
selection's `variantId` and push it into the URL alongside the room type and
quantity, index-aligned:

```js
selectedVariants.forEach(v => {
  params.append("room_type_ids[]", String(v.roomTypeId));
  params.append("variant_ids[]", String(v.variantId));
  params.append("quantities[]", String(v.quantity));
});
```

### 3. `src/app/(public)/bookings/new/page.tsx` and `booking-client.tsx`

- Read `variant_ids[]` from the search params alongside the existing
  `room_type_ids[]` / `quantities[]` (zip by array index).
- Add `variantId` to the `roomSelections` shape passed into
  `BookingClientProps`.
- In `handleBooking()`, include it in the POST body:
  ```js
  room_selections: bookingData.roomSelections.map(selection => ({
    room_type_id: selection.roomTypeId,
    variant_id: selection.variantId,
    quantity: selection.quantity,
  })),
  ```

### 4. `src/app/api/bookings/reserve/route.ts`

- Parse the body with `reserveBookingSchema.safeParse(...)` (it currently does
  manual, unvalidated destructuring — fix that too).
- For each selection, resolve the variant's attribute signature from its
  representative room, then scope the physical-room query to that signature
  instead of the whole room type:

  ```ts
  const variantRoom = await tx.room_details.findUnique({
    where: { id: selection.variant_id },
  });

  if (!variantRoom || variantRoom.room_type_id !== selection.room_type_id) {
    throw new Error("Invalid room variant");
  }

  const physicalRooms = await tx.room_details.findMany({
    where: {
      room_type_id: selection.room_type_id,
      status: "AVAILABLE",
      deleted_at: null,
      price: variantRoom.price,
      ac: variantRoom.ac,
      smoking_allowed: variantRoom.smoking_allowed,
      pet_allowed: variantRoom.pet_allowed,
    },
  });
  ```
- Keep the existing logic below this unchanged (excluding rooms with clashing
  `room_trackers`, then slicing `quantity` rooms from what's left) — it just
  now operates on the correctly-scoped pool instead of the whole room type.
- Update the "not enough physical rooms" / "sold out" error messages if
  needed so they reference the variant, not just the room type.

## How to verify the fix

1. Create a room type with 5 identical rooms (Variant A) and 1 differently
   configured room (Variant B).
2. As User 1, reserve the 1 room in Variant B.
3. Reload the hotel page (same dates) as User 2 (or in an incognito session):
   - Variant B should now show 0 available / disappear from the list.
   - Variant A should still show all 5 as available.
4. Confirm the created `room_trackers` row's `room_detail_id` matches the
   physical room actually belonging to Variant B, not one of Variant A's rooms.
5. Repeat with concurrent requests (e.g. two rapid reservations for the same
   1-room variant) and confirm the second one fails with a sold-out error
   instead of succeeding.
