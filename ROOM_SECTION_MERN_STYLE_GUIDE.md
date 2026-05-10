# StayVista — Full Audit + MERN-Style Room Section Guide
**Read every word before touching any file.**

---

## SECTION 1 — PROGRESS AUDIT (What's Done vs Planned)

### ✅ COMPLETED FROM LAST SESSION
| Fix | Status |
|-----|--------|
| Delete `room-type` singular folder | ✅ DONE — only `room-types` exists now |
| Rename `confirm/route.tsx` → `.ts` | ✅ DONE |
| Rename `status/routes.ts` → `route.ts` | ✅ DONE |
| Delete duplicate `room-details-modal.tsx` | ✅ DONE — only `room-detail-modal.tsx` exists |
| Cities API — add `?q=` search support | ✅ DONE |
| Hotels API — add stars, amenities, price, pagination | ✅ DONE — excellent implementation |
| Hero search — real hotel type checkbox pills | ✅ DONE |
| `rooms-section-client.tsx` — created | ✅ DONE |
| Hotel detail page — wired to RoomsSectionClient | ✅ DONE |
| Search page | ✅ DONE (246 lines) |
| Destinations page | ✅ DONE (132 lines) |
| Destinations [name] page | ✅ DONE (232 lines) |

### 🔴 STILL BROKEN / REMAINING
| Issue | Status | Fix Location |
|-------|--------|--------------|
| Room type card is expand/collapse but looks wrong | ❌ See Section 2 | `room-type-card.tsx` |
| No booking sidebar on hotel detail page | ❌ See Section 2 | New component |
| `rooms-section-client.tsx` needs booking sidebar state | ❌ See Section 2 | `rooms-section-client.tsx` |
| Hotel detail page layout needs right sidebar | ❌ See Section 3 | `hotels/[slug]/page.tsx` |
| No date/guest picker on hotel detail page | ❌ See Section 2 | New component |

---

## SECTION 2 — WHAT THE MERN PROJECT DID (Your Target)

Looking at Screenshot 3, the MERN hotel detail page has:

### LEFT SIDE (Main content, ~65% width):
```
[Image gallery — grid layout, 1 large + 4 smaller]

Luxury | Spa  [tags]          $280/night [top right of content]
The Grand Palace Hotel
📍 London, UK  ⭐ 8.8 (2,341 reviews)

[About this property section]
[What this place offers — amenity tags grid]

Available Rooms          [3 room types label]
┌─────────────────────────────────────────────────────┐
│ Deluxe King Room                         $280/night │
│ Spacious room with king-size bed...                 │
│ 👥 2 guests  🛏 1 King Bed  📐 35m²                 │
│ City View  Mini Bar  Smart TV  Rain Shower          │
│                                          [Select →] │
└─────────────────────────────────────────────────────┘
[More room type rows...]
```

### RIGHT SIDE (Sticky sidebar, ~35% width):
```
┌──────────────────────────────┐
│ Book your stay    $280/night │
│                              │
│ Check-in                     │
│ [📅 Mon, May 11, 2026      ] │
│                              │
│ Check-out                    │
│ [📅 Wed, May 13, 2026      ] │
│                              │
│ Guests                       │
│ [− 2 guests +]               │
│                              │
│ $280 × 2 nights    $560      │
│ Service fee          $87     │
│ Total              $827      │
│                              │
│ [Please select a room to book]│
│ [Select a room to book       ]│
│ 🔒 You won't be charged yet  │
└──────────────────────────────┘
```

### Room Row Behavior (MERN style):
- Each room type is a **flat row**, NOT a big card
- Row shows: name, brief description, occupancy+bed+size, amenity tags, price, [Select →] button
- Clicking [Select →] does NOT expand — it **selects** the room and updates the sidebar
- The sidebar then shows the price calculation and enables booking
- No modal from the row — the "Details" link opens the modal

---

## SECTION 3 — EXACT CHANGES NEEDED

### File 1: `src/components/room/room-type-card.tsx`
**REPLACE THE ENTIRE FILE**

The current expand/collapse design is close but wrong. The MERN pattern is:
- **No expand/collapse** — show the full row always
- **[Select] button** not [Reserve] — it selects the room into the sidebar
- Clicking image or name opens the detail modal
- The reserve/booking action happens from the sidebar, not the card

