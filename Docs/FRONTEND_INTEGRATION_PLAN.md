# Frontend Integration Plan — `glow-hotel-connect` → Next.js

> Read every page, component, mock-data file, and the API service layer in the uploaded frontend zip. Stack: Vite + React 18 + react-router-dom v7 + shadcn/Tailwind + TanStack Query — same UI library as the Next.js app, different router/build tool, so components port over with import-path changes, not rewrites.

## 0. The Headline Finding

There are **two separate admin implementations** in this zip:
- **`src/pages/admin/*`** (`AdminDashboardHome`, `AdminClientList`, `AdminCurrentHotels`, etc.) + `src/services/adminApi.ts` — an older, simpler admin panel wired against a completely different, simpler API contract (`/api/hotels`, `payment_status`, flat `owner_name`, `emergency_contact1/2` on the hotel record directly). This predates the case-review redesign entirely and doesn't match our schema at all.
- **`src/pages/admin/ops/*`** — the enterprise CMS redesign, visually matching the earlier reference screenshots exactly (GhuriBangla OPS branding, sidebar groups, Work Queue, Case Review diff view). **This is the one to build from.** But it was built against the reference screenshots and the *original* text brief — **before** several corrections we made together in this conversation. It's currently 100% mock-data-driven (`src/data/adminCases.ts`, `adminStore.ts`) with zero real API calls.

Your instruction to focus on the admin panel first lines up with `admin/ops/*` being the closer match — but it needs real reconciliation against our locked schema before it's just a matter of wiring up APIs.

## 1. Mismatches Between the Frontend and Our Locked Design — Reconcile Before Building

These aren't nitpicks — each one means either the frontend UI or a piece of copy needs to change, since they encode decisions we explicitly reversed.

1. **Case "type" labels are back.** `adminCases.ts` defines `CaseType = "registration" | "property" | "legal" | "identity" | "bank" | "publication" | "protected_field"`, and `OpsCaseReview`/`OpsWorkQueue` display these as badges. We explicitly killed this: *"any change is a change, requires no labeling."* This needs removing from the UI, not just the data layer.
2. **"Bank Account" / "Bank Routing" fields exist** in `PROTECTED_FIELDS` and a mock case (`CASE-2037`, type `"bank"`). There is no banking/payout concept anywhere in our schema. Cut entirely.
3. **The self-registration scenario is still baked in** — `CASE-2036`, `Rafiq Islam`, `rafiq@greenhills.bd`, hotel name going from `null → "Green Hills Lodge"` — the exact scenario from the reference screenshot that you called an error. This mock case needs removing or completely re-authored to reflect System-Admin-only hotel creation.
4. **"Work Queue" is still the label** in `OpsShell`'s nav and route (`/admin/work-queue`) — you explicitly said *"name it review queue."* Rename throughout (nav label, route crumbs, page title).
5. **Room pricing/inventory appear as reviewable diff fields.** `RoomPriceDiff` (`currentPrice`/`requestedPrice`/`currentInventory`/`requestedInventory`) and `"Room Price"`/`"Room Inventory"` in `STANDARD_FIELDS` treat pricing as something System Admin reviews. We confirmed pricing/availability are always immediate, never reviewed. This entire diff type doesn't belong in the Case Review UI.
6. **Add Hotel form (`OpsCreateHotel.tsx`) still has the old document shape**: `Trade License No.` / `Issue Date` / `Expiry Date` / `Issued By` as separate text inputs, plus `TIN Number` and `VAT Registration` as required **text fields**. We locked in: documents are file-only (PDF/JPEG), no structured metadata anywhere, and TIN/VAT are uploaded certificates (`TIN_CERTIFICATE`/`VAT_CERTIFICATE`), not text fields. This form's "Hotel (Business Information)" section needs rebuilding as pure upload fields.
7. **Emergency contact still says "Relation"** (`em_relation`) — we renamed this to **Designation**. One-line fix, but easy to miss.
8. **`HotelAdminAddRoom.tsx` treats "room type" as carrying `base_price`, `max_occupancy`, `room_size`** — the pre-correction shape. Our locked schema strips `room_types` down to name/description only; all of that now lives on `room_details` (the physical room). This form conflates room-type creation and physical-room creation into one step; they need separating (room type = name/description proposal via case; physical room = the real form with price/size/occupancy/facilities, itself also case-reviewed per your last correction).
9. **Bed type is selected per physical room** in `HotelAdminAddRoom.tsx` (`physicalRooms[i].bed_type`). Per your confirmed A6, bed configuration stays at the **room type** level (`room_bed_types`), not per physical room. Needs moving up a level.
10. **`HotelAdminPropertyListing.tsx`'s "Policies" section is a fixed settings panel** (Check-in, Check-out, Children, Smoking, Pets, Extra Bed toggles) — not the free-form, hotel-authored named-policy list our `policies` table models. Also, Check-in/Check-out time belongs on `hotel_details` directly in our schema, not bundled inside "Policies" at all. This section needs rebuilding as a dynamic add/edit/remove list of `{name, description}` policies, with check-in/out time pulled out into the general/details section instead.
11. **`HotelAdminSettings.tsx` has an editable "Contact Email" field** that reads ambiguously as the Hotel Admin's own login email. If it is, it must be locked read-only (email is permanently immutable per our design) — if it's meant to be the hotel's own public contact email (a `hotel_details` field), it should be relabeled and moved out of "Settings" into the property/details section so it isn't confused with the account email next to the Password section on the same page.
12. **`HotelAdminSettings.tsx` has email/SMS notification-channel toggles** (booking emails, review emails, SMS, push). We're explicitly not building external notification delivery — in-app only. These toggles don't correspond to anything backend-side; either remove them or repurpose the section to show in-app notification *type* preferences instead (still a stretch goal, not urgent).

