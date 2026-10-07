"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import RoomsSectionClient, { type RoomType } from "@/components/room/rooms-section-client";
import BookingSidebar, { type SelectedVariant } from "./booking-sidebar";
import { useHotelAvailability } from "@/hooks/use-hotel-availability";
import { ONE_ROOM_TYPE_BOOKING_MESSAGE } from "@/lib/booking-room-type";

const PENDING_BOOKING_KEY = "myhotels:pending-reservation";

interface PendingBookingState {
  selectedQuantities?: Record<number, number>;
}

type AcFilterMode = "all" | "ac" | "non-ac";

type RoomFilters = {
  roomTypes: string[];
  bedTypes: string[];
  roomAmenities: string[];
  facilities: string[];
};

const normalizeFilterValue = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();

const isAirConditionedVariant = (variant: RoomType["room_variants"][number]) =>
  variant.facilities.some((facility) => {
    const normalized = normalizeFilterValue(facility.name);
    return normalized.includes("air conditioning") || normalized.includes("ac");
  });

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
  const restoredPendingState = useRef(false);
  const [acFilter, setAcFilter] = useState<AcFilterMode>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMobileFilters, setIsMobileFilters] = useState(false);
  const [draftFilters, setDraftFilters] = useState<RoomFilters>({
    roomTypes: [],
    bedTypes: [],
    roomAmenities: [],
    facilities: [],
  });
  const [appliedFilters, setAppliedFilters] = useState<RoomFilters>({
    roomTypes: [],
    bedTypes: [],
    roomAmenities: [],
    facilities: [],
  });
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [highlightedRoomTypeId, setHighlightedRoomTypeId] = useState<number | null>(null);

  const [sidebarCheckIn, setSidebarCheckIn] = useState(checkIn);
  const [sidebarCheckOut, setSidebarCheckOut] = useState(checkOut);
  const [sidebarGuests, setSidebarGuests] = useState(guests);
  const [guestWarning, setGuestWarning] = useState<string | null>(null);
  const [internalRoomTypes, setInternalRoomTypes] = useState(initialRoomTypes);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 639px)");
    const updateViewport = () => setIsMobileFilters(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const stored = sessionStorage.getItem(PENDING_BOOKING_KEY);
        if (!stored) {
          restoredPendingState.current = true;
          return;
        }

        const pending = JSON.parse(stored) as PendingBookingState;
        if (pending.selectedQuantities) setQuantities(pending.selectedQuantities);
        restoredPendingState.current = true;
      } catch {
        sessionStorage.removeItem(PENDING_BOOKING_KEY);
        restoredPendingState.current = true;
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!restoredPendingState.current) return;

    try {
      const stored = sessionStorage.getItem(PENDING_BOOKING_KEY);
      const pending = stored ? JSON.parse(stored) as PendingBookingState : {};
      sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify({
        ...pending,
        selectedQuantities: quantities,
      }));
    } catch {
      sessionStorage.removeItem(PENDING_BOOKING_KEY);
    }
  }, [quantities]);

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
    if (qty > 0) {
      const selectedRoomTypeIds = new Set(
        roomTypes.flatMap((roomType) => roomType.room_variants
          .filter((variant) => (quantities[variant.id] ?? 0) > 0)
          .map(() => roomType.id))
      );
      const targetRoomType = roomTypes.find((roomType) => roomType.room_variants.some((variant) => variant.id === variantId));
      if (targetRoomType && selectedRoomTypeIds.size > 0 && !selectedRoomTypeIds.has(targetRoomType.id)) return;
    }
    setQuantities(prev => ({ ...prev, [variantId]: qty }));
  };

  const clearSelectedRooms = () => setQuantities({});

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

  const roomTypeOptions = useMemo(
    () => [...new Set(roomTypes.map((roomType) => roomType.name).filter(Boolean))],
    [roomTypes]
  );

  const bedTypeOptions = useMemo(
    () => [...new Set(
      roomTypes.flatMap((roomType) => roomType.room_variants.flatMap((variant) => variant.bed_types.map((bedType) => bedType.bed_type.name)))
    )].sort((a, b) => a.localeCompare(b)),
    [roomTypes]
  );

  const roomAmenityOptions = useMemo(
    () => [...new Set(
      roomTypes.flatMap((roomType) => roomType.room_type_amenities.map((amenity) => amenity.amenity.name))
    )].sort((a, b) => a.localeCompare(b)),
    [roomTypes]
  );

  const facilityOptions = useMemo(
    () => [...new Set(
      roomTypes.flatMap((roomType) => roomType.room_variants.flatMap((variant) => variant.facilities.map((facility) => facility.name)))
    )].sort((a, b) => a.localeCompare(b)),
    [roomTypes]
  );

  const toggleSelection = (group: keyof RoomFilters, value: string) => {
    setDraftFilters((current) => {
      const selected = current[group];
      const next = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];

      return {
        ...current,
        [group]: next,
      };
    });
  };

  const clearFilters = () => {
    setDraftFilters({
      roomTypes: [],
      bedTypes: [],
      roomAmenities: [],
      facilities: [],
    });
    setAppliedFilters({
      roomTypes: [],
      bedTypes: [],
      roomAmenities: [],
      facilities: [],
    });
    setIsFiltersOpen(false);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setIsFiltersOpen(false);
  };

  const filterCount = Object.values(appliedFilters).reduce((total, items) => total + items.length, 0);

  const matchesFilter = (roomType: RoomType) => {
    const hasAirConditioning = roomType.room_variants.some((variant) => isAirConditionedVariant(variant));
    if (acFilter === "ac" && !hasAirConditioning) return false;
    if (acFilter === "non-ac" && hasAirConditioning) return false;

    if (appliedFilters.roomTypes.length > 0 && !appliedFilters.roomTypes.includes(roomType.name)) return false;

    if (appliedFilters.bedTypes.length > 0) {
      const hasMatchingBed = roomType.room_variants.some((variant) =>
        variant.bed_types.some((bedType) => appliedFilters.bedTypes.includes(bedType.bed_type.name))
      );
      if (!hasMatchingBed) return false;
    }

    if (appliedFilters.roomAmenities.length > 0) {
      const hasMatchingAmenity = roomType.room_type_amenities.some((amenity) =>
        appliedFilters.roomAmenities.includes(amenity.amenity.name)
      );
      if (!hasMatchingAmenity) return false;
    }

    if (appliedFilters.facilities.length > 0) {
      const hasMatchingFacility = roomType.room_variants.some((variant) =>
        variant.facilities.some((facility) => appliedFilters.facilities.includes(facility.name))
      );
      if (!hasMatchingFacility) return false;
    }

    return true;
  };

  const filteredRoomTypes = roomTypes.filter(matchesFilter);

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

  const activeRoomTypeId = selectedVariants[0]?.roomTypeId ?? null;
  const activeRoomTypeName = selectedVariants[0]?.roomTypeName ?? null;

  const lowestPrice = useMemo(() => {
    const allPrices = roomTypes.flatMap(rt => rt.room_variants.map(v => v.pricing.effectivePrice));
    return allPrices.length > 0 ? Math.min(...allPrices) : undefined;
  }, [roomTypes]);

  // Calculate whether the selected rooms can accommodate the guests.
  const selectionValidation = useMemo(() => {
    if (selectedVariants.length === 0) {
      return { isValid: false, message: "" };
    }

    let totalCapacity = 0;
    let totalRooms = 0;
    if (new Set(selectedVariants.map((variant) => variant.roomTypeId)).size > 1) {
      return {
        isValid: false,
        message: ONE_ROOM_TYPE_BOOKING_MESSAGE,
      };
    }
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

    // Then check guest capacity
    if (totalCapacity < sidebarGuests) {
      return {
        isValid: false,
        message: `Selected rooms accommodate ${totalCapacity} guest${totalCapacity !== 1 ? 's' : ''}. You need ${sidebarGuests} guest${sidebarGuests !== 1 ? 's' : ''}.`,
      };
    }

    return { isValid: true, message: "", totalRooms };
  }, [selectedVariants, sidebarGuests, roomTypes]);

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

      {activeRoomTypeName && activeRoomTypeId !== null && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-sm mb-4">
          <p className="text-foreground">
            <span className="font-semibold">{activeRoomTypeName}</span> is active for this booking. You can add other variants from this room type.
          </p>
          <button
            type="button"
            onClick={clearSelectedRooms}
            className="shrink-0 text-primary font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Change room type
          </button>
        </div>
      )}

      <div className="mb-5 overflow-hidden rounded-xl border border-border/60 bg-card/80 shadow-sm">
        <div className="flex min-h-14 flex-nowrap items-center gap-1.5 px-2.5 py-2 sm:gap-2 sm:px-4">
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant={acFilter === "ac" ? "default" : "outline"}
              size="sm"
              aria-pressed={acFilter === "ac"}
              onClick={() => setAcFilter((current) => current === "ac" ? "all" : "ac")}
              className="h-9 min-w-12 px-3 sm:min-w-[3.5rem]"
            >
              AC
            </Button>
            <Button
              type="button"
              variant={acFilter === "non-ac" ? "default" : "outline"}
              size="sm"
              aria-pressed={acFilter === "non-ac"}
              onClick={() => setAcFilter((current) => current === "non-ac" ? "all" : "non-ac")}
              className="h-9 px-3 sm:px-3.5"
            >
              Non-AC
            </Button>
          </div>

          <Button
            type="button"
            variant={filterCount > 0 ? "secondary" : "outline"}
            size="sm"
            aria-expanded={isFiltersOpen}
            onClick={() => {
              setDraftFilters(appliedFilters);
              setIsFiltersOpen((open) => !open);
            }}
            className="ml-auto h-9 shrink-0 gap-1.5 px-3 sm:gap-2 sm:px-3.5"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {filterCount > 0 && (
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {filterCount}
              </span>
            )}
          </Button>
        </div>

        <div
          aria-hidden={!isFiltersOpen}
          inert={!isFiltersOpen}
          className={`grid transition-[grid-template-rows,opacity,transform] duration-200 ease-out ${
            isFiltersOpen
              ? "grid-rows-[1fr] translate-y-0 opacity-100"
              : "pointer-events-none grid-rows-[0fr] -translate-y-1 opacity-0"
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="border-t border-border/60 px-3 py-3 sm:px-4 sm:py-4">
              <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 sm:gap-y-3 lg:grid-cols-4">
                {[
                  { label: "Room Type", key: "roomTypes" as const, options: roomTypeOptions },
                  { label: "Bed Type", key: "bedTypes" as const, options: bedTypeOptions },
                  { label: "Room Amenities", key: "roomAmenities" as const, options: roomAmenityOptions },
                  { label: "Facilities", key: "facilities" as const, options: facilityOptions },
                ].map((group) => (
                  <fieldset key={group.label} className="min-w-0 space-y-1.5">
                    <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </legend>
                    {group.options.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No options at this hotel.</p>
                    ) : (
                      <div
                        className="grid grid-cols-2 gap-x-2 gap-y-1 sm:custom-scrollbar sm:block sm:max-h-28 sm:space-y-1 sm:overflow-y-auto sm:overscroll-contain sm:pr-1"
                        data-lenis-prevent={!isMobileFilters ? "" : undefined}
                        data-lenis-prevent-wheel={!isMobileFilters ? "" : undefined}
                        data-lenis-prevent-touch={!isMobileFilters ? "" : undefined}
                      >
                        {group.options.map((option) => (
                          <label
                            key={option}
                            className="flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-muted/50 sm:min-h-8"
                          >
                            <Checkbox
                              checked={draftFilters[group.key].includes(option)}
                              onCheckedChange={() => toggleSelection(group.key, option)}
                            />
                            <span className="break-words text-xs text-foreground sm:text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
                <Button type="button" size="sm" onClick={applyFilters}>
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RoomsSectionClient
            roomTypes={filteredRoomTypes}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
            guests={sidebarGuests}
            highlightedRoomTypeId={highlightedRoomTypeId ?? undefined}
            onClearHighlight={() => setHighlightedRoomTypeId(null)}
            activeRoomTypeId={activeRoomTypeId ?? undefined}
          />
          {filteredRoomTypes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-border/30 rounded-2xl">
              <p className="font-medium">No rooms available{sidebarGuests > 1 ? ` for ${sidebarGuests} guests` : ""}</p>
            </div>
          )}
        </div>

        <div className="xl:col-span-1 xl:sticky xl:top-24">
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