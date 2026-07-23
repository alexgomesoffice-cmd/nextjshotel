# GhuriBangla — Project Context

> This document is a complete handoff of everything decided across an extended design conversation for rebuilding GhuriBangla's System Admin CMS and the surrounding hotel/booking platform. It reflects the **final, agreed-upon state** — not a turn-by-turn history — with a short callout section near the end for the non-obvious decisions a naive read of the schema wouldn't reveal, and a section flagging the couple of things that are NOT yet resolved.

## 1. What This Is

GhuriBangla is a Next.js (App Router) hotel booking platform. Prisma + MySQL/MariaDB, JWT-in-httpOnly-cookie auth (custom, no NextAuth), Zod validation, shadcn/Tailwind on the frontend, a separate Socket.IO server for real-time push, Vercel Cron for scheduled jobs. This project is a **redesign of the System Admin CMS** and the surrounding Hotel Admin / booking flow — not a greenfield build. A working booking platform already existed; this conversation redesigned its admin/review/publishing architecture and corrected several schema decisions along the way.

## 2. Core Philosophy

- **System Admin** is the platform operator. Flat structure — **no super-admin tier** — any system admin can create another system admin with identical abilities (self-referencing `created_by` on `system_admins`).
- **Hotels are never self-registered.** System Admin manually onboards every hotel: fills one form capturing the hotel, its owner, its business documents, AND creates the Hotel Admin account, all in a single transaction. The hotel starts `UNPUBLISHED`.
- **Hotel Admin cannot publish anything directly.** They log in, set up their hotel (profile, room types, rooms, gallery, amenities, policies, documents), then submit for review. System Admin approves or rejects field-by-field. Approval of the first-ever case is what flips the hotel to `PUBLISHED`.
- **System Admin ALSO retains a direct-edit override.** This is important and easy to get wrong: unlike the "review-only" assumption you'd expect from a pure approval-gated system, System Admin can go into any hotel's page and edit fields directly, bypassing the case system entirely, **in addition to** the normal review flow being the main path for Hotel Admin's own changes. Both mechanisms coexist.
- **Every subsequent Hotel Admin edit — the first submission and every one after — goes through the exact same review mechanism.** There is no special-cased "first submission" vs. later ones. the showing order will be first-in-first-out in admin panel, meaning which ever hotel admin submits first will be seen first.

## 3. Actor & Role Model

