# StayVista — Complete Codebase Audit & Remaining Work Guide
**Date:** May 2026 | **Read this entire document before writing a single line of code.**

---

## SECTION 1 — ISSUES FOUND IN EXISTING CODE

### 1.1 DUPLICATE API FOLDERS — DELETE IMMEDIATELY

**Problem:** Two separate folders exist for the same resource:
```
src/app/api/hotel-admin/room-type/       ← OLD — DELETE THIS ENTIRE FOLDER
src/app/api/hotel-admin/room-types/      ← CORRECT — KEEP THIS
```

The `room-type` (singular) folder is a leftover. All frontend code and schemas use `room-types` (plural). Delete:
```
src/app/api/hotel-admin/room-type/route.ts
src/app/api/hotel-admin/room-type/[id]/route.ts
src/app/api/hotel-admin/room-type/[id]/images/[imageId]/route.ts
src/app/api/hotel-admin/room-type/[id]/images/route.ts
```

---

### 1.2 WRONG FILE EXTENSION — FIX IMMEDIATELY

**Problem:** Next.js route file has wrong extension — `.tsx` instead of `.ts`:
```
src/app/api/bookings/[reference]/confirm/route.tsx  ← RENAME TO .ts
```
API routes must be `.ts`, not `.tsx`. This may silently fail in some environments.

---

### 1.3 WRONG FILENAME — FIX IMMEDIATELY

**Problem:** Status route file is named `routes.ts` instead of `route.ts`:
```
src/app/api/hotel-admin/bookings/[reference]/status/routes.ts  ← RENAME TO route.ts
```
Next.js only recognizes `route.ts` exactly. This endpoint is completely dead right now.

---

### 1.4 SEARCH PAGE IS EMPTY

**Problem:** `src/app/(public)/search/page.tsx` exists but has **0 bytes** — it is completely empty.
This is a critical missing page that needs to be built today (see Section 3).

---

### 1.5 DESTINATIONS PAGE IS EMPTY

**Problem:** `src/app/(public)/destinations/page.tsx` exists but is **empty**.
Also: `src/app/(public)/destinations/[name]/page.tsx` is **empty**.
Both need to be built today (see Section 3).

---

### 1.6 HERO SEARCH FILTER ROW IS PLACEHOLDER

**Problem:** In `src/components/search/hero-search.tsx`, the `showFilters` section at the bottom renders hardcoded static buttons:
```tsx
// CURRENT — WRONG
<Button variant="outline" size="sm">Hotel</Button>
<Button variant="outline" size="sm">Apartment</Button>
```
This must fetch real hotel types from `/api/public/hotel-types` and render them as checkbox pills with real state — exactly like the MERN project's SearchBar filter row. See Section 3.1 for the fix.

---

### 1.7 HOTEL DETAIL PAGE — ROOM SECTION HAS NO STATE

**Problem:** In `src/app/(public)/hotels/[slug]/page.tsx`, the room type section passes dummy handlers:
```tsx
onViewDetails={() => console.log('Open details for', room.name)}   ← NOT WIRED
onReserve={(quantity) => console.log('Reserve', ...)}              ← NOT WIRED
```
These must open `RoomDetailModal` and trigger the reservation flow respectively. The page is a Server Component so this needs a `RoomsSectionClient` wrapper. See Section 3.4.

---

### 1.8 CITIES API — MISSING SEARCH QUERY SUPPORT

**Problem:** `src/app/api/public/cities/route.ts` does NOT filter by query parameter `q`. The hero search component calls:
```
/api/public/cities?q=dha
```
But the API ignores `q` entirely and returns all cities. Fix:
```ts
// In src/app/api/public/cities/route.ts — add this:
const q = searchParams.get('q');
const where: any = { is_active: true };
if (q) where.name = { contains: q, mode: 'insensitive' };
```

---

### 1.9 PUBLIC HOTELS API — MISSING FILTER PARAMS

