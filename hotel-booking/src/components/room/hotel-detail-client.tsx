"use client";

// Owns quantities state, AC filter, and renders the 3-col rooms+sidebar layout.
// The "Available Rooms" heading + filter pills live here so they sit above the grid.

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
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
  roomTypes,
  hotelSlug,
  checkIn,
  checkOut,
  guests = 1,
}: HotelDetailClientProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [acFilter, setAcFilter] = useState<AcFilter>("all");

  const handleQuantityChange = (variantId: number, qty: number) => {
    setQuantities(prev => ({ ...prev, [variantId]: qty }));
  };

  // Filter room types — show only those that have at least one variant matching the filter
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

      {/* 3-col grid: rooms left, sidebar right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Room cards — left 2/3 */}
        <div className="lg:col-span-2">
          <RoomsSectionClient
            roomTypes={filteredRoomTypes}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
          />
          {filteredRoomTypes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-border/30 rounded-2xl">
              <p className="font-medium">No {acFilter === "ac" ? "AC" : "non-AC"} rooms available</p>
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
          />
        </div>
      </div>
    </div>
  );
}
