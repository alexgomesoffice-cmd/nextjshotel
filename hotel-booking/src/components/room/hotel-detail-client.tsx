"use client";

// Owns quantities state, AC filter, date-change tracking, and renders the 3-col rooms+sidebar layout.
// The "Available Rooms" heading + filter pills live here so they sit above the grid.

import { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import RoomsSectionClient, { type RoomType } from "@/components/room/rooms-section-client";
import BookingSidebar, { type SelectedVariant } from "@/components/room/booking-sidebar";

type AcFilter = "all" | "ac" | "non-ac";

interface HotelDetailClientProps {
  roomTypes: RoomType[];
  hotelSlug: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export default function HotelDetailClient({
  roomTypes: initialRoomTypes,
  hotelSlug,
  checkIn,
  checkOut,
  guests = 1,
}: HotelDetailClientProps) {
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [acFilter, setAcFilter] = useState<AcFilter>("all");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // Track sidebar date changes (BUG 8+10)
  const [sidebarCheckIn, setSidebarCheckIn] = useState(checkIn);
  const [sidebarCheckOut, setSidebarCheckOut] = useState(checkOut);
  const [sidebarGuests, setSidebarGuests] = useState(guests);
  const datesChanged = sidebarCheckIn !== checkIn || sidebarCheckOut !== checkOut;
  const hasAnySelection = Object.values(quantities).some(q => q > 0);

  // Function to fetch availability when dates change
  const fetchAvailability = useCallback(async (newCheckIn?: string, newCheckOut?: string) => {
    if (!newCheckIn || !newCheckOut) return;

    setIsLoadingAvailability(true);
    try {
      const params = new URLSearchParams();
      params.set("check_in", newCheckIn);
      params.set("check_out", newCheckOut);

      const res = await fetch(`/api/public/hotels/${hotelSlug}/availability?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRoomTypes(data.data);
          if (hasAnySelection) {
            setQuantities({});
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [hotelSlug, hasAnySelection]);

  const handleDatesChange = (newCheckIn?: string, newCheckOut?: string) => {
    setSidebarCheckIn(newCheckIn);
    setSidebarCheckOut(newCheckOut);
    fetchAvailability(newCheckIn, newCheckOut);
  };

  // BUG 14: Limit to one room type at a time
  const handleQuantityChange = (variantId: number, qty: number) => {
    // Find which room type this variant belongs to
    const targetRoomType = roomTypes.find(rt =>
      rt.room_variants.some(v => v.id === variantId)
    );
    if (!targetRoomType) return;

    // Check if user already has selections from a DIFFERENT room type
    const currentSelections = Object.entries(quantities).filter(([, q]) => q > 0);
    if (currentSelections.length > 0 && qty > 0) {
      const existingVariantId = parseInt(currentSelections[0][0]);
      const existingRoomType = roomTypes.find(rt =>
        rt.room_variants.some(v => v.id === existingVariantId)
      );

      if (existingRoomType && existingRoomType.id !== targetRoomType.id) {
        // Clear all previous selections and set the new one
        setQuantities({ [variantId]: qty });
        return;
      }
    }

    setQuantities(prev => ({ ...prev, [variantId]: qty }));
  };

  // Only filter by AC — never hide rooms due to guest count.
  const filteredRoomTypes = useMemo(() => {
    if (acFilter === "all") return roomTypes;
    return roomTypes.filter(rt =>
      rt.room_variants.some(v =>
        acFilter === "ac" ? v.ac : !v.ac
      )
    );
  }, [roomTypes, acFilter]);

  // Derive selected variants for the sidebar
  const selectedVariants = useMemo<SelectedVariant[]>(() => {
    const result: SelectedVariant[] = [];
    for (const rt of roomTypes) {
      for (const variant of rt.room_variants) {
        const qty = quantities[variant.id] ?? 0;
        if (qty > 0) {
          result.push({
            variantId: variant.id,
            roomTypeId: rt.id,
            roomTypeName: rt.name,
            price: variant.price,
            quantity: qty,
          });
        }
      }
    }
    return result;
  }, [quantities, roomTypes]);

  const lowestPrice = useMemo(
    () => roomTypes.length > 0 ? Math.min(...roomTypes.map(rt => rt.base_price)) : undefined,
    [roomTypes]
  );

  const filters: { label: string; value: AcFilter }[] = [
    { label: "All", value: "all" },
    { label: "AC", value: "ac" },
    { label: "Non-AC", value: "non-ac" },
  ];

  return (
    <div>
      {/* Section heading + filter pills */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-foreground">
          Available Rooms
          {roomTypes.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {roomTypes.length} room type{roomTypes.length > 1 ? "s" : ""}
            </span>
          )}
        </h2>

        {/* AC filter pills */}
        <div className="flex items-center gap-2">
          {filters.map(f => (
            <button
              key={f.value}
              onClick={() => setAcFilter(f.value)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                acFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border/50 hover:border-primary/50 hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date change warning (BUG 10) */}
      {datesChanged && hasAnySelection && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm mb-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Dates have changed. Your selected rooms may not be available for the new dates. Click Reserve to confirm availability.</span>
        </div>
      )}

      {/* Loading indicator for availability */}
      {isLoadingAvailability && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 rounded-xl px-4 py-3 text-sm mb-4">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Checking room availability...</span>
        </div>
      )}

      {/* 3-col grid: rooms left, sidebar right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Room cards — left 2/3 */}
        <div className="lg:col-span-2">
          <RoomsSectionClient
            roomTypes={filteredRoomTypes}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
            guests={sidebarGuests}
          />
          {filteredRoomTypes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-border/30 rounded-2xl">
              <p className="font-medium">No {acFilter === "ac" ? "AC" : acFilter === "non-ac" ? "non-AC" : ""} rooms available{guests > 1 ? ` for ${guests} guests` : ""}</p>
              <button onClick={() => setAcFilter("all")} className="text-primary text-sm mt-1 hover:underline">Show all rooms</button>
            </div>
          )}
        </div>

        {/* Sidebar — right 1/3 */}
        <div className="lg:col-span-1">
          <BookingSidebar
            hotelSlug={hotelSlug}
            selectedVariants={selectedVariants}
            initialCheckIn={checkIn}
            initialCheckOut={checkOut}
            initialGuests={guests}
            displayPrice={lowestPrice}
            onDatesChange={handleDatesChange}
            onGuestsChange={setSidebarGuests}
          />
        </div>
      </div>
    </div>
  );
}