**Problem:** `src/app/api/public/hotels/route.ts` does not handle:
- `stars` (star rating filter from sidebar)
- `amenities` (amenity id filter from sidebar)
- `min_price` / `max_price` (price range from sidebar)
- `page` / `limit` (pagination — currently returns ALL results, which breaks at scale)

The filter sidebar sends these params, but the API ignores them. Add them. See Section 2.1.

---

### 1.10 NAVBAR SUN/MOON THEME TOGGLE — HYDRATION FLASH

**Problem:** The navbar uses `useTheme()` from `src/hooks/use-theme.tsx` which reads `localStorage` on init. This causes a **hydration mismatch** — the server renders one state and the client renders another. The `isMounted` guard is already there correctly, so the icons use `opacity-0` before mount. **This is fine and correct.** No action needed here. The existing code is correct.

**However:** The theme hook calls `localStorage.getItem('theme')` inside `useState(() => ...)` which runs on server too — but `typeof window === 'undefined'` check handles it. Correct.

---

### 1.11 ROOM DETAIL MODAL — DUPLICATE FILE

**Problem:** Two nearly identical modal files exist:
```
src/components/room/room-detail-modal.tsx    ← USE THIS ONE (full implementation)
src/components/room/room-details-modal.tsx   ← DELETE THIS (appears to be a copy)
```
Keep only `room-detail-modal.tsx`. Delete `room-details-modal.tsx`.

---

### 1.12 HOTEL DETAIL PAGE — SERVER COMPONENT CANNOT USE CLIENT HOOKS

**Problem:** `src/app/(public)/hotels/[slug]/page.tsx` is a **Server Component** (no `'use client'`). It directly renders `<RoomTypeCard>` which is a client component — that part is fine. BUT the `onViewDetails` and `onReserve` callbacks must come from a client component with state (to open modal, manage reservation).

The hotel detail page needs a **`<RoomsSectionClient />`** wrapper around the room list. See Section 3.4.

---

### 1.13 search-bar.tsx HAS OLD CHECKBOX FILTER FETCHING ENUMS — NOT WIRED TO API

**Problem:** `src/components/search/search-bar.tsx` has a complex filter row that imports `EnumOption` types but doesn't properly fetch from the actual API. The `hotel_types` and `bed_types` need to come from:
- `GET /api/public/hotel-types`
- `GET /api/public/amenities`

But the current implementation has dead/incomplete code in the search-bar.tsx filter row.

The **hero-search.tsx is the primary search bar used on the home page**. The search-bar.tsx is used on `/hotels` and `/search` pages. Make sure you know which one you're editing.

---

## SECTION 2 — API FIXES NEEDED

### 2.1 Fix: `GET /api/public/hotels/route.ts` — Add Missing Filters

Add these missing query params to the existing GET handler. Do NOT rewrite the whole file — just add the missing `where` conditions inside the existing logic:

```ts
// ADD inside the GET handler, after existing where conditions:

// Star rating filter
const starsStr = searchParams.get('stars');
if (starsStr) {
  const stars = starsStr.split(',').map(Number).filter(Boolean);
  where.detail = { star_rating: { in: stars } };
}

// Amenities filter (by amenity id)
const amenitiesStr = searchParams.get('amenities');
if (amenitiesStr) {
  const amenityIds = amenitiesStr.split(',').map(Number).filter(Boolean);
  where.hotel_amenities = {
    some: { amenity_id: { in: amenityIds } }
  };
}

// Price range filter — on room_types base_price
const minPrice = searchParams.get('min_price');
const maxPrice = searchParams.get('max_price');
if (minPrice || maxPrice) {
  const priceCondition: any = {};
  if (minPrice) priceCondition.gte = Number(minPrice);
  if (maxPrice) priceCondition.lte = Number(maxPrice);
  where.room_types = {
    ...where.room_types,
    some: { 
      ...where.room_types?.some,
      base_price: priceCondition 
    }
  };
}

// Pagination
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '12');
const skip = (page - 1) * limit;

// Add skip and take to findMany:
// prisma.hotels.findMany({ where, include: {...}, skip, take: limit })
// Also return total count for pagination UI
```

---