## 2. What's Missing Entirely — Needs Building From Scratch

- **Room Types catalog page** (System Admin) and **Room Facilities catalog page** (System Admin) — `OpsCatalog`'s `DATASETS` object currently only has `cities`/`hotel-types`/`amenities`/`bed-types`. Adding two more keys is cheap given the existing pattern, but the pages/routes/nav entries don't exist yet.
- **Master Data Requests page** (System Admin) — no page, no route, no nav entry, no mock data. Entirely new.
- **Hotel Admin's master-data-request submission UI** — "can't find what you need, send a request" — doesn't exist anywhere in the Hotel Admin pages either.
- **Real Notifications** — the bell icon in `OpsShell` has no click handler and no panel at all (just a red dot). `HotelAdminLayout` likely has the same gap (not yet confirmed — worth checking when we get there). Needs an actual dropdown/panel component on both sides.
- **Per-room facility selection UI** (Hotel Admin) — nothing in `HotelAdminAddRoom`/`HotelAdminEditRoom` handles AC/smoking/pet-allowed-style facility selection at all currently (the old flat booleans this replaced aren't present in the form either, so this is a genuine net-new piece of UI, not a replacement of something visible).
- **Per-room pricing (discount + date range) UI** replacing whatever the old per-room-type pricing assumed — needs to be built against `pricing_rules.room_detail_id`.
- **Availability calendar page** (Hotel Admin) — not present in the routes at all.
- **Activity Log + Notifications pages on the Hotel Admin side** — not present.
- **Amenity/bed-type *custom creation* going through review** — the UI would need a visual treatment for "pending my new amenity" that doesn't exist yet (the existing `RequestedChangesDiff` component is case-detail-only, built for System Admin's review screen, not for showing a Hotel Admin their own pending proposals inline).

## 3. What's Already Solid — Reuse As-Is

- `OpsShell.tsx`'s overall layout (collapsible sidebar, sticky header, ⌘K command palette, breadcrumb) — visual structure is good, just needs nav-label/route fixes (§1.4) and real data instead of the `CASES` mock import.
- `RequestedChangesDiff.tsx` — the live-vs-proposed diff component is exactly the mechanic we designed; once the mock `DiffField`/`CaseRecord` shapes are trimmed of the mismatched pieces (§1), this is very close to done.
- `OpsWorkQueue`, `OpsHotels`, `OpsBookings`, `OpsActivityLog`, `OpsCreateHotel` (once §1.6 is fixed), `OpsHotelWorkspace` — all structurally sound, need real API wiring, not redesign.
- `HotelAdminDraftCenter.tsx` existing at all is a good sign — the concept is already named correctly and presumably visually close to what we need; worth reviewing in detail once we get to the Hotel Admin side.
- Shared `components/ui/*` — pure shadcn primitives, identical to what the Next.js app already has (`components.json` config matches). No conversion needed, just import path changes.