New card structure:
```
┌──────────────────────────────────────────────────────────────┐
│ [Image]  Deluxe King Room                        $280/night  │
│  80×70   Spacious room with king views...        [Select →]  │
│  px      👥 2 guests  🛏 1 King Bed  📐 35m²                 │
│          City View  Mini Bar  Smart TV  [+3 more] [Details]  │
└──────────────────────────────────────────────────────────────┘
```

The card accepts an `isSelected` boolean prop and `onSelect` callback instead of `onReserve`.

### File 2: `src/components/room/rooms-section-client.tsx`
**REPLACE THE ENTIRE FILE**

Must manage:
- `selectedRoomType` state (which room row was clicked "Select")
- `checkIn`, `checkOut`, `guests` state (editable in sidebar)
- `quantity` state
- Pass these down to both the room cards and the booking sidebar

### File 3: NEW `src/components/room/booking-sidebar.tsx`
**CREATE THIS FILE**

The sticky right sidebar with:
- Date pickers (check-in, check-out) using the same DateRange picker from hero-search
- Guest count stepper (+ / -)
- Price calculation (price × nights, service fee, total)
- "Select a room to book" placeholder when no room selected
- "Reserve Now" button when room is selected → navigates to `/bookings/new?...`

### File 4: `src/app/(public)/hotels/[slug]/page.tsx`
**CHANGE THE LAYOUT SECTION**

The room types section currently sits at the bottom full-width. It needs to move ABOVE the hotel info content OR the whole page layout changes so rooms + sidebar are in a 2-col layout.

**New layout structure:**
```
[Header: hotel name, type, stars, rating]
[Gallery — full width]

[2-col grid: lg:grid-cols-3]
  [Left col lg:col-span-2]
    [About section]
    [Amenities]
    [Policies]
    [Available Rooms section — full width here]
      [Room type rows using RoomsSectionClient]
  
  [Right col lg:col-span-1 — sticky]
    [BookingSidebar — passes dates/guests to RoomsSectionClient via shared state]
    [Location card — keep this, move below sidebar]
```

**Problem with this layout:** The sidebar needs shared state with the room cards (both need to know which room is selected, what dates are chosen). Since the page is a Server Component, the shared state must live in a Client Component wrapper.

**Solution:** Wrap BOTH the rooms list AND the sidebar in one client component: `RoomsSectionClient` already exists — just add the sidebar inside it and pass the hotel layout data.

---

## SECTION 4 — EXACT CODE TO WRITE

### STEP 1: Replace `src/components/room/room-type-card.tsx`

Tell your AI:

> Replace the entire contents of `src/components/room/room-type-card.tsx` with this component. Do not keep any of the old expand/collapse logic. The new card is a flat horizontal row, always fully visible, no accordion.

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Users, Bed, Wind, Tv, Coffee, Bath, Check,
  ChevronRight, Info, Maximize,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoomTypeImage { id: number; image_url: string; }
interface RoomBedType { bed_type: { name: string }; count: number; }
interface RoomProperty { amenity: { name: string; icon: string | null }; }

export interface RoomTypeCardProps {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  occupancy_adults: number;
  room_size: string | null;
  type_images: RoomTypeImage[];
  room_bed_types: RoomBedType[];
  room_properties: RoomProperty[];
  available_rooms_count: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onViewDetails?: () => void;
}

const getIconForAmenity = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("ac") || lower.includes("air")) return <Wind className="h-3.5 w-3.5" />;
  if (lower.includes("tv") || lower.includes("television")) return <Tv className="h-3.5 w-3.5" />;
  if (lower.includes("coffee") || lower.includes("tea")) return <Coffee className="h-3.5 w-3.5" />;
  if (lower.includes("bath") || lower.includes("shower")) return <Bath className="h-3.5 w-3.5" />;
  return <Check className="h-3.5 w-3.5" />;
};