### 2.2 Fix: `GET /api/public/cities/route.ts` — Add Search Support

Replace the full file with:
```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')
    
    const cities = await prisma.cities.findMany({
      where: {
        is_active: true,
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
      take: q ? 8 : undefined, // limit suggestions to 8 when searching
    })

    return NextResponse.json({ success: true, data: cities })
  } catch (error) {
    console.error('Failed to fetch cities:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}
```

---

## SECTION 3 — COMPONENTS TO BUILD TODAY

Build these in this exact order. Do not skip ahead.

---

### 3.1 FIX: hero-search.tsx — Wire Real Filter Pills

**File:** `src/components/search/hero-search.tsx`
**What to change:** Replace the hardcoded static buttons in the `showFilters` block.

The filter section currently shows:
```tsx
<Button variant="outline" size="sm">Hotel</Button>  // HARDCODED — WRONG
```

Replace with this pattern (keep all existing code above it intact):

```tsx
// ADD these state variables at the top of the SearchBar component:
const [hotelTypeOptions, setHotelTypeOptions] = useState<{ id: number; name: string }[]>([]);
const [selectedHotelTypes, setSelectedHotelTypes] = useState<string[]>([]);

// ADD this useEffect to fetch hotel types:
useEffect(() => {
  fetch('/api/public/hotel-types')
    .then(r => r.json())
    .then(data => {
      if (data.success) setHotelTypeOptions(data.data);
    })
    .catch(() => {});
}, []);

// INCLUDE selectedHotelTypes in handleSearch:
// params.set("hotel_types", selectedHotelTypes.join(","));

// REPLACE the showFilters block with:
{showFilters && hotelTypeOptions.length > 0 && (
  <div className="mt-3 pt-3 border-t border-border/40">
    <div className="flex flex-wrap gap-2">
      {hotelTypeOptions.map((opt) => {
        const checked = selectedHotelTypes.includes(opt.name);
        return (
          <label
            key={opt.id}
            className={cn(
              "inline-flex items-center gap-1.5 cursor-pointer select-none rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              checked
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/40"
            )}
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => {
                setSelectedHotelTypes(prev =>
                  v ? [...new Set([...prev, opt.name])] : prev.filter(x => x !== opt.name)
                );
              }}
              className="h-3 w-3"
            />
            {opt.name}
          </label>
        );
      })}
    </div>
  </div>
)}
```

**Import to add:**
```tsx
import { Checkbox } from '@/components/ui/checkbox';
```

---

### 3.2 BUILD: `src/app/(public)/search/page.tsx`

**This file is completely empty. Build it from scratch.**

This page is for the `/search` route — identical layout to `/hotels` page but reads search params from the URL and pre-fills them.

**Structure:**
```tsx
'use client'
// Uses Suspense to wrap the client content (required for useSearchParams)

// Layout:
// - sticky top SearchBar (search-bar.tsx with showFilters=false)
// - below: two columns
//   LEFT: HotelFilterSidebar (existing component — already works)
//   RIGHT: hotel results grid (same as hotels/page.tsx)
//
// Data fetch: GET /api/public/hotels with all searchParams forwarded
// All params: location, check_in, check_out, guests, rooms,
//             hotel_types, stars, amenities, min_price, max_price, page
//
// Show:
//   - Results count ("24 properties found")
//   - Sort dropdown (newest, price asc, price desc, rating)
//   - HotelCard grid (3 cols desktop, 2 tablet, 1 mobile)
//   - Pagination (if total > limit)
//
// Empty state: "No properties found" with illustration
// Loading state: skeleton grid (3 cards, same size as HotelCard)
//
// Uses existing components:
//   - HotelFilterSidebar from '@/components/hotel/hotel-filter-sidebar'
//   - HotelCard from '@/components/hotel/hotel-card'
//   - SearchBar from '@/components/search/search-bar' (showFilters=false)
```

**IMPORTANT:** Do not create a new filter component. Use the existing `HotelFilterSidebar` exactly as it is.

---

### 3.3 BUILD: Destinations Pages

