# MyHotels --- Complete System Architecture & Project Context

## Purpose

This is the master handoff document for the MyHotels project. It
captures the architecture, business rules, completed room-management
redesign, pricing/booking plan, Case Review boundaries, Master Data
Request workflow, known legacy code, API/file map, and remaining
implementation order discussed during the project.

> Treat explicit locked decisions as requirements. Treat sections marked
> as pending/open as unresolved. Do not silently change business rules.

------------------------------------------------------------------------

# 1. Project Overview

**MyHotels** is an enterprise-style hotel booking and
property-management system.

The project evolved from a Vite + React + Tailwind prototype into:

-   Next.js
-   App Router
-   TypeScript
-   React
-   Tailwind CSS
-   shadcn/ui / Radix UI
-   Lucide icons
-   Prisma ORM
-   MySQL
-   Zod
-   bcrypt
-   JWT / `jose`
-   Socket.IO
-   a separate Node Socket.IO server

The main domains are:

1.  System Admin
2.  Hotel Admin
3.  Public guest/booking system

------------------------------------------------------------------------

# 2. Core Architecture Rules

## Business logic

Do not put business logic in `page.tsx`.

Pages/components should call APIs and render state. Business logic
belongs in API routes and reusable server-side libraries/services.

## Validation

Use client-side validation for UX and server-side validation for
security/correctness. Zod is the main validation approach.

## Safe cleanup

Never delete a file just because it looks old. Search imports/usages
first. The project has undergone a major migration from the old room
architecture to persistent Room Variants.

------------------------------------------------------------------------

# 3. Hotel Admin vs System Admin

## Hotel Admin

Manages one hotel/property:

-   Property information
-   Room Types
-   Room Variants
-   Physical Rooms
-   Pricing rules/offers
-   Hotel team/admin information
-   Property changes that require approval
-   Master Data Requests
-   Activity history

## System Admin

Platform-level management:

-   Hotels
-   Property review
-   Master data
-   Master-data requests
-   Hotel/room visibility
-   Platform administration

System Admin can view the hotel room hierarchy, but Room
Type/Variant/Physical Room CRUD is a direct Hotel Admin workflow.

------------------------------------------------------------------------

# 4. Critical Case Review Decision

This is a locked architectural decision.

## NO CASE REVIEW FOR:

-   Room Type creation
-   Room Type editing
-   Room Variant creation
-   Room Variant editing
-   Physical Room creation
-   Bulk Physical Room creation
-   Physical Room editing
-   Physical Room status changes
-   Variant image management

These are direct Hotel Admin operations.

There must be no:

-   case creation
-   DRAFTING case
-   PENDING review
-   submit-for-review
-   approval button
-   "Waiting for Review"
-   "Draft Under Review"

for the room-management flow.

Legacy Case Engine enum values or branches may still exist temporarily,
but they must not be called by the current room APIs/UI. Verify
references before deleting them.

------------------------------------------------------------------------

# 5. Property Case Review

Property changes that actually require approval use the Case Engine.

Conceptual flow:

``` text
Hotel Admin
    ↓
DRAFTING case
    ↓
case_field_changes
    ↓
Submit
    ↓
PENDING
    ↓
System Admin review
    ↓
Approve / Reject
```

The planned helper is conceptually:

``` text
stageFieldChange(
  hotelId,
  hotelAdminId,
  entityType,
  entityId,
  fieldName,
  previousValue,
  proposedValue
)
```

It finds/creates the open DRAFTING case and upserts field changes.

If proposed value becomes equal to the live value, the draft change
should be removed.

Submit changes:

``` text
DRAFTING → PENDING
```

Discard removes the DRAFTING case.

A previously identified schema bug was that `cases.status` defaulted to
`PENDING`; the locked design requires `DRAFTING`.

------------------------------------------------------------------------

# 6. Property Page Design

The current planned Property tabs are:

1.  General
2.  Location
3.  Contacts
4.  Amenities
5.  Gallery
6.  Policies
7.  Business & Documents
8.  Owner
9.  Admin

## General

Keep:

-   name
-   hotel type
-   star rating
-   description

Explicitly dropped from the dummy UI/schema design:

-   category
-   established year
-   floors
-   total rooms

## Location

Use only fields actually in the current schema, such as:

-   city
-   address
-   ZIP
-   map location

Earlier dummy-only latitude/longitude/division/area/country fields were
not retained.

## Contacts

Keep:

-   email
-   reception number 1
-   reception number 2
-   website

Drop dummy-only social links and separate reservation phone.

## Description

Merged into General. One main description rather than separate
short/long descriptions.

## Amenities

Use real global amenities and a real picker.

## Gallery

Use actual `hotel_images`, not dummy placeholders.

## Policies

Custom hotel-authored policies use name + description.
Check-in/check-out times are stored separately in hotel details.

## Business & Documents

Business and Documents were merged.

The current `hotel_documents` design was intentionally simplified to:

``` prisma
id
hotel_id
document_type
file_url
created_at
updated_at
```

Earlier metadata fields such as document number, issue date, expiry
date, issued by, TIN number and VAT registration were later stripped
from the design. Do not re-add them without a new decision.

## Owner

Matches `hotel_owner_details`.

## Admin

Matches `hotel_admin_details`.

Hotel Admin fields discussed as required include:

-   image
-   full name
-   email
-   password
-   confirm password
-   date of birth
-   address
-   gender
-   passport
-   phone number
-   NID number

Document upload requirement: PDF and JPG. JPEG was explicitly not part
of the stated requirement.

------------------------------------------------------------------------

# 7. Room Architecture --- Most Important

The final room hierarchy is:

``` text
Hotel
└── Room Type
    ├── Room Variant A
    │   ├── Physical Room 301
    │   ├── Physical Room 302
    │   └── Physical Room 303
    │
    └── Room Variant B
        ├── Physical Room 401
        └── Physical Room 402
```

Definitions:

### Room Type

The hotel-level product/category, e.g. Premium, Deluxe, Standard, Suite.

### Room Variant

A persistent configuration under a Room Type.

Example:

``` text
2 × King
AC
Non-smoking
2 guests
320 sq ft
৳7,000 base price
```

### Physical Room

The actual inventory unit:

``` text
301
302
303
```

A guest should normally see the Room Type/Variant, not internal physical
room numbers.

------------------------------------------------------------------------

# 8. Persistent Room Variants

The project moved away from dynamic variant grouping.

Old architecture:

``` text
physical-room attributes
    ↓
dynamic grouping
    ↓
temporary variant
```

New architecture:

``` text
Room Type
    ↓
persistent Room Variant
    ↓
Physical Rooms
```

Do NOT dynamically reconstruct variants inside availability or the
frontend.

------------------------------------------------------------------------

# 9. Variant Matching

Utility:

``` text
src/lib/room-variant-matching.ts
```

It implements signature/hash matching and atomic find-or-create.

The intended concurrency-safe pattern is:

``` text
find matching variant
    ↓
if absent, create
    ↓
if unique constraint P2002 occurs
    ↓
retrieve the variant created by the competing transaction
```

## Matching rule

The default agreed rule is strict matching: variant-defining fields must
match exactly.

If a variant-defining field differs, the room should not reuse the
existing variant.

Images are excluded from the signature.

Why? Two otherwise identical configurations must not become different
variants just because different images were uploaded.

Variant naming was not finalized as a separate user-entered schema
field. Do not invent a manual variant-name requirement unless the
current schema already supports it or it is explicitly decided later.

------------------------------------------------------------------------

# 10. Room Creation

Room Type, Variant and Physical Room creation are direct Hotel Admin
operations.

## Single room

Concept:

``` text
Create Physical Room
    ↓
enter configuration
    ↓
match variant
    ↓
existing matching variant OR create new variant
    ↓
create physical room under variant
```

## Bulk room creation

Utility:

``` text
src/lib/room-number-parser.ts
```

Supports:

``` text
301-305
301,302,305
mixed formats
```

Zero-padding is preserved where applicable.

Bulk creation is transactional and checks hotel-wide room-number
collisions.

All rooms in one bulk submission share the submitted configuration and
normally resolve to the same variant.

------------------------------------------------------------------------