Four actor types (`ActorType` enum): `SYSTEM_ADMIN`, `HOTEL_ADMIN`, `HOTEL_SUB_ADMIN`, `END_USER`. Each has its own table (no shared polymorphic users table). Auth cookies: `token_system_admin`, `token_hotel_admin` (shared by both Hotel Admin and Hotel Sub-Admin — differentiated inside the JWT payload's `actor_type`), `token_user`.

- **System Admin**: flat, no hierarchy. Creation now also captures `nid_no` (→ `system_admin_details`) and a photo (→ `system_admin_images`) — these columns existed unused in the schema before this redesign; the admin-creation endpoint just needs to start using them.
- **Hotel Admin**: exactly 1 hotel per admin (`hotel_admins.hotel_id @unique`). Creates their own Hotel Sub-Admins.
  - **`email` is permanently immutable** — set once at creation by System Admin, no edit path exists anywhere, reviewed or otherwise.
  - **`password` changes are immediate**, no review — a plain account-security action, separate from content review.
  - **Everything else about their identity** (name, phone, dob, NID, passport, address, photo) **goes through case review**, same as hotel content.
  - Staff (Sub-Admin) creation now also captures `phone`, `nid_no`, and a photo (→ `hotel_sub_admin_details`/`hotel_sub_admin_images`) — same story as System Admin, columns existed unused, just need wiring.
- **Hotel Sub-Admin**: scope was **narrowed** during this redesign. They used to have full room CRUD; now they can **only** maintain room availability/status and handle bookings/reservations. They can no longer create or delete physical rooms — that's Hotel-Admin-only now. Granular/custom permissions beyond this fixed scope are explicitly deferred to a later pass.
- **End User** (guest): browses/books. `end_user_details` already carries `phone`/`address`/`nid_no`/`passport`/`country`/`dob`/`gender` — used directly in the booking confirmation flow (Section 8).

## 4. Hotel Lifecycle

`ApprovalStatus` enum: `UNPUBLISHED` (renamed from an earlier `DRAFT` — same meaning: created by System Admin, not public) → `PUBLISHED` (first case approved) → `SUSPENDED` (System Admin can toggle this directly at any time, always was a direct action, unaffected by any of this redesign).

## 5. The Case / Review System — the central mechanic

This is the single biggest structural change in the whole redesign.

- **One hotel, one case at a time.** Only one case may be open (not yet decided) per hotel. While a case is `PENDING`, the Hotel Admin's Draft Center is **locked** — no further edits until System Admin decides.
- **The lock lifts the instant System Admin decides** (approve or reject) — **not** on any fixed timer. Hotel Admin can immediately start drafting again the moment a decision lands.
- **Case status lifecycle**: `DRAFTING` (accumulating staged edits, invisible to Review Queue) → `PENDING` (submitted, System Admin can see it) → `APPROVED` / `REJECTED`.
  - Every edit Hotel Admin makes while unlocked silently creates (or reuses) a `DRAFTING` case and **upserts** a `case_field_changes` row — editing the same field twice before submitting just updates the proposed value in place, not a duplicate row.
  - **"Submit for Review"** is a distinct, explicit action that flips `DRAFTING → PENDING`. This is the only thing that makes a case visible to System Admin.
  - There is no scenario where two cases need to be "merged" — a fresh `DRAFTING` case is only ever created after the previous one is fully decided, so there's never more than one active editing surface per hotel.
- **Review Queue** (name confirmed explicitly — NOT "Work Queue," which only ever appeared in an early reference screenshot). Strictly **First Come First Serve** — no priority, no per-admin assignment (deferred to later), every System Admin sees the identical queue. **No change-type/category labels** on cases (an early reference screenshot showed `REGISTRATION`/`IDENTITY`/`PROPERTY`/`LEGAL`/`PUBLICATION` badges — explicitly rejected; a case is generic, not categorized).
- **Case review mechanics**: side-by-side live-value vs. proposed-value diff, field by field. Unchanged fields aren't shown. Per field: **Reject** (reason required) or leave alone. Two bulk actions: **Approve Remaining** (publishes everything not explicitly rejected) and **Reject Entire Request** (discards everything). No per-field "approve" button exists — approval only happens via the bulk action.
- **Rejections are consolidated for Hotel Admin** — every rejected field's reason, across every case they've ever had, surfaces in one place (`GET /cases/rejections`-style view), not scattered per-case.
- **Documents ride inside the same case as everything else** — there's no separate document-approval track.
- There is **no self-service hotel registration** anywhere, and this was explicitly confirmed twice (an early reference screenshot implying a prospective owner could submit a registration case themselves was called out as an error).

### `cases` / `case_field_changes` schema mechanics
- `cases`: `hotel_id`, `submitted_by` (a `hotel_admins.id`), `status`, `summary`, `submitted_at`, `decided_by` (a `system_admins.id`), `decided_at`.
- `case_field_changes`: `case_id`, `entity_type` (`CaseEntityType` enum — see below), `entity_id` (**null** means this row describes a brand-new record that doesn't exist yet), `field_name` (**null** means the whole row IS the new record, with `proposed_value` holding the complete JSON payload), `previous_value`, `proposed_value`, `status`, `rejection_reason`.
- No DB-level FK from `case_field_changes` to the actual target tables — it's polymorphic across many tables via `entity_type`, validated at the application layer, not the database.
- `CaseEntityType` values and what each covers: `HOTEL` (hotels + hotel_details fields), `HOTEL_OWNER`, `HOTEL_ADMIN` (identity fields only — never email/password, see Section 3), `HOTEL_IMAGE` (gallery), `HOTEL_DOCUMENT`, `AMENITY` (both a hotel's amenity *selection* and creating a brand-new custom amenity — both reviewed), `POLICY`, `ROOM_TYPE` (name/description only), `ROOM_TYPE_IMAGE`, `ROOM_DETAIL` (creating a new physical room — a whole-new-record proposal, same shape as a new room type), `ROOM_FACILITY` (a physical room's facility selection), `BED_TYPE` (creating a new custom bed type).

## 6. Reviewed vs. Immediate — the full, final split

**Immediate / direct write, no review, ever:**
- Room status updates (`AVAILABLE`/`BOOKED`/`CHECKED_IN`/`CHECKED_OUT`/`MAINTENANCE`) specifically — creating the room is reviewed (below), but transitioning its status is not
- Room pricing (`pricing_rules`, now scoped per physical room) and the room's own base `price`
- Room availability / booking calendar
- Bookings/reservations (the guest-facing flow, Section 8)
- Hotel Admin's own password change
- System Admin's direct hotel edits (the override door, Section 2)
- Creating a global CMS entry as System Admin (amenity, bed type, room type, room facility) — these were never gated, only a *hotel's own custom* version of each is reviewed

**Reviewed (goes through the case system):**
- Hotel profile & business identity (`hotels`/`hotel_details` fields)
- Hotel owner info
- Hotel Admin's own identity fields (not email/password)
- Documents (upload or replace)
- Gallery images
- Amenity selection AND creating a new custom amenity
- Creating a new custom bed type
- Policies (create/edit/delete — hotel-authored content, always reviewed)
- Room types — creating one is a whole-new-record proposal; since a room type is now just name/description (Section 7), essentially the *entire* room type is reviewed content, there's no operational/descriptive split needed on it anymore
- **Physical room creation** (`room_details`, `entity_type: ROOM_DETAIL`) — a brand new room is a whole-new-record proposal, exactly like a new room type. Confirmed: creation is reviewed, but a room's **status** is explicitly not (see immediate list above). 🟡 Not yet confirmed: whether editing an *existing* room's other fields (price, room number, floor, size, max occupancy) or deleting one also goes through review, or stays immediate the way pricing is — flagged in Section 10.
- A physical room's **facility selection** specifically (`ROOM_FACILITY`)

**Separate mechanism entirely — `master_data_requests`, not the case system:**
Hotel Admin can request System Admin add something to the *global* catalog they couldn't find (amenity/bed type/room type/room facility). This isn't proposing a change to their own hotel's content — it's asking System Admin to expand what's available platform-wide. When System Admin manually creates the requested global item, they set `created_entity_id` on the request row to trace which row resulted, mark status `FULFILLED`, and send a notification to the requester. Room facilities specifically are entirely System-Admin-owned with no hotel-custom creation path — Hotel Admin only picks from the global list or submits a request.

## 7. Entity Model Walkthrough

- **`hotels`**: `map_location` (a plain string, e.g. a Google Maps embed URL — confirmed as a simple string, no structured coordinates) replaced the old `latitude`/`longitude`. `approval_status` default is `UNPUBLISHED`.
- **`hotel_details`**: `short_description` removed entirely (not wanted). `emergency_contact_relation` renamed to `emergency_contact_designation` (job title, not family relation). `tin_number`/`vat_registration` text fields removed — TIN and VAT are now just uploaded documents (`hotel_documents` with `TIN_CERTIFICATE`/`VAT_CERTIFICATE` types), no structured number/date fields anywhere for them. All cancellation-policy fields removed (`cancellation_policy`/`cancellation_hours`/`refund_percent`) — **cancellation policy is not being dealt with in this system at all**, the enum itself (`CancellationPolicy`) was deleted since nothing references it anymore. Only `check_in_time`/`check_out_time` remain as the hotel-level policy.
- **`hotel_owner_details`** + **`hotel_owner_images`**: new, 1:1 with hotel. Owner never logs in — identity/legal info only, captured by System Admin at onboarding.
- **`hotel_documents`**: pure file uploads (PDF/JPEG only) — **no structured metadata fields at all**. No document number, no issue/expiry date, no issuer. This applies to every document type including Trade License — it's just a file. `document_type` enum: `TRADE_LICENSE`, `TAX_CERTIFICATE`, `TIN_CERTIFICATE`, `VAT_CERTIFICATE`, `BUSINESS_DOCUMENT`, `OWNER_DOCUMENT`, `ADMIN_DOCUMENT`.
- **`room_types`**: reduced to **just a name/description classification** — `id`, `hotel_id` (nullable), `is_default`, `name`, `description`, `is_active`. Same `is_default`+nullable-`hotel_id` pattern as `amenities`/`bed_types`: System-Admin-authored global entries (`is_default: true, hotel_id: null`) are name/description templates only, not bookable, not linked to any hotel; a hotel's own room type is always a brand new row with `hotel_id` set — **there is no FK link between a hotel's room type and a global one**, the global list is purely a naming reference, exactly like a hotel's amenity selection can point at either a default or custom amenity row without "owning" it. **All pricing, occupancy, and cancellation-policy fields were removed from `room_types` and moved to the physical room level** — a room type no longer carries `base_price`, `room_size`, `max_occupancy`, or any check-in/out time (the hotel has check-in/out time, not the room type).
- **`room_details`** (physical rooms) is where all of that operational data actually lives now: `price` (base nightly rate for this specific room), `room_size`, `max_occupancy` (guest count — moved down from room type), `status`. **Creating a new physical room is reviewed** — a whole-new-record proposal via the case system, exactly like a new room type (confirmed; the schema's own comment "Created by hotel admin via case system" was correct, not stale — see Section 10 for the one remaining loose thread on edits-after-creation). **Room status changes are explicitly not reviewed** — status transitions stay immediate regardless of the room's creation being gated. Bed configuration (`room_bed_types`) and room-type-level amenities (`room_properties`, using `amenities` with `context: ROOM`) stay attached to `room_types`, unchanged — confirmed these did NOT need to move down alongside pricing/occupancy.
- **`room_facilities`** + **`room_detail_facilities`**: brand new, replaces the old flat `ac`/`smoking_allowed`/`pet_allowed` booleans on `room_details`. Same `is_default`+nullable-`hotel_id` pattern, but selected **per physical room**, not per hotel or per room type — these are structural/physical properties of one specific room (AC, smoking allowed, pet allowed, etc.), not marketing amenities. Selection is reviewed (Section 6).
- **`pricing_rules`**: moved from `room_type_id` to **`room_detail_id`** — pricing is per physical room, not per room type. Restructured around `discounted_price` (rather than a generic `price`) with `start_date`/`end_date` — `room_details.price` is the base rate; a `pricing_rules` row is a scheduled discount override that reverts to base price once `end_date` passes.
- **`policies`**: always `hotel_id`-owned, no System-Admin-authored global defaults (unlike amenities/bed types) — Hotel Admin authors free-text policies entirely themselves; System Admin only has read visibility via the case review flow, never authors or approves them independently.
- **`master_data_requests`**: `hotel_id`, `requested_by`, `category` (`AMENITY`/`BED_TYPE`/`ROOM_TYPE`/`ROOM_FACILITY`), `note`, `status` (`PENDING`/`FULFILLED`/`DISMISSED`), `resolved_by`, `created_entity_id` (traces the auto-created row).
- **Activity logs**: **three separate physical tables**, not one shared/polymorphic table — `system_admin_activity_logs`, `hotel_admin_activity_logs` (Sub-Admin actions fold in here too, tagged via `actor_type`), `end_user_activity_logs`.
- **Notifications**: same split, **three separate tables** — `system_admin_notifications`, `hotel_admin_notifications` (Sub-Admin folds in via `recipient_type`), `end_user_notifications`.
- **`user_bookings`**: no payment fields anywhere (`payment_method`/`transaction_id`/`paid_at`/`advance_amount` all removed — there is no payment system). `reserved_until` stays — it's the 5-minute hold mechanism, unrelated to payment.

## 8. Booking Flow (guest-facing)

**There is no payment system in this platform, full stop.** This was the one thing removed from an otherwise-unchanged existing booking mechanism — everything else about the hold/expire infrastructure stays exactly as it already worked before this conversation:

1. Guest browses/searches (public, unauthenticated) and picks a room + dates.
2. Clicking **"Reserve"** forces login if not already authenticated, then **immediately creates the 5-minute hold** — a `user_bookings` row with `status: RESERVED` and `reserved_until = now + 5min`, plus matching `room_trackers` rows that actually lock the room against double-booking. This is the very first click, not a later one.
3. Guest lands on a confirmation page pre-filled from their profile: name, **email (locked, never editable)**, phone (**required** — if missing from profile, they must enter it here, and it saves back to `end_user_details`, no separate per-booking snapshot), address (optional, same fetch/save-to-profile/editable-inline behavior), NID (optional, same behavior), and a free-text special request field.
4. If the guest navigates back / abandons before confirming, the hold releases (the existing `expire` endpoint already supports this).
5. Clicking **"Confirm Booking"** flips the booking to `status: BOOKED` — no payment step, no payment fields collected or required anywhere in this flow.
6. Price is locked in from what was shown at the initial "Reserve" click — **not** recalculated at confirm time.
7. The existing 5-minute client-side countdown timer and the `cron/expire-bookings` backup sweep (every 5 minutes) both stay exactly as they already worked — none of that infrastructure changes, only the payment step was removed from `confirm`.

## 9. Room Status — kept in sync with real bookings

`RoomStatus`: `AVAILABLE` / `BOOKED` / `CHECKED_IN` / `CHECKED_OUT` / `MAINTENANCE`. `BOOKED` is **auto-synced** off real `room_trackers` data — if a reservation covers today, it shows Booked, automatically, no manual toggle involved. Hotel Admin/Sub-Admin can manually move a room through `CHECKED_IN → CHECKED_OUT → AVAILABLE`, or pull it into `MAINTENANCE` at any time regardless of booking state.

## 10. Resolved Decisions (Updated & Finalized)

1. **Editing & Deleting Existing Physical Rooms**: Creation, editing non-status/non-price fields (`room_number`, `floor`, `room_size`, `max_occupancy`), and deletion of physical rooms ALL go through case review (`CaseEntityType.ROOM_DETAIL`). Only room status (`AVAILABLE`/`BOOKED`/`MAINTENANCE`) and room pricing/pricing rules remain immediate writes.
2. **Room Facilities Creation**: System-Admin-owned ONLY. Hotel Admins cannot create custom room facilities for their hotel. They can only select from global room facilities or submit a `master_data_requests` entry asking System Admin to create a new global facility.
3. **`master_data_requests` Fulfillment Flow**: Manual fulfillment (no auto-creation). When Hotel Admin requests a new item, System Admin manually creates the global item (`is_default: true, hotel_id: null`), links it via `created_entity_id`, updates status to `FULFILLED`, and notifies the hotel admin.
4. **Platform Settings**: No `platform_settings` table. Out of scope.

## 11. Explicitly Out of Scope / Deferred

- Hotel Sub-Admin granular/custom permissions beyond the current fixed (narrowed) scope.
- The Hotel Admin dashboard's visual redesign — a reference screenshot exists but System Admin was prioritized first; nothing has been designed against that reference yet.
- Revenue page, Guests list page, Staff "new" page — currently non-functional stubs in the codebase, staying stubs for now.
- Email/SMS notification delivery — in-app only (bell icon + notification tables), nothing external.
- Any payment system, of any kind, ever, per this conversation.
- Frontend component work — this entire conversation has been backend/schema/API-first; a set of existing Lovable-built frontend screens exist as visual reference but haven't been reconciled against this backend design yet.

## 12. Where Things Stand

- **Schema**: finalized (the version you just pasted, modulo the two flagged discrepancies in Section 10).
- **API file structure & per-route logic**: mapped out in detail (folder structure for `src/app/api/system-admin/*` and `src/app/api/hotel-admin/*`, plus the shared `case-engine.ts`/`activity-log.ts`/`notify.ts` library modules) — in progress as a separate reference document, not yet finished end to end.
- **Frontend**: not started against this backend design yet.