#### 3.3.1 `src/app/(public)/destinations/page.tsx` — Cities Grid

**This file is completely empty. Build it from scratch.**

```
Purpose: Shows all active cities in a large grid with hotel counts

Data: GET /api/public/cities (already exists, returns all cities)

Layout:
  - pt-24 pb-20 (account for sticky navbar)
  - Page title: "Explore Destinations"
  - Subtitle: "Find hotels across Bangladesh's most visited cities"
  - Grid: 3 cols desktop, 2 tablet, 1 mobile
  - Each city card:
      - Large image (city.image_url with fallback gradient)
      - City name (large, white text on image)
      - "X hotels available" if count available
      - Entire card is a Link to /search?location={city.name}
      - Hover: scale image, darken overlay
      - Card style: rounded-3xl, h-72, overflow-hidden

Data shape from API:
  interface City {
    id: number
    name: string
    image_url: string | null
    is_active: boolean
  }

No new API needed. Use GET /api/public/cities directly.
```

#### 3.3.2 `src/app/(public)/destinations/[name]/page.tsx` — City Hotels

**This file is completely empty. Build it from scratch.**

```
Purpose: Shows all hotels in a specific city
URL: /destinations/Dhaka

Data: GET /api/public/hotels?location={name}

Layout:
  - Same as search/page.tsx but:
    - Pre-fills location filter with city name
    - Shows "Hotels in Dhaka" as page title
    - No search bar at top
    - Filter sidebar on left (same HotelFilterSidebar)
    - Hotel grid on right (same HotelCard)

params.name comes from the URL segment — it is the city name (URL encoded)
Decode with: decodeURIComponent(params.name)

No new API needed. Use existing GET /api/public/hotels.
```

---

### 3.4 BUILD: `src/components/room/rooms-section-client.tsx`

**This is a new file. Do not modify the existing hotel detail server page.**

The hotel detail page (`/hotels/[slug]/page.tsx`) is a Server Component. It fetches all the data and passes room data down. But interactivity (modal open/close, reservation flow) requires a Client Component.

Create this new client wrapper:

```
File: src/components/room/rooms-section-client.tsx
'use client'

Props:
  roomTypes: Array of room type objects (already fetched by the server page)
    Each has: id, name, description, base_price, max_occupancy, room_size,
              type_images, room_bed_types, room_properties, room_details (count)
  hotelSlug: string
  checkIn?: string
  checkOut?: string
  guests?: number

State:
  selectedRoomType: RoomTypeCardProps | null  — for modal
  modalOpen: boolean

Render:
  <div className="space-y-6">
    {roomTypes.map(room => (
      <RoomTypeCard
        key={room.id}
        {...room}
        available_rooms_count={room.room_details.length}
        onViewDetails={() => {
          setSelectedRoomType(room);
          setModalOpen(true);
        }}
        onReserve={(quantity) => {
          // Build query string with check_in, check_out, guests, rooms
          // Navigate to /bookings/new?hotel=slug&room_type=id&quantity=N&...
          const params = new URLSearchParams();
          params.set('hotel', hotelSlug);
          params.set('room_type', room.id.toString());
          params.set('quantity', quantity.toString());
          if (checkIn) params.set('check_in', checkIn);
          if (checkOut) params.set('check_out', checkOut);
          if (guests) params.set('guests', guests.toString());
          router.push(`/bookings/new?${params.toString()}`);
        }}
      />
    ))}
  </div>

  <RoomDetailModal
    isOpen={modalOpen}
    onClose={() => setModalOpen(false)}
    roomType={selectedRoomType}
  />
```

**Then update the hotel detail page** to replace the raw `RoomTypeCard` map with `<RoomsSectionClient>`:

```tsx
// In src/app/(public)/hotels/[slug]/page.tsx
// REPLACE the room_types.map() block with:
import RoomsSectionClient from '@/components/room/rooms-section-client'

// ...
<RoomsSectionClient
  roomTypes={hotel.room_types.map(room => ({
    ...room,
    occupancy_adults: room.max_occupancy,
    available_rooms_count: room.room_details.length,
    type_images: room.type_images,
  }))}
  hotelSlug={hotel.slug}
/>
```