const RoomTypeCard = ({
  name, description, base_price, occupancy_adults, room_size,
  type_images, room_bed_types, room_properties, available_rooms_count,
  isSelected = false, onSelect, onViewDetails,
}: RoomTypeCardProps) => {
  const coverImage = type_images?.[0]?.image_url || null;
  const maxAmenities = 4;

  return (
    <div
      className={cn(
        "flex gap-4 bg-card rounded-2xl border overflow-hidden transition-all duration-200",
        isSelected
          ? "border-primary shadow-md shadow-primary/10"
          : "border-border/50 hover:border-border hover:shadow-sm"
      )}
    >
      {/* Left: Image (clickable → modal) */}
      <button
        onClick={onViewDetails}
        className="relative w-28 sm:w-36 shrink-0 bg-muted self-stretch overflow-hidden group"
        tabIndex={-1}
      >
        {coverImage ? (
          <Image
            src={coverImage}
            alt={name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Bed className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
      </button>

      {/* Middle: Details */}
      <div className="flex flex-col flex-1 py-4 pr-2 min-w-0">
        {/* Name (clickable → modal) */}
        <button
          onClick={onViewDetails}
          className="text-left mb-1 group"
        >
          <h3 className="font-bold text-base sm:text-lg leading-tight group-hover:text-primary transition-colors">
            {name}
          </h3>
        </button>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {description}
          </p>
        )}

        {/* Quick stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2 flex-wrap">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-primary" />
            Up to {occupancy_adults} guests
          </span>
          {room_bed_types?.map((bed, i) => (
            <span key={i} className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5 text-primary" />
              {bed.count}x {bed.bed_type.name}
            </span>
          ))}
          {room_size && (
            <span className="flex items-center gap-1">
              <Maximize className="h-3.5 w-3.5 text-primary" />
              {room_size}
            </span>
          )}
        </div>

        {/* Amenity tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {room_properties?.slice(0, maxAmenities).map((prop, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 rounded-md px-2 py-0.5"
            >
              <span className="text-primary/70">
                {getIconForAmenity(prop.amenity.name)}
              </span>
              {prop.amenity.name}
            </span>
          ))}
          {room_properties && room_properties.length > maxAmenities && (
            <button
              onClick={onViewDetails}
              className="text-xs text-primary hover:underline font-medium"
            >
              +{room_properties.length - maxAmenities} more
            </button>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-primary transition-colors ml-1"
            >
              <Info className="h-3 w-3" />
              Details
            </button>
          )}
        </div>

        {available_rooms_count <= 3 && available_rooms_count > 0 && (
          <span className="text-xs text-destructive font-medium mt-2">
            Only {available_rooms_count} left!
          </span>
        )}
      </div>

      {/* Right: Price + Select */}
      <div className="flex flex-col items-end justify-between py-4 pr-4 shrink-0 min-w-[110px]">
        <div className="text-right">
          <p className="text-xs text-muted-foreground">per night</p>
          <p className="font-bold text-lg">৳{Number(base_price).toLocaleString()}</p>
        </div>

        {available_rooms_count > 0 ? (
          <Button
            size="sm"
            variant={isSelected ? "default" : "outline"}
            className={cn(
              "gap-1 transition-all",
              isSelected && "bg-primary text-primary-foreground"
            )}
            onClick={onSelect}
          >
            {isSelected ? "Selected" : "Select"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled>
            Sold Out
          </Button>
        )}
      </div>
    </div>
  );
};

export default RoomTypeCard;
```

---

### STEP 2: Create `src/components/room/booking-sidebar.tsx`

Tell your AI:

> Create a new file at `src/components/room/booking-sidebar.tsx`. This is a 'use client' component. It is the sticky right sidebar on the hotel detail page. It receives the selected room type, check-in/out dates, guest count, and quantity as props. It shows a date picker, guest stepper, price breakdown, and reserve button.

```tsx
"use client";

import { useState } from "react";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Users, Minus, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface SelectedRoom {
  id: number;
  name: string;
  base_price: number;
}

interface BookingSidebarProps {
  hotelSlug: string;
  selectedRoom: SelectedRoom | null;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
}

const SERVICE_FEE_PERCENT = 0.10; // 10%

export default function BookingSidebar({
  hotelSlug,
  selectedRoom,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
}: BookingSidebarProps) {
  const router = useRouter();

  const parseDate = (str?: string) => {
    if (!str) return undefined;
    const d = new Date(str);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const [date, setDate] = useState<DateRange | undefined>({
    from: parseDate(initialCheckIn) ?? new Date(),
    to: parseDate(initialCheckOut) ?? addDays(new Date(), 1),
  });
  const [guests, setGuests] = useState(initialGuests);
  const [quantity, setQuantity] = useState(1);

  const nights = date?.from && date?.to
    ? differenceInCalendarDays(date.to, date.from)
    : 0;

  const roomTotal = selectedRoom ? selectedRoom.base_price * Math.max(nights, 1) * quantity : 0;
  const serviceFee = Math.round(roomTotal * SERVICE_FEE_PERCENT);
  const total = roomTotal + serviceFee;

  const handleReserve = () => {
    if (!selectedRoom || !date?.from || !date?.to) return;
    const params = new URLSearchParams();
    params.set("hotel", hotelSlug);
    params.set("room_type", selectedRoom.id.toString());
    params.set("quantity", quantity.toString());
    params.set("check_in", format(date.from, "yyyy-MM-dd"));
    params.set("check_out", format(date.to, "yyyy-MM-dd"));
    params.set("guests", guests.toString());
    router.push(`/bookings/new?${params.toString()}`);
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm sticky top-24 space-y-5">
      {/* Header */}
      <div className="flex items-baseline justify-between">
        <h3 className="font-bold text-lg">Book your stay</h3>
        {selectedRoom && (
          <span className="text-primary font-bold">
            ৳{Number(selectedRoom.base_price).toLocaleString()}
            <span className="text-xs text-muted-foreground font-normal">/night</span>
          </span>
        )}
      </div>

      {/* Selected room label */}
      {selectedRoom ? (
        <div className="text-xs bg-primary/5 text-primary border border-primary/20 rounded-lg px-3 py-2 font-medium">
          ✓ {selectedRoom.name}
        </div>
      ) : (
        <div className="text-xs bg-secondary/50 text-muted-foreground border border-border/40 rounded-lg px-3 py-2">
          No room selected — choose a room from the list
        </div>
      )}

      {/* Check-in / Check-out */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
          Stay Dates
        </label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start h-auto py-2.5 font-normal text-left",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-primary/60 shrink-0" />
              <div className="flex flex-col leading-tight">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Check-in</span>
                  <span className="text-border">→</span>
                  <span>Check-out</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span>{date?.from ? format(date.from, "MMM dd, yyyy") : "Add date"}</span>
                  <span className="text-muted-foreground">→</span>
                  <span>{date?.to ? format(date.to, "MMM dd, yyyy") : "Add date"}</span>
                </div>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
            <div className="p-3 border-b border-border/40 bg-primary/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Select Dates</span>
              {date?.from && date?.to && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setDate({ from: undefined, to: undefined })}
                >
                  Clear
                </Button>
              )}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={1}
              disabled={{ before: new Date() }}
              className="p-3"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Guests */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
          Guests
        </label>
        <div className="flex items-center justify-between border border-input rounded-lg px-4 h-11 bg-background">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span>{guests} Guest{guests > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGuests(Math.max(1, guests - 1))}
              className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-4 text-center text-sm font-medium">{guests}</span>
            <button
              onClick={() => setGuests(Math.min(10, guests + 1))}
              className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Quantity (rooms) */}
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">
          Rooms
        </label>
        <div className="flex items-center justify-between border border-input rounded-lg px-4 h-11 bg-background">
          <span className="text-sm">{quantity} Room{quantity > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-4 text-center text-sm font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(10, quantity + 1))}
              className="h-7 w-7 rounded-full border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Price Breakdown — only when room selected and dates valid */}
      {selectedRoom && nights > 0 && (
        <div className="space-y-2 pt-3 border-t border-border/40">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              ৳{Number(selectedRoom.base_price).toLocaleString()} × {nights} night{nights > 1 ? "s" : ""}
              {quantity > 1 ? ` × ${quantity} rooms` : ""}
            </span>
            <span>৳{roomTotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service fee</span>
            <span>৳{serviceFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-border/40">
            <span>Total</span>
            <span className="text-primary">৳{total.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Reserve Button */}
      <Button
        className="w-full"
        size="lg"
        disabled={!selectedRoom || nights < 1}
        onClick={handleReserve}
      >
        {!selectedRoom
          ? "Select a room to book"
          : nights < 1
          ? "Select valid dates"
          : "Reserve Now"}
      </Button>

      {/* Trust badge */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        You won't be charged yet
      </div>
    </div>
  );
}
```

---

### STEP 3: Replace `src/components/room/rooms-section-client.tsx`

Tell your AI:

> Replace the entire contents of `src/components/room/rooms-section-client.tsx`. The new version manages the shared selected room state and renders room cards on the left side and passes the selected room to the booking sidebar (which is rendered OUTSIDE this component, in the hotel detail page layout).

```tsx
"use client";

import { useState } from "react";
import RoomTypeCard from "@/components/room/room-type-card";
import RoomDetailModal from "@/components/room/room-detail-modal";

interface RoomTypeImage { id: number; image_url: string; }
interface RoomBedType { bed_type: { name: string }; count: number; }
interface RoomProperty { amenity: { name: string; icon: string | null }; }

export interface RoomType {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  max_occupancy: number;
  room_size: string | null;
  type_images: RoomTypeImage[];
  room_bed_types: RoomBedType[];
  room_properties: RoomProperty[];
  available_rooms_count: number;
}

interface RoomsSectionClientProps {
  roomTypes: RoomType[];
  onRoomSelect: (room: { id: number; name: string; base_price: number } | null) => void;
  selectedRoomId?: number | null;
}

export default function RoomsSectionClient({
  roomTypes,
  onRoomSelect,
  selectedRoomId,
}: RoomsSectionClientProps) {
  const [modalRoom, setModalRoom] = useState<RoomType | null>(null);

  const modalRoomFormatted = modalRoom
    ? {
        id: modalRoom.id,
        name: modalRoom.name,
        description: modalRoom.description,
        base_price: modalRoom.base_price,
        occupancy_adults: modalRoom.max_occupancy,
        room_size: modalRoom.room_size,
        type_images: modalRoom.type_images,
        room_bed_types: modalRoom.room_bed_types,
        room_properties: modalRoom.room_properties,
        available_rooms_count: modalRoom.available_rooms_count,
      }
    : null;

  const handleSelect = (room: RoomType) => {
    if (selectedRoomId === room.id) {
      // Deselect if already selected
      onRoomSelect(null);
    } else {
      onRoomSelect({ id: room.id, name: room.name, base_price: room.base_price });
    }
  };

  return (
    <>
      <div className="space-y-3">
        {roomTypes.map((room) => (
          <RoomTypeCard
            key={room.id}
            id={room.id}
            name={room.name}
            description={room.description}
            base_price={room.base_price}
            occupancy_adults={room.max_occupancy}
            room_size={room.room_size}
            type_images={room.type_images}
            room_bed_types={room.room_bed_types}
            room_properties={room.room_properties}
            available_rooms_count={room.available_rooms_count}
            isSelected={selectedRoomId === room.id}
            onSelect={() => handleSelect(room)}
            onViewDetails={() => setModalRoom(room)}
          />
        ))}
      </div>

      <RoomDetailModal
        isOpen={!!modalRoom}
        onClose={() => setModalRoom(null)}
        roomType={modalRoomFormatted}
      />
    </>
  );
}
```

---

### STEP 4: Create `src/components/room/hotel-detail-client.tsx`

Tell your AI:

> Create a new file at `src/components/room/hotel-detail-client.tsx`. This is a 'use client' component that wraps BOTH the rooms section list AND the booking sidebar together, since they share state (which room is selected). The hotel detail server page will import this instead of importing RoomsSectionClient and BookingSidebar separately.

```tsx
"use client";

import { useState } from "react";
import RoomsSectionClient, { type RoomType } from "@/components/room/rooms-section-client";
import BookingSidebar from "@/components/room/booking-sidebar";

interface HotelDetailClientProps {
  roomTypes: RoomType[];
  hotelSlug: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export default function HotelDetailClient({
  roomTypes,
  hotelSlug,
  checkIn,
  checkOut,
  guests,
}: HotelDetailClientProps) {
  const [selectedRoom, setSelectedRoom] = useState<{
    id: number;
    name: string;
    base_price: number;
  } | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Room list — left 2/3 */}
      <div className="lg:col-span-2">
        <RoomsSectionClient
          roomTypes={roomTypes}
          onRoomSelect={setSelectedRoom}
          selectedRoomId={selectedRoom?.id ?? null}
        />
      </div>

      {/* Booking sidebar — right 1/3 sticky */}
      <div className="lg:col-span-1">
        <BookingSidebar
          hotelSlug={hotelSlug}
          selectedRoom={selectedRoom}
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuests={guests}
        />
      </div>
    </div>
  );
}
```

---

### STEP 5: Update `src/app/(public)/hotels/[slug]/page.tsx`

Tell your AI:

> In the hotel detail page, make two changes:
>
> 1. Import `HotelDetailClient` instead of `RoomsSectionClient`:
>    ```tsx
>    import HotelDetailClient from "@/components/room/hotel-detail-client";
>    ```
>    Remove the import for `RoomsSectionClient`.
>
> 2. Replace the "Room Types" section at the bottom (the `div` with `mt-16 pt-12 border-t`) with this:
>    ```tsx
>    {/* Available Rooms + Booking Sidebar */}
>    <div className="mt-16 pt-12 border-t border-border/50">
>      <h2 className="text-3xl font-bold mb-8">
>        Available Rooms
>        {hotel.room_types.length > 0 && (
>          <span className="ml-3 text-sm font-normal text-muted-foreground">
>            {hotel.room_types.length} room type{hotel.room_types.length > 1 ? "s" : ""}
>          </span>
>        )}
>      </h2>
>
>      {hotel.room_types && hotel.room_types.length > 0 ? (
>        <HotelDetailClient
>          roomTypes={hotel.room_types.map((room) => ({
>            id: room.id,
>            name: room.name,
>            description: room.description,
>            base_price: Number(room.base_price),
>            max_occupancy: room.max_occupancy,
>            room_size: room.room_size,
>            type_images: room.type_images,
>            room_bed_types: room.room_bed_types,
>            room_properties: room.room_properties,
>            available_rooms_count: room.room_details.length,
>          }))}
>          hotelSlug={hotel.slug}
>          checkIn={search.check_in}
>          checkOut={search.check_out}
>          guests={search.guests ? parseInt(search.guests) : 1}
>        />
>      ) : (
>        <div className="flex flex-col items-center justify-center p-12 bg-secondary/20 rounded-3xl border border-border/50">
>          <h3 className="text-xl font-semibold mb-2">No rooms available</h3>
>          <p className="text-muted-foreground text-center">
>            Currently there are no rooms available to book at this property.
>          </p>
>        </div>
>      )}
>    </div>
>    ```
>
> 3. Also remove the old 3-col grid section that had `<div className="space-y-6">` with the location card. The location card should be removed since the booking sidebar takes the right column now. Keep the 2-col grid for About + Amenities + Policies (lg:col-span-2 / lg:col-span-1) but remove the sidebar from that section — it was the map placeholder. The location/map placeholder can be added back below the About content if desired, just as a standalone section not in the sidebar.
>
> The hotel detail page must NOT import RoomsSectionClient or BookingSidebar directly. Only import HotelDetailClient.

---

## SECTION 5 — WHAT NOT TO CHANGE

Do NOT touch these files at all:
- `src/components/room/room-detail-modal.tsx` — correct, working
- `src/app/(public)/hotels/[slug]/hotel-images-client.tsx` — correct, working
- `src/components/hotel/hotel-images-gallery.tsx` — correct, working
- `src/components/hotel/photos-reviews-modal.tsx` — correct, working
- All search components — correct and done
- All admin dashboard pages — not in scope

---

## SECTION 6 — DEPENDENCY CHECK

Before writing the booking sidebar, confirm these shadcn components exist:
- `src/components/ui/calendar.tsx` ✅ (already installed)
- `src/components/ui/popover.tsx` ✅ (already installed)

These imports are needed in `booking-sidebar.tsx`:
```tsx
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
```
`date-fns` and `react-day-picker` are already used in hero-search.tsx so they are already installed.

---

## SECTION 7 — FILE MAP (All 5 Changes)

| # | Action | File | What Changes |
|---|--------|------|--------------|
| 1 | REPLACE | `src/components/room/room-type-card.tsx` | Remove expand/collapse, flat row, Select button, isSelected prop |
| 2 | CREATE | `src/components/room/booking-sidebar.tsx` | New — sticky sidebar with dates, guests, price, reserve |
| 3 | REPLACE | `src/components/room/rooms-section-client.tsx` | onRoomSelect callback, no router navigation, just selection state |
| 4 | CREATE | `src/components/room/hotel-detail-client.tsx` | New — shared state wrapper for rooms + sidebar |
| 5 | UPDATE | `src/app/(public)/hotels/[slug]/page.tsx` | Import HotelDetailClient, replace room section JSX |

---

## SECTION 8 — EXACT VISUAL TARGET

After these changes, the hotel detail page bottom section should look like:

```
Available Rooms  [3 room types]

┌─────────────────────────────────┐  ┌────────────────────────┐
│ [Img] Budget Room    ৳2,000/night│  │ Book your stay  ৳2,000 │
│       Up to 2  1xKing  150sqft  │  │ ──────────────────────  │
│       AC  WiFi  TV    [Select→] │  │ No room selected yet    │
└─────────────────────────────────┘  │                         │
                                      │ Stay Dates              │
┌─────────────────────────────────┐  │ [📅 May 11 → May 13  ] │
│ [Img] Deluxe Room    ৳5,000/night│  │                         │
│       Up to 4  1xKing  250sqft  │  │ Guests [− 2 +]          │
│       AC  WiFi  TV    [Select→] │  │ Rooms  [− 1 +]          │
└─────────────────────────────────┘  │                         │
                                      │ [Select a room to book] │
                                      │ 🔒 Won't charge yet     │
                                      └────────────────────────┘

After clicking [Select→] on Budget Room:

┌─────────────────────────────────┐  ┌────────────────────────┐
│ [Img] Budget Room    ৳2,000/night│  │ Book your stay  ৳2,000 │
│       ...           [Selected✓] │  │ ✓ Budget Room           │
└─────────────────────────────────┘  │ Stay Dates              │
                                      │ [📅 May 11 → May 13  ] │
┌─────────────────────────────────┐  │                         │
│ [Img] Deluxe Room    ৳5,000/night│  │ Guests [− 2 +]          │
│       ...            [Select→]  │  │ Rooms  [− 1 +]          │
└─────────────────────────────────┘  │                         │
                                      │ ৳2,000 × 2 nights ৳4,000│
                                      │ Service fee       ৳400  │
                                      │ Total            ৳4,400 │
                                      │                         │
                                      │ [Reserve Now          ] │
                                      │ 🔒 Won't charge yet     │
                                      └────────────────────────┘
```

---

## SECTION 9 — REMAINING ISSUES FROM LAST AUDIT (STILL OPEN)

These were found in the PREVIOUS audit and have NOT been addressed yet:

### 9.1 Hotels page uses `<SearchBar />` — wrong date picker
`src/app/(public)/hotels/page.tsx` imports `SearchBar` from `search-bar.tsx`.
The `search-bar.tsx` still uses TWO separate date pickers (check_in and check_out) instead of the DateRange picker.
**Fix:** Update `src/components/search/search-bar.tsx` to use DateRange picker like `hero-search.tsx`.

### 9.2 Search page uses `<SearchBar />` — same issue
`src/app/(public)/search/page.tsx` also uses the same `search-bar.tsx`.
Same fix as 9.1.

### 9.3 Cities API `mode: 'insensitive'` may not work on MariaDB
Your DB is MariaDB (via Prisma adapter). Prisma's `mode: 'insensitive'` only works on PostgreSQL.
For MariaDB, remove `mode: 'insensitive'` — MariaDB `LIKE` is case-insensitive by default on most collations.
```ts
// Change in cities/route.ts:
where.name = { contains: q };  // NOT { contains: q, mode: 'insensitive' }
```

### 9.4 `src/app/(public)/popular/page.tsx` — empty or stub
This route exists but is unclear what it should show. Either build it or remove the file.

### 9.5 Booking flow `src/app/(public)/bookings/new/` — needs review
The page exists and has a `booking-client` but this needs testing once the sidebar is live.

---

## SECTION 10 — FINAL BUILD ORDER FOR TODAY

1. ✅ STEP 1: Replace `room-type-card.tsx` (flat row, Select button)
2. ✅ STEP 2: Create `booking-sidebar.tsx` (new file)
3. ✅ STEP 3: Replace `rooms-section-client.tsx` (onRoomSelect pattern)
4. ✅ STEP 4: Create `hotel-detail-client.tsx` (new file)
5. ✅ STEP 5: Update hotel detail page imports and JSX
6. ⬜ STEP 6: Fix `search-bar.tsx` DateRange picker
7. ⬜ STEP 7: Fix cities API remove `mode: 'insensitive'`
8. ⬜ STEP 8: Test full booking flow (select room → reserve → /bookings/new)