# 11. Room Editing

The room `[id]` API distinguishes:

## Physical-only fields

Changing these does not change the variant identity.

## Variant-defining fields

Changing these causes re-matching.

Concept:

``` text
edit room configuration
    ↓
match new signature
    ↓
existing variant OR new variant
    ↓
move room to that variant
```

This is direct CRUD.

No Case Review.

------------------------------------------------------------------------

# 12. Room Status

Separate endpoint:

``` text
src/app/api/hotel-admin/rooms/[id]/status/route.ts
```

Status changes do not perform variant matching.

Sub-Admin access was also planned/supported for room status operations.

------------------------------------------------------------------------

# 13. Room Deletion

Physical room deletion is soft deletion.

The variant should not automatically disappear merely because a physical
room is deleted.

------------------------------------------------------------------------

# 14. Room Images

Images moved from physical-room level to variant level.

New routes:

``` text
src/app/api/hotel-admin/room-variants/[variantId]/images/route.ts
src/app/api/hotel-admin/room-variants/[variantId]/images/[imageId]/route.ts
```

Images are appended rather than blindly replacing the existing variant
image collection.

Old route is obsolete:

``` text
src/app/api/hotel-admin/rooms/[id]/images/
```

Delete only after reference verification.

------------------------------------------------------------------------

# 15. Room Type Images

Room Type images are separate from Variant images.

The Hotel Admin UI should have Room Type image management.

The Room Type image is the primary visual for the Room Type.

Variant images are secondary and should be compact.

Avoid giant empty placeholders when no image exists.

------------------------------------------------------------------------

# 16. Room APIs

The newer direct-write room implementation includes:

``` text
prisma/schema.prisma

src/lib/room-variant-matching.ts
src/lib/room-number-parser.ts
src/lib/hotel-admin-activity.ts

src/lib/validations/room-type.ts
src/lib/validations/room.ts

src/app/api/hotel-admin/room-types/route.ts
src/app/api/hotel-admin/room-types/[id]/route.ts

src/app/api/hotel-admin/rooms/route.ts
src/app/api/hotel-admin/rooms/[id]/route.ts
src/app/api/hotel-admin/rooms/[id]/status/route.ts

src/app/api/hotel-admin/room-variants/[variantId]/images/route.ts
src/app/api/hotel-admin/room-variants/[variantId]/images/[imageId]/route.ts
```

Old room endpoints identified as obsolete:

``` text
src/app/api/hotel-admin/room-types/propose/
src/app/api/hotel-admin/room-types/history/
src/app/api/hotel-admin/rooms/[id]/images/
```

------------------------------------------------------------------------

# 17. Room Schema Migration

The newer schema added:

``` text
room_variants
room_variant_facilities
room_variant_bed_types
```

and re-pointed:

``` text
room_details
room_images
pricing_rules
room_bookings
```

Old:

``` text
room_detail_facilities
room_detail_bed_types
```

were removed because they were no longer referenced and there was no
live-data migration requirement at the time.

Verify the actual latest schema before making further migrations.

------------------------------------------------------------------------

# 18. Room Price Architecture

The current intended source of truth for base nightly price is:

``` text
room_variants.price
```

Physical rooms do not independently define commercial pricing.

Concept:

``` text
Physical Room
    ↓
belongs to Variant

Variant
    ↓
owns base price
```

This is important because rooms in the same variant should present the
same commercial configuration.

------------------------------------------------------------------------

# 19. Pricing Rule System

The old pricing model had:

``` text
pricing_rules.discounted_price
```

which was an absolute replacement price.

That does not fit the desired discount system.

The planned model introduces:

``` prisma
enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

enum PricingRuleStatus {
  ACTIVE
  PAUSED
}
```

and:

``` prisma
model pricing_rules {
  id
  room_variant_id
  name
  description
  discount_type
  discount_value
  status
  priority
  start_date
  end_date
  created_at
  updated_at
}
```

`discounted_price` should be removed.

Effective price is calculated, not stored as a replacement.

Before dropping an old column, check whether real rows exist.

------------------------------------------------------------------------

# 20. Pricing Rule Semantics

Example:

``` text
Base price: ৳7,000
10% discount
Effective price: ৳6,300
```

Fixed amount example:

``` text
Base price: ৳7,000
৳500 off
Effective price: ৳6,500
```

Validation must prevent invalid percentages and negative/invalid
effective prices.

------------------------------------------------------------------------

# 21. Pricing Status

Operational stored statuses:

``` text
ACTIVE
PAUSED
```

`EXPIRED` was proposed as a derived state based on the end date rather
than a stored enum value.

------------------------------------------------------------------------

# 22. Pricing Priority

Overlapping rules require deterministic selection.

`priority` was proposed.

Higher priority wins.

Do not independently implement different overlap logic in different
APIs.

------------------------------------------------------------------------

# 23. Central Pricing Resolver

A reusable server-side function should conceptually be:

``` text
getEffectivePrice(roomVariantId, date)
```

It should:

1.  Load the variant base price.
2.  Find applicable pricing rules.
3.  Ignore paused rules.
4.  Ignore rules outside the date range.
5.  Apply priority.
6.  Calculate effective price.
7.  Return a consistent result.

The same resolver must be used by:

-   availability
-   booking reservation
-   Hotel Admin previews/displays where appropriate
-   future pricing UI

Never duplicate pricing calculations across routes.

------------------------------------------------------------------------

# 24. Night-by-Night Pricing

A booking can contain different prices for different nights.

Example:

``` text
Aug 20 → ৳7,000
Aug 21 → ৳6,300
Aug 22 → ৳6,300
Aug 23 → ৳7,000
```

The system must calculate each stay date independently.

------------------------------------------------------------------------

# 25. Booking Price Snapshot

The recommended architecture is:

``` text
room_bookings
    ↓
room_booking_nightly_rates
```

Example:

``` text
room_booking_id | stay_date | price
101             | Aug 20    | 7000
101             | Aug 21    | 6300
101             | Aug 22    | 6300
101             | Aug 23    | 7000
```

This preserves historical pricing.

If pricing rules change later, an existing booking must not change.

Booking subtotal can be calculated from the sum of nightly rates.

------------------------------------------------------------------------

# 26. Public Hotel APIs --- Known Legacy

Known stale route:

``` text
src/app/api/public/hotels/[slug]/route.ts
```

It previously expected:

``` text
room_types.room_details
```

The current relationship is:

``` text
room_types
    ↓
room_variants
    ↓
room_details
```

Rewrite it against the current hierarchy.

------------------------------------------------------------------------

# 27. Availability API --- Known Legacy

Known stale route:

``` text
src/app/api/public/hotels/[slug]/availability/route.ts
```

It also used the old room shape.

It must become variant-rooted.

It must:

-   query persistent variants
-   determine physical-room availability
-   resolve effective nightly prices
-   return guest-facing variant data

It must not recreate variants dynamically.

------------------------------------------------------------------------

# 28. Old `room-grouping.ts`

Known legacy:

``` text
src/lib/room-grouping.ts
```

It used removed room fields such as:

``` text
room.ac
room.smoking_allowed
room.pet_allowed
```

and dynamically grouped rooms.

Once the availability route is rewritten and no references remain, this
file should be deleted.

------------------------------------------------------------------------

# 29. Public Room Presentation

Guests should normally see:

``` text
Room Type
    ↓
Variant
    ↓
Price
    ↓
Availability
```

not physical room numbers.

Example:

``` text
Premium Room

2 × King
2 Guests
320 sq ft

৳7,000/night
10% OFF
৳6,300/night

5 rooms available
```

The physical room is internal inventory.

------------------------------------------------------------------------

# 30. Booking Flow

The intended booking flow is:

``` text
Guest
 ↓
Hotel Search
 ↓
Hotel Details
 ↓
Room Types
 ↓
Room Variants
 ↓
Select Dates
 ↓
Availability Check
 ↓
Nightly Price Calculation
 ↓
Reservation
 ↓
RESERVED
 ↓
Confirmation
 ↓
BOOKED
```

------------------------------------------------------------------------

# 31. Booking Status / Reservation Hold

Important business rule:

``` text
RESERVED
    ↓
30 minute hold
    ↓
EXPIRED if not confirmed
```

Existing booking statuses include the relevant states:

``` text
RESERVED
BOOKED
EXPIRED
```

Do not assume old payment-oriented behavior.

------------------------------------------------------------------------

# 32. Booking Reserve API

Known route:

``` text
src/app/api/bookings/reserve/route.ts
```

This route is stale against the new schema.

Known issues:

-   treats `variant_id` as `room_details.id`
-   reads removed fields
-   queries `room_type_id` from the wrong model
-   writes `advance_amount`, which was removed from `user_bookings`

It needs a full rewrite.

The correct flow should be:

``` text
validate request
 ↓
validate dates
 ↓
validate variant
 ↓
check availability
 ↓
calculate nightly prices
 ↓
snapshot nightly rates
 ↓
create RESERVED booking
 ↓
set reserved_until
```

A final authoritative availability check must happen at reservation
time.

------------------------------------------------------------------------

# 33. Booking Confirm API

Known route:

``` text
src/app/api/bookings/[reference]/confirm/route.ts
```

It was previously identified as clean and should primarily perform:

``` text
RESERVED → BOOKED
```

It should not recalculate historical booking pricing.

------------------------------------------------------------------------

# 34. Booking Expiration

A background/cron mechanism is needed to find:

``` text
RESERVED
AND
reserved_until < now
```

and mark those bookings:

``` text
EXPIRED
```

This releases the inventory.

------------------------------------------------------------------------

# 35. Concurrency

Room variant matching already uses a concurrency-safe unique-constraint
strategy.

Booking reservation also needs concurrency protection.

Do not allow two simultaneous reservation requests to book the same
physical inventory incorrectly.

------------------------------------------------------------------------

# 36. Master Data Requests

Master Data is NOT auto-created by Hotel Admin.

Correct flow:

``` text
Hotel Admin
    ↓
Master Data Request
    ↓
PENDING
    ↓
System Admin notification
    ↓
System Admin reviews
    ↓
System Admin manually creates master data
    ↓
Request → APPROVED / REJECTED
```

Examples:

-   Amenity
-   Bed Type
-   other platform-level master data

The request is a workflow, not an automatic CRUD bridge.

------------------------------------------------------------------------

# 37. Master Data Request UI

Hotel Admin should have:

``` text
Master Data Requests
```

with:

-   request list
-   request status
-   request details
-   submitted date
-   requested master-data type

System Admin should have:

-   pending request list
-   request detail
-   requester
-   hotel
-   requested data
-   approve/reject
-   rejection reason where applicable

A pending request stays pending until System Admin acts.

------------------------------------------------------------------------

# 38. Notifications

System Admin should be notified when a Master Data Request is submitted.

Socket.IO can eventually be used for real-time notification delivery.

Do not make Master Data creation automatic.

------------------------------------------------------------------------

# 39. Socket.IO Architecture

Socket.IO runs separately from Next.js.

Concept:

``` text
Next.js frontend
      ↓
socket.io-client
      ↓
Separate Node Socket.IO server
```

The separate server uses Node's HTTP server.

Previously established local server:

``` text
localhost:4001
```

Next.js frontend:

``` text
localhost:3000
```

CORS was configured to allow the frontend origin.

The socket project was structured roughly as:

``` text
socket-server/
├── package.json
├── tsconfig.json
└── src/
    └── server.ts
```

Development uses `tsx watch`.

------------------------------------------------------------------------

# 40. Socket Authentication

JWT payload was discussed as containing:

-   user id
-   name
-   role

The socket server will eventually use JWT information for
identifying/authorizing connections.

The final production implementation was not fully completed in the
recorded discussion.

------------------------------------------------------------------------

# 41. Authentication

Authentication uses:

-   JWT
-   bcrypt
-   `jose`

Login APIs and admin APIs should remain separated.

Existing API conventions include:

``` text
/api/auth/system-admin/login
/api/auth/register
```

Do not move business logic into pages.

------------------------------------------------------------------------

# 42. Validation

Zod is used throughout the project.

Important areas:

-   Hotel Admin
-   Room Type
-   Room
-   Pricing Rule
-   Booking
-   Master Data Requests