---

### 3.5 FIX: Room Type Card — Expand/Collapse Pattern (MERN-like)

**Current behavior:** Each `RoomTypeCard` is always fully visible (static card layout).

**Required behavior (like MERN project):**
- Initially show a **collapsed row** with image + name + price + "Select" button
- Clicking the card row **expands** to show full details (description, beds, amenities, reserve controls)
- Clicking image or name opens the `RoomDetailModal`

**File to modify:** `src/components/room/room-type-card.tsx`

**How to add expand/collapse:**

```tsx
// ADD state at top of component:
const [isExpanded, setIsExpanded] = useState(false);

// The collapsed view (always visible):
<div
  onClick={() => setIsExpanded(!isExpanded)}
  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
>
  {/* Small thumbnail */}
  <div className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0">
    <Image src={type_images[0]?.image_url || ''} alt={name} fill className="object-cover" />
  </div>
  
  {/* Name + quick info */}
  <div className="flex-1">
    <h3 className="font-bold text-lg hover:text-primary cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}>
      {name}
    </h3>
    <p className="text-sm text-muted-foreground">Up to {occupancy_adults} guests</p>
  </div>
  
  {/* Price + expand icon */}
  <div className="flex items-center gap-3">
    <span className="font-bold text-lg">৳{Number(base_price).toLocaleString()}</span>
    <ChevronDown className={cn("h-5 w-5 transition-transform", isExpanded && "rotate-180")} />
  </div>
</div>

{/* Expanded content — only visible when isExpanded */}
{isExpanded && (
  <div className="border-t border-border/50 p-4 md:p-6 animate-in slide-in-from-top-2 duration-200">
    {/* All the existing detail content: image carousel, description, beds, amenities, reserve */}
  </div>
)}
```

**The image in the collapsed header should also call `onViewDetails` on click** — just like the MERN project where clicking the room image opens the detail modal.

---

### 3.6 FIX: search-bar.tsx Used on /hotels and /search Pages

**File:** `src/components/search/search-bar.tsx`

This component is used on `/hotels/page.tsx` and will be used on `/search/page.tsx`. It currently has old code structure. It needs to:

1. **Read initial values from URL searchParams** on mount (pre-fill from URL)
2. **Use DateRange picker** exactly like hero-search.tsx (not two separate pickers)
3. **On search**, push to `/search?...` (not `/hotels`)
4. **showFilters=false** when used on results pages (filter sidebar handles filtering)

The DateRange pattern to use is already in `hero-search.tsx` — use the same `DateRange` state and the same two-panel date picker. Copy the date section exactly from hero-search.tsx.

---

## SECTION 4 — FILE STRUCTURE RULES (FOR VS CODE CLAUDE)

These rules are non-negotiable. Do not deviate.