## 4. Folder Structure — Vite/React-Router → Next.js App Router

React Router's `<Route>` tree becomes Next.js file-based routing; anything currently receiving route params via `useParams()` becomes a Next.js dynamic segment folder; the layout-wrapping `<ProtectedRoute>` + `<OpsShell>` pattern becomes a Next.js `layout.tsx` (already exists at `dashboard/system/layout.tsx`, just needs its rendered component swapped for the ported shell).

### System Admin (priority — build this side first)

| Vite/React source | → | Next.js target |
|---|---|---|
| `components/admin/ops/OpsShell.tsx` | → | `components/layout/admin-layout.tsx` (replace existing content) |
| `components/admin/ops/RequestedChangesDiff.tsx` | → | `components/admin/shared/case-field-diff.tsx` *(new shared folder, per our earlier plan)* |
| `components/admin/ops/primitives.tsx` | → | `components/admin/shared/primitives.tsx` |
| `pages/admin/ops/OpsDashboard.tsx` | → | `app/dashboard/system/page.tsx` |
| `pages/admin/ops/OpsWorkQueue.tsx` | → | `app/dashboard/system/review-queue/page.tsx` *(renamed per §1.4)* |
| `pages/admin/ops/OpsCaseReview.tsx` | → | `app/dashboard/system/review-queue/[id]/page.tsx` |
| `pages/admin/ops/OpsHotels.tsx` | → | `app/dashboard/system/hotels/page.tsx` |
| `pages/admin/ops/OpsCreateHotel.tsx` | → | `app/dashboard/system/hotels/new/page.tsx` *(rebuild business-info section per §1.6)* |
| `pages/admin/ops/OpsHotelWorkspace.tsx` | → | `app/dashboard/system/hotels/[id]/page.tsx` |
| `pages/admin/ops/OpsBookings.tsx` | → | `app/dashboard/system/bookings/page.tsx` |
| `pages/admin/ops/OpsBookingDetail.tsx` | → | `app/dashboard/system/bookings/[id]/page.tsx` |
| `pages/admin/ops/OpsActivityLog.tsx` | → | `app/dashboard/system/activity-log/page.tsx` |
| `pages/admin/ops/OpsCatalog.tsx` (kind="cities") | → | `app/dashboard/system/cities/page.tsx` |
| `pages/admin/ops/OpsCatalog.tsx` (kind="hotel-types") | → | `app/dashboard/system/hotel-types/page.tsx` |
| `pages/admin/ops/OpsCatalog.tsx` (kind="amenities") | → | `app/dashboard/system/amenities/page.tsx` |
| `pages/admin/ops/OpsCatalog.tsx` (kind="bed-types") | → | `app/dashboard/system/bed-types/page.tsx` |
| *(new `DATASETS` key)* | → | `app/dashboard/system/room-types/page.tsx` |
| *(new `DATASETS` key)* | → | `app/dashboard/system/room-facilities/page.tsx` |
| *(new page)* | → | `app/dashboard/system/master-data-requests/page.tsx` |
| `pages/admin/ops/OpsPlatformSettings.tsx` | → | `app/dashboard/system/settings/page.tsx` *(needs a real `platform_settings` model — currently doesn't exist in schema, flagged earlier)* |
| `pages/admin/AdminAddSystemAdmin.tsx` | → | `app/dashboard/system/admins/page.tsx` *(extend with NID + photo fields)* |
| `pages/admin/AdminClientList.tsx` + `AdminClientProfile`/`AdminClientHistory`/`AdminUpdateClient` | → | `app/dashboard/system/users/page.tsx` + `users/[id]/page.tsx` *(rename "Client" → "User" throughout to match `end_users`)* |
| *(new page)* | → | `app/dashboard/system/notifications/page.tsx` *(or a header dropdown component instead of a full page — your call)* |

**Note on `OpsCatalog`'s `kind` prop pattern:** React Router passes it as a JSX prop (`<Route element={<OpsCatalog kind="cities" />} />`); Next.js pages can't take props that way. Each becomes its own `page.tsx` that imports the same shared `OpsCatalog` component and passes `kind` as a hardcoded prop internally — the component itself barely changes, just how it's invoked.

### Hotel Admin (reference for later — not this pass)

| Vite/React source | → | Next.js target |
|---|---|---|
| `components/hotel-admin/HotelAdminLayout.tsx` | → | `components/layout/hotel-admin-layout.tsx` |
| `pages/hotel-admin/HotelAdminOverview.tsx` | → | `app/dashboard/hotel/page.tsx` |
| `pages/hotel-admin/HotelAdminPropertyListing.tsx` | → | `app/dashboard/hotel/details/page.tsx` *(rebuild Policies section per §1.10, fix email field per §1.11)* |
| `pages/hotel-admin/HotelAdminDraftCenter.tsx` | → | `app/dashboard/hotel/draft-center/page.tsx` |
| `pages/hotel-admin/HotelAdminDocuments.tsx` | → | `app/dashboard/hotel/documents/page.tsx` |
| `pages/hotel-admin/HotelAdminRooms.tsx` | → | `app/dashboard/hotel/rooms/page.tsx` |
| `pages/hotel-admin/HotelAdminAddRoom.tsx` / `EditRoom.tsx` | → | `app/dashboard/hotel/rooms/new/page.tsx` / `rooms/[id]/edit/page.tsx` *(split room-type-proposal from physical-room creation per §1.8/§1.9, add facility selection)* |
| *(new)* | → | `app/dashboard/hotel/room-types/page.tsx`, `bed-types/page.tsx` |
| *(new)* | → | `app/dashboard/hotel/policies/page.tsx` *(if not folded into details)* |
| *(new)* | → | `app/dashboard/hotel/pricing/page.tsx`, `availability/page.tsx` |
| `pages/hotel-admin/HotelAdminTeam.tsx` | → | `app/dashboard/hotel/staff/page.tsx` *(add phone/NID/photo fields)* |
| `pages/hotel-admin/HotelAdminReservations.tsx` | → | `app/dashboard/hotel/bookings/page.tsx` |
| `pages/hotel-admin/HotelAdminGuests.tsx` | → | `app/dashboard/hotel/guests/page.tsx` |
| `pages/hotel-admin/HotelAdminRevenue.tsx`, `HotelAdminReviews.tsx` | → | deferred, per earlier scope decision |
| `pages/hotel-admin/HotelAdminSettings.tsx` | → | `app/dashboard/hotel/settings/page.tsx` *(fix email/notification issues, §1.11/§1.12)* |
| *(new)* | → | `app/dashboard/hotel/activity-log/page.tsx`, `notifications/page.tsx` |

## 5. Recommended Build Order

Matches your "one page at a time" instruction, sequenced by dependency:

1. **Shell first** — port `OpsShell` into `admin-layout.tsx`, apply the nav/label fixes (§1.4), before touching any individual page.
2. **Dashboard** — simplest page, good shakedown of the ported shell + real API wiring pattern.
3. **Review Queue + Case Review** — the core new mechanic, and the one with the most mismatches to fix (§1.1–1.3, 1.5) before it's meaningfully correct.
4. **Hotels directory + Hotel Workspace** — depends on Review Queue's case-status badge.
5. **Add Hotel** — fix the business-info section (§1.6) as part of porting it.
6. **Catalog pages** (Cities/Hotel Types/Amenities/Bed Types, then the two new ones — Room Types, Room Facilities) — same component repeated, fast once the first is done.
7. **Master Data Requests, Admins, Users, Bookings, Activity Log** — mostly straightforward once the pattern is established.
8. **Notifications** — build the real panel last, lowest urgency.

Ready to start on step 1 (the shell/nav) whenever you are — want me to go ahead and port `OpsShell` into `admin-layout.tsx` now, or walk through the mismatch list above first in case you disagree with any of my read on them?