Both client and server validation are required.

------------------------------------------------------------------------

# 43. System Admin Room Visibility

Known route:

``` text
src/app/api/system-admin/hotels/[id]/rooms/route.ts
```

It was previously stale because it read:

``` text
room_details.price
```

directly.

The current architecture should be:

``` text
room_type
    ↓
room_variant
    ↓
room_details
```

and price should come from the Variant architecture.

------------------------------------------------------------------------

# 44. System Settings Legacy Text

Known stale file:

``` text
src/app/dashboard/system/settings/page.tsx
```

It contained a description claiming:

``` text
pricing_rules override room_details.price;
room_types.base_price is display-only
```

This is no longer correct.

Current model:

``` text
room_variants.price = base price
pricing rules = effective-price modifiers
```

Update the text when working on that page.

------------------------------------------------------------------------

# 45. Hotel Admin Pricing Files

Expected pricing files:

``` text
src/app/api/hotel-admin/pricing/route.ts
src/app/api/hotel-admin/pricing/[id]/route.ts
src/app/dashboard/hotel/pricing/page.tsx
```

They were previously stubs:

-   API routes returned 501
-   pricing page returned null

They should become real after the pricing schema/resolver is finalized.

------------------------------------------------------------------------

# 46. Variant UI

Existing components include:

``` text
src/components/hotel-admin/rooms/variant-card.tsx
src/components/hotel-admin/rooms/variant-form-dialog.tsx
```

The Variant edit UI should preserve the distinction between:

``` text
base price
```

and:

``` text
pricing rules / offers
```

Do not overwrite the base price with the current discounted/effective
price.

------------------------------------------------------------------------

# 47. Room UI Design Rules

Hotel Admin room pages should feel like a professional PMS, not a
marketing site.

Important:

-   compact
-   information dense
-   strong hierarchy
-   dark theme
-   subtle borders
-   existing shadcn components
-   existing typography
-   blue primary actions
-   restrained badges
-   no giant empty placeholders
-   no excessive nested cards
-   no excessive side padding

Hierarchy:

``` text
ROOM TYPE
    ↓
VARIANT
    ↓
PHYSICAL ROOM
```

Room Type image is primary.

Variant image is secondary.

Physical rooms should be compact chips/cards.

------------------------------------------------------------------------

# 48. Current Room Pages

Conceptual Hotel Admin pages:

``` text
src/app/dashboard/hotel/rooms/page.tsx
src/app/dashboard/hotel/rooms/[roomTypeId]/page.tsx
```

Page 1:

``` text
Room Types
```

Page 2:

``` text
Room Type
 → Variants
 → Physical Rooms
```

No Physical Rooms/Room Types tabs are required.

------------------------------------------------------------------------

# 49. Current Hotel Admin Sidebar Concept

Known areas:

``` text
OPERATIONS
- Overview
- Bookings
- Guests
- Rooms

PROPERTY
- Property
- Draft Center
- Master Data Requests

BUSINESS
- Team
- Revenue
- Reviews
- Activity Log
- Settings
```

Exact latest sidebar should be verified against the current repository.

------------------------------------------------------------------------

# 50. Activity Logs

Utility:

``` text
src/lib/hotel-admin-activity.ts
```

was added as the first real writer for:

``` text
hotel_admin_activity_logs
```

Direct Hotel Admin operations can be audited here.

Potential events:

-   room type created
-   room type edited
-   room created
-   bulk rooms created
-   variant created
-   variant changed
-   room moved between variants
-   room status changed
-   pricing rule created/edited

Follow the existing event taxonomy instead of inventing incompatible
values.

------------------------------------------------------------------------

# 51. Old Booking Validation

`confirmBookingSchema` in:

``` text
src/lib/validations/booking.ts
```

was identified as dead because it required `payment_method` even after
the no-payment decision.

Verify zero importers before deletion.

------------------------------------------------------------------------

# 52. Payment Architecture

`advance_amount` was removed from `user_bookings`.

The current booking flow should not assume that field exists.

Do not reintroduce payment-related fields just because old booking code
references them.

------------------------------------------------------------------------