```
RULE 1: Never create a new API file without checking if one already exists.
         Always check both /hotel-admin/ and /hotel-sub-admin/ before creating.

RULE 2: All hotel-admin API routes use:
         const { payload, error } = await requireAuth(req, ['HOTEL_ADMIN'])
         NOT: const auth = await requireAuth(...)
         The destructure pattern must match auth-middleware.ts exactly.

RULE 3: Room types = plural 'room-types' everywhere.
         The singular 'room-type' folder is being deleted.

RULE 4: Client components MUST have 'use client' as first line.
         Server components have NO directive (no 'use server' either — that's for actions only).

RULE 5: Next.js route files MUST be named route.ts (not routes.ts, not route.tsx).

RULE 6: All public pages use the (public) route group.
         Layout file: src/app/(public)/layout.tsx — already wraps with Navbar + Footer.
         Do NOT add <Navbar /> or <Footer /> inside any (public) page component.

RULE 7: All user pages use the (user) route group.
         Layout file: src/app/(user)/layout.tsx — already wraps with Navbar.
         Do NOT add <Navbar /> inside any (user) page component.

RULE 8: Hotel detail page src/app/(public)/hotels/[slug]/page.tsx is a SERVER COMPONENT.
         It fetches data directly from Prisma. Do not add 'use client' to it.
         For interactivity, create a separate *-client.tsx component and import it.

RULE 9: The Prisma model for hotel details is `detail` (singular), not `hotel_details`.
         In queries use: include: { detail: true }
         Access as: hotel.detail?.check_in_time

RULE 10: Images in the hotel model are `images` (not hotel_images).
          In queries use: include: { images: { orderBy: { sort_order: 'asc' } } }

RULE 11: Room type images are `type_images` (not room_images or images).
          In queries: include: { type_images: { orderBy: { sort_order: 'asc' } } }

RULE 12: Never hardcode filter options (bed types, hotel types).
          Always fetch from the API. The options must come from the database.

RULE 13: The booking flow goes to /bookings/new — NOT to /checkout.
          There is no /checkout route. Reservation is POST /api/bookings/reserve.

RULE 14: Hotel admin layout reads hotel_id from JWT payload (payload.hotel_id).
          Never pass hotel_id in the request body for hotel-admin routes.
          Always scope queries: where: { hotel_id: payload.hotel_id }
```

---

## SECTION 5 — TODAY'S BUILD PRIORITY ORDER

Build in this exact sequence. Complete each step before starting the next.

### Step 1: Fixes (30 min)
- [ ] Delete `src/app/api/hotel-admin/room-type/` folder entirely
- [ ] Rename `confirm/route.tsx` → `confirm/route.ts`
- [ ] Rename `status/routes.ts` → `status/route.ts`
- [ ] Delete `src/components/room/room-details-modal.tsx`
- [ ] Fix `src/app/api/public/cities/route.ts` (add `q` param support)
- [ ] Fix `src/app/api/public/hotels/route.ts` (add stars, amenities, price, pagination)

### Step 2: Hero Search Filter Pills (15 min)
- [ ] Fix `src/components/search/hero-search.tsx` filter section
- [ ] Fetch hotel types from API and render as real checkbox pills with state

### Step 3: Search Page (45 min)
- [ ] Build `src/app/(public)/search/page.tsx` from scratch
- [ ] Use existing: HotelFilterSidebar, HotelCard, search-bar.tsx (showFilters=false)
- [ ] Read all URL params on mount and pass to API fetch

### Step 4: Destinations Pages (30 min)
- [ ] Build `src/app/(public)/destinations/page.tsx` — cities grid
- [ ] Build `src/app/(public)/destinations/[name]/page.tsx` — hotels in city

### Step 5: Room Section Client Wrapper (30 min)
- [ ] Create `src/components/room/rooms-section-client.tsx`
- [ ] Wire up RoomTypeCard → RoomDetailModal → RoomDetailModal close
- [ ] Update hotel detail page to use RoomsSectionClient

### Step 6: Room Type Card Expand/Collapse (45 min)
- [ ] Add expand/collapse state to `src/components/room/room-type-card.tsx`
- [ ] Collapsed: small thumbnail + name + price + chevron
- [ ] Expanded: full existing card content
- [ ] Image click → onViewDetails (opens modal)
- [ ] Name click → onViewDetails (opens modal)

---

## SECTION 6 — DATA SHAPES REFERENCE

### Hotel Card Props (from `/api/public/hotels`)
```ts
interface HotelCardProps {
  id: number
  slug: string
  name: string
  city: string           // city.name (flattened in API response)
  hotel_type: string     // hotel_type.name (flattened)
  star_rating?: number   // from detail.star_rating
  guest_rating?: number  // from detail.guest_rating
  cover_image: string | null  // from images where is_cover=true
  short_description?: string  // from detail.short_description
  starting_price?: number     // min base_price from room_types
}
```

### Room Type (from hotel detail Prisma query)
```ts
{
  id: number
  name: string
  description: string | null
  base_price: Decimal           // use Number(room.base_price) to convert
  max_occupancy: number         // maps to occupancy_adults prop
  room_size: string | null
  type_images: { id: number; image_url: string }[]
  room_bed_types: { bed_type: { name: string }; count: number }[]
  room_properties: { amenity: { name: string; icon: string | null } }[]
  room_details: { id: number }[]  // length = available_rooms_count
}
```

