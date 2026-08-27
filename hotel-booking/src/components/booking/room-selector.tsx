"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import RoomsSectionClient, { type RoomType } from "@/components/room/rooms-section-client";
import BookingSidebar, { type SelectedVariant } from "./booking-sidebar";
import { useHotelAvailability } from "@/hooks/use-hotel-availability";

// The old AC-only/Non-AC filter was tied to a single boolean field that no
// longer exists (facilities are now an arbitrary named set per variant).
// Removed rather than faked — no filter is shown until a real
// facility-based filter is designed.

interface RoomSelectorProps {
  roomTypes: RoomType[];
  hotelSlug: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  requestedRooms?: number | null;
  focusRoomTypeId?: number;
}

export default function RoomSelector({
  roomTypes: initialRoomTypes,
  hotelSlug,
  checkIn,
  checkOut,
  guests = 1,
  requestedRooms,
  focusRoomTypeId,
}: RoomSelectorProps) {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  // (acFilter state removed alongside the AC-only/Non-AC filter)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [highlightedRoomTypeId, setHighlightedRoomTypeId] = useState<number | null>(null);

  const [sidebarCheckIn, setSidebarCheckIn] = useState(checkIn);
  const [sidebarCheckOut, setSidebarCheckOut] = useState(checkOut);
  const [sidebarGuests, setSidebarGuests] = useState(guests);
  const [guestWarning, setGuestWarning] = useState<string | null>(null);
  const [internalRoomTypes, setInternalRoomTypes] = useState(initialRoomTypes);

  // ── Scroll to #rooms then to the specific card and animate it ──
  useEffect(() => {
    if (!focusRoomTypeId) return;

    let attempt = 0;
    let timeoutId: number;

    const scrollToRoom = () => {
      const section = document.getElementById('rooms');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      const card = document.getElementById(`room-type-${focusRoomTypeId}`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedRoomTypeId(focusRoomTypeId);
        return;
      }

      attempt += 1;
      if (attempt < 3) {
        timeoutId = window.setTimeout(scrollToRoom, 450);
      }
    };

    timeoutId = window.setTimeout(scrollToRoom, 200);

    return () => clearTimeout(timeoutId);
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
          setInternalRoomTypes(data.data);
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

  // Wire up the socket hook to auto-refresh when someone else changes availability
  // (e.g. they booked the last room, or admin changed the price)
  const onRefreshNeeded = useCallback(() => {
    // Only refresh if we have dates selected
    if (sidebarCheckIn && sidebarCheckOut) {
      fetchAvailability(sidebarCheckIn, sidebarCheckOut);
    }
  }, [sidebarCheckIn, sidebarCheckOut, fetchAvailability]);

  // Extract hotelId from the first room type (since they all belong to the same hotel)
  const hotelIdNum = internalRoomTypes.length > 0 ? internalRoomTypes[0].hotel_id : 0;
  
  // Replace the old useState `roomTypes` with the live-synced one
  const roomTypes = useHotelAvailability(hotelIdNum, internalRoomTypes, onRefreshNeeded);

  const handleQuantityChange = (variantId: number, qty: number) => {
    setQuantities(prev => ({ ...prev, [variantId]: qty }));
  };

  const handleSidebarGuestsChange = (newGuests: number) => {
    setSidebarGuests(newGuests);
    // Guest count change no longer automatically removes selections.
    // The user can manually adjust room quantities based on the capacity recommendations shown in each variant.
  };

  useEffect(() => {
    if (!guestWarning) return;
    const t = window.setTimeout(() => setGuestWarning(null), 6000);
    return () => clearTimeout(t);
  }, [guestWarning]);

  const filteredRoomTypes = roomTypes;

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
            price: variant.pricing.effectivePrice,
            quantity: qty,
          });
        }
      }
    }
    return result;
  }, [quantities, roomTypes]);

  const lowestPrice = useMemo(() => {
    const allPrices = roomTypes.flatMap(rt => rt.room_variants.map(v => v.pricing.effectivePrice));
    return allPrices.length > 0 ? Math.min(...allPrices) : undefined;
  }, [roomTypes]);

  // Calculate if the selected rooms can accommodate the guests AND respect room limit
  const selectionValidation = useMemo(() => {
    if (selectedVariants.length === 0) {
      return { isValid: false, message: "" };
    }

    let totalCapacity = 0;
    let totalRooms = 0;
    for (const selectedVar of selectedVariants) {
      // Find the variant to get its max_occupancy
      for (const rt of roomTypes) {
        for (const v of rt.room_variants) {
          if (v.id === selectedVar.variantId) {
            const variantCapacity = (v.max_occupancy ?? 1) * selectedVar.quantity;
            totalCapacity += variantCapacity;
            totalRooms += selectedVar.quantity;
            break;
          }
        }
      }
    }

    // Check room limit first (this is a hard constraint from search)
    if (requestedRooms !== null && requestedRooms !== undefined && totalRooms > requestedRooms) {
      return {
        isValid: false,
        message: `You selected ${totalRooms} room${totalRooms !== 1 ? 's' : ''}, but your search allows up to ${requestedRooms}. Select fewer rooms.`,
      };
    }

    // Then check guest capacity
    if (totalCapacity < sidebarGuests) {
      return {
        isValid: false,
        message: `Selected rooms accommodate ${totalCapacity} guest${totalCapacity !== 1 ? 's' : ''}. You need ${sidebarGuests} guest${sidebarGuests !== 1 ? 's' : ''}.`,
      };
    }

    return { isValid: true, message: "" };
  }, [selectedVariants, sidebarGuests, requestedRooms, roomTypes]);

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
            highlightedRoomTypeId={highlightedRoomTypeId ?? undefined}
            onClearHighlight={() => setHighlightedRoomTypeId(null)}
          />
          {filteredRoomTypes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-border/30 rounded-2xl">
              <p className="font-medium">No rooms available{sidebarGuests > 1 ? ` for ${sidebarGuests} guests` : ""}</p>
            </div>
          )}
        </div>

        <div className="lg:col-span-1 sticky top-24">
          <BookingSidebar
            hotelId={hotelIdNum}
            selectedVariants={selectedVariants}
            initialCheckIn={checkIn}
            initialCheckOut={checkOut}
            initialGuests={guests}
            requestedRooms={requestedRooms}
            displayPrice={lowestPrice}
            onDatesChange={handleDatesChange}
            onGuestsChange={handleSidebarGuestsChange}
            guestWarning={guestWarning}
            selectionValidation={selectionValidation}
          />
        </div>
      </div>
    </div>
  );
}