# 53. Recommended Remaining Work

Work one subsystem at a time.

## Phase 1 --- Pricing

1.  Verify latest schema.
2.  Verify `room_variants.price`.
3.  Finalize `pricing_rules`.
4.  Safe migration.
5.  Zod validation.
6.  Hotel Admin pricing CRUD.
7.  Effective-price resolver.
8.  Pricing tests.

## Phase 2 --- Public Hotel APIs

9.  Rewrite hotel details API.
10. Rewrite availability API.
11. Remove old dynamic grouping after reference verification.

## Phase 3 --- Booking Backend

12. Rewrite reserve API.
13. Add nightly booking price snapshots.
14. Final availability check.
15. Reservation hold.
16. Expiration mechanism.
17. Verify confirmation.

## Phase 4 --- Master Data

18. Master Data Request schema.
19. Hotel Admin request API/UI.
20. System Admin request API/UI.
21. Pending state.
22. Manual creation by System Admin.
23. Approve/reject.
24. Notifications.

## Phase 5 --- Case Review

25. Search all room references in Case Engine.
26. Remove runtime room case behavior.
27. Remove obsolete room proposal/history frontend calls.
28. Verify Property staging still works.

## Phase 6 --- System Admin

29. Verify room visibility API.
30. Update stale price assumptions.
31. Verify room hierarchy.

## Phase 7 --- Public/Booking UI

32. Hotel search.
33. Hotel details.
34. Variant display.
35. Availability.
36. Pricing display.
37. Booking form.
38. Reservation.
39. Confirmation.

## Phase 8 --- Integration

40. Full typecheck.
41. API tests.
42. Booking race/concurrency tests.
43. Pricing edge cases.
44. Case Review regression tests.
45. Master Data Request tests.
46. Final cleanup only after reference verification.

------------------------------------------------------------------------

# 54. Testing Checklist

## Room

-   Single room creation
-   Bulk room creation
-   `301-305`
-   comma-separated rooms
-   duplicate room number
-   same configuration → same variant
-   different configuration → different variant
-   image changes do not create new variant
-   variant-defining edit → re-match
-   physical-only edit → no re-match
-   soft delete
-   status update

## Pricing

-   no pricing rule
-   percentage discount
-   fixed discount
-   active rule
-   paused rule
-   expired date range
-   future date range
-   overlapping rules
-   priority
-   invalid percentage
-   invalid fixed amount
-   invalid date range

## Availability

-   all rooms available
-   some rooms booked
-   all rooms unavailable
-   date boundaries
-   different nightly prices
-   correct variant grouping
-   correct effective price

## Booking

-   valid reservation
-   unavailable reservation
-   race/concurrency
-   nightly snapshot
-   subtotal
-   reserved state
-   confirmation
-   expiration

## Case Review

Verify that:

-   Room Type creation does NOT create a case.
-   Room Type edit does NOT create a case.
-   Room Variant creation does NOT create a case.
-   Room Variant edit does NOT create a case.
-   Physical Room creation does NOT create a case.
-   Physical Room edit does NOT create a case.
-   Physical Room status does NOT create a case.
-   Property changes that require approval still create DRAFTING cases.
-   Submit changes DRAFTING → PENDING.

## Master Data

-   request creation
-   pending state
-   System Admin notification
-   System Admin approval
-   manual master-data creation
-   rejection
-   rejection reason
-   request history/status

------------------------------------------------------------------------

# 55. Legacy Search Terms

Before removing or trusting old code, search the repository for:

``` text
room-grouping
room-types/propose
room-types/history
room_details.price
room_types.room_details
room_details.room_type_id
room.ac
room.smoking_allowed
room.pet_allowed
advance_amount
discounted_price
CaseEntityType.ROOM_TYPE
CaseEntityType.ROOM_TYPE_IMAGE
CaseEntityType.ROOM_FACILITY
CaseEntityType.ROOM_DETAIL
```

These are strong indicators of old architecture.

------------------------------------------------------------------------

# 56. Important Current Architectural Contrasts

## Old

``` text
Room Type
  ↓
Room Details
  ↓
dynamic grouping
```

## Current

