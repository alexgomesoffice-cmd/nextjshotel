# Room Types Module Implementation Plan

This plan details the implementation of the Room Types management module for the Hotel Admin dashboard. This module will allow hotel administrators to create, edit, delete, and manage images for their specific room types (e.g., "Deluxe King Room", "Standard Twin").

## User Review Required

> [!IMPORTANT]
> Please review the proposed architecture and UI structure below. The design assumes that **editing a room type** happens inside a modal or a side-sheet on the same page, allowing seamless image uploads and property management without leaving the list view.

## Open Questions

1. **Pricing Representation:** The database has `base_price`. Should we add a hint in the UI that this is the default display price, but actual pricing depends on the physical rooms/pricing rules created later?
2. **Image Uploading:** We will use the same image upload logic (`sharp` to `webp`) that we used for hotel images, but tied to the `room_images` table with a `room_type_id`. Is that correct?

## Proposed Changes

### Database Interactions (Prisma)
- **Tables used:** `room_types`, `room_bed_types`, `room_properties` (amenities), `room_images`.

---

### Backend (API Routes)

#### [NEW] [route.ts](file:///src/app/api/hotel-admin/room-types/route.ts)
- `GET`: Returns all active room types for the authenticated hotel admin's `hotel_id`. Includes associated `room_bed_types`, `room_properties` (amenities), and `type_images`.
- `POST`: Creates a new room type. Validates `base_price`, `max_occupancy`, `bed_types`, and `amenity_ids` using Zod. Wraps the creation of the room type, bed relations, and amenity relations in a Prisma transaction.

#### [NEW] [[id]/route.ts](file:///src/app/api/hotel-admin/room-types/[id]/route.ts)
- `GET`: Returns a specific room type by ID.
- `PATCH`: Updates a room type. Handles wiping and recreating `room_bed_types` and `room_properties` to ensure exact sync with the frontend.
- `DELETE`: Soft-deletes a room type by setting `is_active: false`.

#### [NEW] [images/route.ts](file:///src/app/api/hotel-admin/room-types/[id]/images/route.ts)
- `POST`: Uploads one or more images for a specific room type. Resizes to 1920x1080 and converts to WebP.

#### [NEW] [images/[imageId]/route.ts](file:///src/app/api/hotel-admin/room-types/[id]/images/[imageId]/route.ts)
- `PATCH`: Sets an image as the cover image (`is_cover: true`).
- `DELETE`: Deletes the image from the disk and database.

---

### Frontend (Dashboard UI)

#### [NEW] [page.tsx](file:///src/app/dashboard/hotel/room-types/page.tsx)
- **List View:** A grid/list of all existing room types showing the cover image, name, base price, max occupancy, and a quick summary of bed configurations.
- **Creation/Edit Modal:** A comprehensive sliding sheet or modal containing:
  - **Basic Info:** Name, Description, Base Price, Max Occupancy, Room Size.
  - **Policies:** Check-in/out times, Cancellation policy (inherits from hotel but can be overridden).
  - **Configuration:** Select bed types (and counts) and check off room-specific amenities.
  - **Image Gallery:** An inline upload area similar to the hotel images page, allowing admins to upload, delete, and set cover photos for the specific room type they are currently editing.

## Verification Plan

### Automated Tests
- TypeScript compilation (`npm run build`) to ensure Prisma relations for `room_bed_types` and `room_properties` are strictly typed.

### Manual Verification
1. Log in as a Hotel Admin.
2. Navigate to "Room Types" in the sidebar.
3. Create a new "Presidential Suite" with $500 base price, 2 King beds, and "Sea View" amenity.
4. Verify the database transaction successfully populates `room_types`, `room_bed_types`, and `room_properties`.
5. Upload 3 photos to the Presidential Suite, set one as cover.
6. Verify the images appear in the `public/uploads/rooms` folder as `.webp` files.
7. Edit the suite to remove 1 King bed, add 1 Sofa bed. Verify database accurately reflects the change.
8. Delete the room type and verify it disappears from the UI (soft deleted in DB).