### Search Params (URL → API)
```
location    → OR: name contains / city.name contains
check_in    → availability check (future feature)
check_out   → availability check (future feature)
guests      → filter by max_occupancy >= guests
rooms       → future feature
hotel_types → hotel_type.name IN [...]
stars       → detail.star_rating IN [...]
amenities   → hotel_amenities.some.amenity_id IN [...]
min_price   → room_types.some.base_price >= min_price
max_price   → room_types.some.base_price <= max_price
page        → pagination skip/take
limit       → default 12
```

---

## SECTION 7 — WHAT NOT TO TOUCH

These files are correct and working. Do not modify them unless specifically instructed:

- `src/components/layout/navbar.tsx` — correct, sun/moon works fine
- `src/components/layout/footer.tsx` — correct
- `src/components/layout/admin-layout.tsx` — correct
- `src/components/layout/hotel-admin-layout.tsx` — correct
- `src/components/layout/hotel-sub-admin-layout.tsx` — correct
- `src/components/hotel/hotel-filter-sidebar.tsx` — correct, use as-is
- `src/components/hotel/hotel-card.tsx` — correct, use as-is
- `src/components/room/room-detail-modal.tsx` — correct, use as-is
- `src/lib/auth-middleware.ts` — correct
- `src/lib/jwt.ts` — correct
- `src/middleware.ts` — correct
- `src/app/globals.css` — correct
- `src/hooks/use-theme.tsx` — correct
- All dashboard pages — not in scope today
- All auth pages — not in scope today
- All booking API routes — not in scope today

---

## SECTION 8 — COMPONENT IMPORT MAP

Always use these exact import paths:

```ts
// Layout
import Navbar from '@/components/layout/navbar'               // NOT exported as named export
import { Footer } from '@/components/layout/footer'          // check export style

// Search
import SearchBar from '@/components/search/search-bar'       // used on /hotels, /search
import SearchBar from '@/components/search/hero-search'      // used on home page hero — DEFAULT export

// Hotel
import HotelCard from '@/components/hotel/hotel-card'
import HotelFilterSidebar from '@/components/hotel/hotel-filter-sidebar'

// Room
import RoomTypeCard from '@/components/room/room-type-card'
import RoomDetailModal from '@/components/room/room-detail-modal'
import RoomsSectionClient from '@/components/room/rooms-section-client'  // TO BE CREATED

// UI
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
```

---

## SECTION 9 — SUMMARY TABLE

| # | File | Status | Action |
|---|------|--------|--------|
| 1 | `api/hotel-admin/room-type/*` | DUPLICATE | DELETE |
| 2 | `api/bookings/confirm/route.tsx` | WRONG EXT | RENAME to .ts |
| 3 | `api/hotel-admin/bookings/status/routes.ts` | WRONG NAME | RENAME to route.ts |
| 4 | `components/room/room-details-modal.tsx` | DUPLICATE | DELETE |
| 5 | `api/public/cities/route.ts` | MISSING ?q | FIX |
| 6 | `api/public/hotels/route.ts` | MISSING FILTERS | FIX |
| 7 | `components/search/hero-search.tsx` | HARDCODED FILTERS | FIX |
| 8 | `app/(public)/search/page.tsx` | EMPTY | BUILD |
| 9 | `app/(public)/destinations/page.tsx` | EMPTY | BUILD |
| 10 | `app/(public)/destinations/[name]/page.tsx` | EMPTY | BUILD |
| 11 | `components/room/rooms-section-client.tsx` | MISSING | CREATE |
| 12 | `components/room/room-type-card.tsx` | NO EXPAND | FIX |
| 13 | `app/(public)/hotels/[slug]/page.tsx` | UNWIRED HANDLERS | FIX |
| 14 | `components/search/search-bar.tsx` | OLD DATE PICKER | FIX |