``` text
Room Type
  ↓
Persistent Room Variant
  ↓
Physical Rooms
```

------------------------------------------------------------------------

## Old pricing

``` text
room_details.price
```

## Current

``` text
room_variants.price
```

plus:

``` text
pricing_rules
```

------------------------------------------------------------------------

## Old room approval

``` text
Hotel Admin
 ↓
Case
 ↓
System Admin
 ↓
Live Room
```

## Current

``` text
Hotel Admin
 ↓
Direct Room Type / Variant / Room CRUD
 ↓
Live immediately
```

------------------------------------------------------------------------

## Property approval

``` text
Hotel Admin
 ↓
DRAFTING
 ↓
PENDING
 ↓
System Admin
 ↓
Approve/Reject
```

------------------------------------------------------------------------

# 57. Important Cautions for the Next AI

Do not:

-   revert rooms into Case Review
-   recreate dynamic variants
-   move price back to physical rooms
-   use `room_details.price`
-   use old `room_types.room_details`
-   use old room facility tables
-   use old per-room image routes
-   use `discounted_price` as final architecture
-   recalculate historical booking prices
-   auto-create Master Data from a Hotel Admin request
-   delete files without checking references
-   modify unrelated domains while fixing one subsystem
-   build booking UI against stale APIs
-   assume old payment fields still exist

------------------------------------------------------------------------

# 58. Final Architecture

``` text
                         SYSTEM ADMIN
                              │
             ┌────────────────┼─────────────────┐
             │                │                 │
             ▼                ▼                 ▼
       Property Review   Master Data       Room Visibility
             │                │
             ▼                ▼
        Case Engine       Manual Creation
             │
             ▼
         Live Property


                         HOTEL ADMIN
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
      Property              Rooms              Pricing
          │                   │                   │
          ▼                   ▼                   ▼
   Case Review         Room Type           Base Price
          │                   │                   │
          ▼                   ▼                   ▼
 DRAFTING → PENDING     Room Variant      Pricing Rules
                              │                   │
                              ▼                   ▼
                       Physical Rooms      Effective Price
                                                  │
                                                  ▼
                                           Nightly Price
                                                  │
                                                  ▼
                                           Booking Snapshot


                         PUBLIC GUEST
                              │
                              ▼
                         Hotel Search
                              │
                              ▼
                         Hotel Details
                              │
                              ▼
                          Room Types
                              │
                              ▼
                           Variants
                              │
                              ▼
                         Availability
                              │
                              ▼
                       Effective Pricing
                              │
                              ▼
                         Reservation
                              │
                              ▼
                          RESERVED
                              │
                       30-minute hold
                       ┌──────┴──────┐
                       ▼             ▼
                   CONFIRMED      EXPIRED
                       │
                       ▼
                    BOOKED
```

------------------------------------------------------------------------

# 59. Final Handoff Instruction

When opening a new AI session, provide this document first and say:

> Read the entire MyHotels architecture document before changing
> anything. This is the current project context. Verify the repository
> against it. Room Type, Room Variant and Physical Room management are
> direct Hotel Admin operations and must NEVER be routed through Case
> Review. Persistent Room Variants are the source of grouping; do not
> dynamically recreate them. `room_variants.price` is the base price.
> Pricing Rules modify the effective nightly price. Booking must
> snapshot nightly prices. Master Data Requests stay pending until
> System Admin manually handles them. Do not delete old files without
> checking references. Work one subsystem at a time and report
> discrepancies before making architectural changes.

Then tell the AI the exact next subsystem to work on, rather than asking
it to change the entire project at once.

------------------------------------------------------------------------

# 60. Current Priority

At the end of the previous working session, the recommended next focus
was:

**Pricing Rule System → Effective Price Engine → Availability → Booking
Backend.**

Do not jump directly into booking UI.

The dependency chain is:

``` text
Room Variant Base Price
        ↓
Pricing Rules
        ↓
Effective Price Resolver
        ↓
Availability
        ↓
Booking Reservation
        ↓
Nightly Price Snapshot
        ↓
Booking Confirmation / Expiration
        ↓
Public Booking UI
```

This dependency order should be preserved.
