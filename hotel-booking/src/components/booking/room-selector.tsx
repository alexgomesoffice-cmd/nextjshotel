"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import RoomsSectionClient, { type RoomType } from "@/components/room/rooms-section-client";
import BookingSidebar, { type SelectedVariant } from "./booking-sidebar";

type AcFilter = "all" | "ac" | "non-ac";

interface RoomSelectorProps {
  roomTypes: RoomType[];
  hotelSlug: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  focusRoomTypeId?: number;
}

export default function RoomSelector({
  roomTypes: initialRoomTypes,
  hotelSlug,
  checkIn,
  checkOut,
  guests = 1,
  focusRoomTypeId,
}: RoomSelectorProps) {
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [acFilter, setAcFilter] = useState<AcFilter>("all");
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [highlightedRoomTypeId, setHighlightedRoomTypeId] = useState<number | null>(null);

  const [sidebarCheckIn, setSidebarCheckIn] = useState(checkIn);
  const [sidebarCheckOut, setSidebarCheckOut] = useState(checkOut);
  const [sidebarGuests, setSidebarGuests] = useState(guests);
  const [guestWarning, setGuestWarning] = useState<string | null>(null);

  // ── Scroll to #rooms then to the specific card and animate it ──
  useEffect(() => {
    if (!focusRoomTypeId) return;
    // Step 1: scroll the whole rooms section into view
    const step1 = setTimeout(() => {
      document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Step 2: after the first scroll settles, scroll to and highlight the card
      const step2 = setTimeout(() => {
        const card = document.getElementById(`room-type-${focusRoomTypeId}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedRoomTypeId(focusRoomTypeId);
          // Clear highlight after animation finishes
          setTimeout(() => setHighlightedRoomTypeId(null), 3000);
        }
      }, 900);
      return () => clearTimeout(step2);
    }, 350);
    return () => clearTimeout(step1);
  }, [focusRoomTypeId]);
  const datesChanged = sidebarCheckIn !== checkIn || sidebarCheckOut !== checkOut;
  const hasAnySelection = Object.values(quantities).some(q => q > 0);

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

  const handleQuantityChange = (variantId: number, qty: number) => {
    setQuantities(prev => ({ ...prev, [variantId]: qty }));
  };

  // When sidebarGuests changes, drop any selected variants whose room type
  // max_occupancy is less than the requested guests, and notify the user.
  useEffect(() => {
    if (!sidebarGuests) return;
    const dropped: { variantId: number; roomTypeName: string; max: number }[] = [];
    const newQuantities = { ...quantities };
    for (const [vidStr, qty] of Object.entries(quantities)) {
      const vid = parseInt(vidStr);
      if (!qty || qty <= 0) continue;
      const parent = roomTypes.find(rt => rt.room_variants.some(v => v.id === vid));
      if (!parent) continue;
      if (parent.max_occupancy < sidebarGuests) {
        // remove selection
        delete newQuantities[vid];
        dropped.push({ variantId: vid, roomTypeName: parent.name, max: parent.max_occupancy });
      }
    }

    if (dropped.length > 0) {
      setQuantities(newQuantities);
      const first = dropped[0];
      setGuestWarning(`${first.roomTypeName} fits up to ${first.max} guest${first.max !== 1 ? 's' : ''}. Your search needs ${sidebarGuests}.`);
      // clear notice after a short timeout
      const t = setTimeout(() => setGuestWarning(null), 6000);
      return () => clearTimeout(t);
    }
  }, [sidebarGuests, quantities, roomTypes]);

  const filteredRoomTypes = useMemo(() => {
    if (acFilter === "all") return roomTypes;
    return roomTypes
      .map(rt => ({
        ...rt,
        room_variants: rt.room_variants.filter(v =>
          acFilter === "ac" ? v.ac : !v.ac
        ),
      }))
      .filter(rt => rt.room_variants.length > 0);
  }, [roomTypes, acFilter]);

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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-foreground">
          Available Rooms
          {roomTypes.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {roomTypes.length} room type{roomTypes.length > 1 ? "s" : ""}
            </span>
          )}
        </h2>

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

      {datesChanged && hasAnySelection && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm mb-4">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Dates have changed. Your selected rooms may not be available for the new dates. Click Reserve to confirm availability.</span>
        </div>
      )}

      {isLoadingAvailability && (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 text-blue-800 dark:text-blue-300 rounded-xl px-4 py-3 text-sm mb-4">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Checking room availability...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <RoomsSectionClient
            roomTypes={filteredRoomTypes}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
            guests={sidebarGuests}
            highlightedRoomTypeId={highlightedRoomTypeId}
          />
          {filteredRoomTypes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-border/30 rounded-2xl">
              <p className="font-medium">No {acFilter === "ac" ? "AC" : acFilter === "non-ac" ? "non-AC" : ""} rooms available{sidebarGuests > 1 ? ` for ${sidebarGuests} guests` : ""}</p>
              <button onClick={() => setAcFilter("all")} className="text-primary text-sm mt-1 hover:underline">Show all rooms</button>
            </div>
          )}
        </div>

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
            guestWarning={guestWarning}
          />
        </div>
      </div>
    </div>
  );
}
