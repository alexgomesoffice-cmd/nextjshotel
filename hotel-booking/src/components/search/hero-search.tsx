"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { addDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Minus,
  Plus,
  Hotel,
  Loader2,
  Star,
  ChevronDown,
  SlidersHorizontal,
  X,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getBookingWindowStart,
  getBookingWindowEnd,
  getStayNights,
  validateBookingDateRange,
  MAX_STAY_NIGHTS,
} from "@/lib/date-policy";

export interface SearchSuggestion {
  id: number;
  name: string;
  type: "hotel" | "city";
  city?: string;
  address?: string;
}

interface SearchBarProps {
  showFilters?: boolean;
  className?: string;
}

interface Amenity {
  id: number;
  name: string;
  context: string;
}

interface AmenityGroups {
  hotel: Amenity[];
  room: Amenity[];
}

interface CityApiItem {
  id: number;
  name: string;
}

interface HotelApiItem {
  id: number;
  name: string;
  city?: string;
  address?: string;
}

const AMENITIES_PREVIEW = 9;

const DESKTOP_SEARCH_WIDTH = 760;
const DESKTOP_FILTER_WIDTH = 400;

const SearchBar = ({
  showFilters = true,
  className,
}: SearchBarProps) => {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const [searchLocation, setSearchLocation] = useState("");

  const [date, setDate] = useState<DateRange | undefined>({
    from: getBookingWindowStart(),
    to: addDays(getBookingWindowStart(), 1),
  });
  const [temporaryRange, setTemporaryRange] = useState<DateRange | undefined>(undefined);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<"desktop" | "mobile" | null>(null);

  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);

  type ActiveOverlay = "location" | "guest" | null;
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);
  const [activeGuestPanel, setActiveGuestPanel] = useState<"desktop" | "mobile" | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilterPanel, setActiveFilterPanel] = useState<"desktop" | "mobile" | null>(null);

  // Derived values (read-only, never set directly)
  const isGuestOpen = activeOverlay === "guest";
  const isLocationSuggestionsOpen = activeOverlay === "location";

  const [suggestions, setSuggestions] = useState<{
    hotels: SearchSuggestion[];
    cities: SearchSuggestion[];
  }>({
    hotels: [],
    cities: [],
  });

  const [isLoadingSuggestions, setIsLoadingSuggestions] =
    useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);

  const [hotelTypeOptions, setHotelTypeOptions] = useState<
    { id: number; name: string }[]
  >([]);

  const [amenityGroups, setAmenityGroups] =
    useState<AmenityGroups>({
      hotel: [],
      room: [],
    });

  const [showAllHotelAmenities, setShowAllHotelAmenities] =
    useState(false);

  const [showAllRoomAmenities, setShowAllRoomAmenities] =
    useState(false);

  const [selectedHotelTypes, setSelectedHotelTypes] =
    useState<string[]>([]);

  const [selectedStars, setSelectedStars] =
    useState<number[]>([]);

  const [selectedAmenities, setSelectedAmenities] =
    useState<number[]>([]);

  const activeCount =
    selectedHotelTypes.length +
    selectedStars.length +
    selectedAmenities.length;

  /*
   * ================================================================
   * LOAD FILTER DATA
   * ================================================================
   */

  useEffect(() => {
    let cancelled = false;

    const loadFilters = async () => {
      try {
        const [hotelTypesResponse, amenitiesResponse] =
          await Promise.all([
            fetch("/api/public/hotel-types"),
            fetch("/api/public/amenities"),
          ]);

        if (!cancelled && hotelTypesResponse.ok) {
          const data = (await hotelTypesResponse.json()) as {
            success?: boolean;
            data?: { id: number; name: string }[];
          };

          if (data.success && Array.isArray(data.data)) {
            setHotelTypeOptions(data.data);
          }
        }

        if (!cancelled && amenitiesResponse.ok) {
          const data = (await amenitiesResponse.json()) as {
            success?: boolean;
            data?: {
              HOTEL?: Amenity[];
              ROOM?: Amenity[];
            };
          };

          if (data.success) {
            setAmenityGroups({
              hotel: Array.isArray(data.data?.HOTEL)
                ? data.data.HOTEL
                : [],
              room: Array.isArray(data.data?.ROOM)
                ? data.data.ROOM
                : [],
            });
          }
        }
      } catch {
        // Filter loading failure should not break search UI.
      }
    };

    void loadFilters();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ================================================================
   * OUTSIDE CLICK + ESCAPE
   * ================================================================
   */

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;

      const clickedPopover =
        target?.closest("[data-slot='popover-content']") ||
        target?.closest(
          "[data-radix-popper-content-wrapper]"
        );

      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !clickedPopover
      ) {
        setIsFilterOpen(false);
        setActiveFilterPanel(null);
        setActiveOverlay(null);
        setSuggestions({
          hotels: [],
          cities: [],
        });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
        setActiveFilterPanel(null);
        setActiveOverlay(null);
        setSuggestions({
          hotels: [],
          cities: [],
        });
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleMouseDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  /*
   * ================================================================
   * LOCATION SEARCH
   * ================================================================
   */

 const handleLocationChange = useCallback(
  async (value: string) => {
    setSearchLocation(value);

    // IMMEDIATELY set active overlay to location, closing guest
    setActiveOverlay("location");

    // Don't fetch suggestions until at least 2 characters
    if (value.trim().length < 2) {
      setSuggestions({
        hotels: [],
        cities: [],
      });
      setIsLoadingSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const currentRequestId = ++requestIdRef.current;
    const currentAbortController = new AbortController();
    abortControllerRef.current = currentAbortController;

    try {
      const encoded = encodeURIComponent(value.trim());

      const [citiesResponse, hotelsResponse] =
        await Promise.all([
          fetch(`/api/public/cities?q=${encoded}`, {
            signal: currentAbortController.signal,
          }),
          fetch(`/api/public/hotels?location=${encoded}`, {
            signal: currentAbortController.signal,
          }),
        ]);

      // If request was aborted, don't update state
      if (currentAbortController.signal.aborted) {
        return;
      }

      const next: {
        hotels: SearchSuggestion[];
        cities: SearchSuggestion[];
      } = {
        hotels: [],
        cities: [],
      };

      if (citiesResponse.ok) {
        const data = (await citiesResponse.json()) as {
          success?: boolean;
          data?: CityApiItem[];
        };

        if (data.success && Array.isArray(data.data)) {
          next.cities = data.data.map((city) => ({
            id: city.id,
            name: city.name,
            type: "city",
          }));
        }
      }

      if (hotelsResponse.ok) {
        const data = (await hotelsResponse.json()) as {
          success?: boolean;
          data?: HotelApiItem[];
        };

        if (data.success && Array.isArray(data.data)) {
          next.hotels = data.data.map((hotel) => ({
            id: hotel.id,
            name: hotel.name,
            type: "hotel",
            city: hotel.city,
            address: hotel.address,
          }));
        }
      }

      // Only update state if:
      // 1. Request is still active (not aborted)
      // 2. This is still the latest request (requestId matches)
      // 3. activeOverlay is still "location" (user hasn't switched to guest)
      if (!currentAbortController.signal.aborted && currentRequestId === requestIdRef.current) {
        setSuggestions(next);
        // Keep location overlay open if we have results
        if (next.hotels.length > 0 || next.cities.length > 0) {
          setActiveOverlay("location");
        } else {
          setActiveOverlay(null);
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name !== "AbortError") {
        setSuggestions({
          hotels: [],
          cities: [],
        });
        if (currentRequestId === requestIdRef.current) {
          setActiveOverlay(null);
        }
      }
    } finally {
      setIsLoadingSuggestions(false);
    }
  },
  []
);


  const handleSuggestionSelect = (
    suggestion: SearchSuggestion
  ) => {
    setSearchLocation(
      suggestion.type === "hotel"
        ? `${suggestion.name}${
            suggestion.city ? `, ${suggestion.city}` : ""
          }`
        : suggestion.name
    );

    setSuggestions({
      hotels: [],
      cities: [],
    });
    setActiveOverlay(null);
  };

  /*
   * ================================================================
   * SEARCH
   * ================================================================
   */

  const handleDateChange = (selectedDate: Date) => {
    const firstDate = temporaryRange?.from;

    if (!firstDate) {
      setTemporaryRange({ from: selectedDate, to: undefined });
      setDateValidationError(null);
      return;
    }

    if (selectedDate.getTime() === firstDate.getTime()) {
      setTemporaryRange({ from: firstDate, to: undefined });
      setDateValidationError(null);
      return;
    }

    const checkIn =
      firstDate < selectedDate ? firstDate : selectedDate;
    const checkOut =
      firstDate < selectedDate ? selectedDate : firstDate;
    const newDate = { from: checkIn, to: checkOut };

    const validation = validateBookingDateRange(checkIn, checkOut);
    if (!validation.isValid) {
      setTemporaryRange({ from: firstDate, to: undefined });
      setDateValidationError(validation.message);
      return;
    }

    setTemporaryRange(undefined);
    setDateValidationError(null);
    setDate(newDate);
    setIsDatePickerOpen(false);
  };

  const selectedNights = (() => {
    const selectedRange = temporaryRange ?? date;
    if (!selectedRange?.from || !selectedRange?.to) return null;

    const validation = validateBookingDateRange(
      selectedRange.from,
      selectedRange.to,
    );
    return validation.isValid
      ? getStayNights(selectedRange.from, selectedRange.to)
      : null;
  })();

  const displayedDate = temporaryRange ?? date;

  const isDateRangeValid = () => {
    if (!date?.from || !date?.to) {
      return false;
    }
    const validation = validateBookingDateRange(date.from, date.to);
    return validation.isValid;
  };

  const handleSearch = () => {
    // Validate date range before searching
    if (!isDateRangeValid()) {
      setDateValidationError(
        "Please select valid dates (within 3 months and maximum 21 nights)."
      );
      return;
    }

    const params = new URLSearchParams();

    if (searchLocation.trim()) {
      params.set("location", searchLocation.trim());
    }

    if (date?.from) {
      params.set(
        "check_in",
        format(date.from, "yyyy-MM-dd")
      );
    }

    if (date?.to) {
      params.set(
        "check_out",
        format(date.to, "yyyy-MM-dd")
      );
    }

    params.set("guests", String(guests));
    params.set("rooms", String(rooms));

    if (selectedHotelTypes.length > 0) {
      params.set(
        "hotel_types",
        selectedHotelTypes.join(",")
      );
    }

    if (selectedStars.length > 0) {
      params.set("stars", selectedStars.join(","));
    }

    if (selectedAmenities.length > 0) {
      params.set(
        "amenities",
        selectedAmenities.join(",")
      );
    }

    router.push(`/search?${params.toString()}`);
  };

  /*
   * ================================================================
   * FILTER HELPERS
   * ================================================================
   */

  const resetFilters = () => {
    setSelectedHotelTypes([]);
    setSelectedStars([]);
    setSelectedAmenities([]);
    setShowAllHotelAmenities(false);
    setShowAllRoomAmenities(false);
  };

  const togglePill = <T,>(
    array: T[],
    value: T,
    setter: (value: T[]) => void
  ) => {
    setter(
      array.includes(value)
        ? array.filter((item) => item !== value)
        : [...array, value]
    );
  };

  const visibleHotelAmenities = showAllHotelAmenities
    ? amenityGroups.hotel
    : amenityGroups.hotel.slice(0, AMENITIES_PREVIEW);

  const visibleRoomAmenities = showAllRoomAmenities
    ? amenityGroups.room
    : amenityGroups.room.slice(0, AMENITIES_PREVIEW);

  /*
   * ================================================================
   * DATE DISABLED
   * ================================================================
   */

  const isDateDisabled = (day: Date) => {
    const windowStart = getBookingWindowStart();
    const windowEnd = getBookingWindowEnd();

    // Disable dates outside the booking window
    return day < windowStart || day >= windowEnd;
  };

  /*
   * ================================================================
   * SHARED STYLES (glass-row design)
   * ================================================================
   */

  const rowClass =
    "group flex h-14 items-center gap-3 rounded-full px-4 transition-colors hover:bg-white/10";

  const rowLabelClass =
    "block text-[10px] font-medium uppercase tracking-wider text-white/60";

  const dividerClass = "mx-4 h-px bg-white/15";

  const vDividerClass = "h-6 w-px bg-white/15";

  const popoverCardClass =
    "rounded-2xl border border-white/15 bg-background/95 text-foreground shadow-2xl backdrop-blur-2xl";

  type FilterVariant = "light" | "dark";

  const chipClass = (selected: boolean, variant: FilterVariant) =>
    cn(
      "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
      variant === "dark"
        ? selected
          ? "border-primary/50 bg-primary/20 text-white"
          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
        : selected
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-transparent text-foreground hover:bg-accent"
    );

  const sectionLabelClass = (variant: FilterVariant) =>
    cn(
      "text-[11px] font-semibold uppercase tracking-[0.12em]",
      variant === "dark" ? "text-white/50" : "text-muted-foreground"
    );

  const moreChipClass = (variant: FilterVariant) =>
    cn(
      "rounded-full border border-dashed px-3 py-1.5 text-[12px] font-medium transition-colors",
      variant === "dark"
        ? "border-white/20 text-white/50 hover:border-white/35 hover:text-white"
        : "border-border text-muted-foreground hover:border-foreground/25 hover:text-foreground"
    );

  /*
   * ================================================================
   * LOCATION FIELD
   * ================================================================
   */

  const locationField = (
    <div className="relative z-20 min-w-0 w-full">
      <div className={rowClass}>
        <MapPin className="size-[18px] shrink-0 text-white/70" />

        <div className="min-w-0 flex-1">
          <label className={rowLabelClass}>Location</label>

          <Input
            value={searchLocation}
            onChange={(event) =>
              void handleLocationChange(event.target.value)
            }
            onFocus={() => {
              if (searchLocation.trim().length > 0) {
                setActiveOverlay("location");
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSuggestions({
                  hotels: [],
                  cities: [],
                });
                setActiveOverlay(null);
                handleSearch();
              }
            }}
            placeholder="Where are you going?"
            className="h-9 w-full border-0 bg-transparent p-0 text-sm font-medium !text-white shadow-none placeholder:!text-white/50 focus-visible:ring-0"
            aria-label="Location"
          />
        </div>

        {isLoadingSuggestions && (
          <Loader2 className="size-4 shrink-0 animate-spin text-white/60" />
        )}
      </div>

      {(() => {
        const showLocationSuggestions =
          isLocationSuggestionsOpen &&
          (suggestions.hotels.length > 0 || suggestions.cities.length > 0);

        return (
          <div
            className={cn(
              "absolute left-0 right-0 top-[calc(100%+10px)] z-[500] overflow-hidden custom-scrollbar transition-[opacity,transform] duration-200 ease-out",
              popoverCardClass,
              showLocationSuggestions
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-1 opacity-0"
            )}
            data-lenis-prevent
            data-lenis-prevent-wheel
            data-lenis-prevent-touch
            aria-hidden={!showLocationSuggestions}
          >
            <div className="max-h-80 overflow-y-auto p-2">
              {suggestions.hotels.length > 0 && (
                <div
                  className={cn(
                    "p-2",
                    suggestions.cities.length > 0 &&
                      "border-b border-border/50"
                  )}
                >
                  <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Hotels
                  </div>

                  {suggestions.hotels.map((hotel) => (
                    <button
                      key={`hotel-${hotel.id}`}
                      type="button"
                      onClick={() =>
                        handleSuggestionSelect(hotel)
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <Hotel className="h-4 w-4 shrink-0 text-primary" />

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {hotel.name}
                        </div>

                        {hotel.address && (
                          <div className="truncate text-xs text-muted-foreground">
                            {hotel.address}
                          </div>
                        )}

                        {hotel.city && (
                          <div className="truncate text-[11px] text-muted-foreground/80">
                            {hotel.city}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {suggestions.cities.length > 0 && (
                <div className="p-2">
                  <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                    Locations
                  </div>

                  {suggestions.cities.map((city) => (
                    <button
                      key={`city-${city.id}`}
                      type="button"
                      onClick={() =>
                        handleSuggestionSelect(city)
                      }
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-primary" />

                      <span className="truncate text-sm font-medium">
                        {city.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );

  /*
   * ================================================================
   * DATE FIELD
   * ================================================================
   */

  const dateField = (instance: "desktop" | "mobile") => (
    <Popover
      open={isDatePickerOpen && activeDatePicker === instance}
      onOpenChange={(open) => {
        setIsDatePickerOpen(open);
        if (!open) setActiveDatePicker(null);
        setTemporaryRange(undefined);
        if (open) setDateValidationError(null);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={() => {
            setActiveDatePicker(instance);
            setIsDatePickerOpen(true);
          }}
          className={cn(rowClass, "min-w-0 flex-1 text-left")}
        >
          <CalendarIcon className="size-[18px] shrink-0 text-white/70" />

          <div className="min-w-0 flex-1">
            <span className={rowLabelClass}>Stay dates</span>

            <span className="block truncate text-sm font-medium text-white">
              {displayedDate?.from
                ? format(displayedDate.from, "MMM d")
                : "Check in"}
              {" – "}
              {displayedDate?.to
                ? format(displayedDate.to, "MMM d")
                : "Check out"}
            </span>
          </div>

          {selectedNights !== null && (
            <span className="hidden shrink-0 whitespace-nowrap text-xs font-medium text-white/60 sm:inline">
              {selectedNights} {selectedNights === 1 ? "night" : "nights"}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        className={cn(
          "z-[500] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden p-0",
          popoverCardClass
        )}
      >
        {/* Calendar Header */}
        <div className="flex items-center justify-between border-b border-border/50 bg-foreground/[0.03] px-4 py-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Select Dates
            </div>

            <div className="mt-0.5 text-xs text-muted-foreground">
              Maximum 3 weeks (21 nights)
            </div>

            {selectedNights !== null && (
              <div className="mt-0.5 text-xs text-muted-foreground">
                {selectedNights} {selectedNights === 1 ? "night" : "nights"}
              </div>
            )}
          </div>

          {date?.from && date?.to && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => {
                setDate({
                  from: undefined,
                  to: undefined,
                });
                setTemporaryRange(undefined);
                setDateValidationError(null);
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {/* Validation Error */}
        {dateValidationError && (
          <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-600 mt-0.5" />
            <div className="text-xs text-amber-700 dark:text-amber-500">
              {dateValidationError}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="flex w-full justify-center pt-0 p-3">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={temporaryRange ?? date}
            onSelect={() => undefined}
            onDayClick={handleDateChange}
            numberOfMonths={1}
            disabled={isDateDisabled}
            fromDate={getBookingWindowStart()}
            toDate={getBookingWindowEnd()}
            className="w-full"
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  /*
   * ================================================================
   * GUEST FIELD
   * ================================================================
   */

  const guestField = (instance: "desktop" | "mobile") => (
    <div className="relative min-w-0 flex-1">
      <Popover
      open={isGuestOpen && activeGuestPanel === instance}
      onOpenChange={(open) => {
        if (open) {
          abortControllerRef.current?.abort();
          setSuggestions({ hotels: [], cities: [] });
          requestIdRef.current += 1;
          setActiveGuestPanel(instance);
          setActiveOverlay("guest");
        } else if (activeGuestPanel === instance) {
          setActiveGuestPanel(null);
          setActiveOverlay(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(rowClass, "w-full text-left")}
          aria-expanded={isGuestOpen && activeGuestPanel === instance}
        >
          <Users className="size-[18px] shrink-0 text-white/70" />

          <div className="min-w-0 flex-1">
            <span className={rowLabelClass}>Guests</span>

            <span className="block truncate text-sm font-medium text-white">
              {guests} Guest
              {guests > 1 ? "s" : ""}, {rooms} Room
              {rooms > 1 ? "s" : ""}
            </span>
          </div>

          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-white/60 transition-transform duration-200",
              isGuestOpen && activeGuestPanel === instance && "rotate-180"
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align={instance === "mobile" ? "end" : "start"}
        side="bottom"
        sideOffset={10}
        collisionPadding={12}
        className={cn(
          "z-[500] w-64 max-w-[calc(100vw-1.5rem)] p-3",
          popoverCardClass
        )}
      >
        {[
          {
            label: "Guests",
            value: guests,
            setter: setGuests,
            max: 30,
          },
          {
            label: "Rooms",
            value: rooms,
            setter: setRooms,
            max: 10,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {item.sublabel}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label={`Decrease ${item.label.toLowerCase()}`}
                disabled={item.value <= 1}
                onClick={() => item.setter(Math.max(1, item.value - 1))}
                className="flex size-8 items-center justify-center rounded-full border border-border bg-transparent text-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                <Minus className="size-3.5" />
              </button>

              <span className="min-w-5 text-center text-sm font-semibold tabular-nums text-foreground">
                {item.value}
              </span>

              <button
                type="button"
                aria-label={`Increase ${item.label.toLowerCase()}`}
                disabled={item.value >= item.max}
                onClick={() => item.setter(Math.min(item.max, item.value + 1))}
                className="flex size-8 items-center justify-center rounded-full border border-border bg-transparent text-foreground transition-colors hover:bg-accent disabled:opacity-40"
              >
                <Plus className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </PopoverContent>
      </Popover>
    </div>
  );

  /*
   * ================================================================
   * SEARCH BUTTON
   * ================================================================
   */

  const searchButton = (
    <Button
      onClick={handleSearch}
      disabled={!isDateRangeValid()}
      className={cn(
        "h-11 w-full rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-lg shadow-primary/25",
        "transition-all duration-300",
        "hover:scale-[1.02] hover:bg-primary/90 hover:shadow-primary/35",
        "focus-visible:ring-2 focus-visible:ring-primary",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      )}
    >
      <Search className="mr-1.5 size-4" />

      <span className="text-sm font-semibold">
        Search
      </span>
    </Button>
  );

  /*
   * ================================================================
   * FILTER CONTENT
   * ================================================================
   */

  const renderFilterContent = (variant: FilterVariant) => (
  <div className="space-y-5">
    {/* Property Type */}
    {hotelTypeOptions.length > 0 && (
      <section>
        <div className="mb-2.5">
          <p className={sectionLabelClass(variant)}>
            Property Type
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {hotelTypeOptions.map((option) => {
            const selected =
              selectedHotelTypes.includes(option.name);

            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  togglePill(
                    selectedHotelTypes,
                    option.name,
                    setSelectedHotelTypes
                  )
                }
                className={chipClass(selected, variant)}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </section>
    )}

    {/* Star Rating */}
    <section>
      <div className="mb-2.5">
        <p className={sectionLabelClass(variant)}>
          Star Rating
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = selectedStars.includes(star);

          return (
            <button
              key={star}
              type="button"
              onClick={() =>
                togglePill(
                  selectedStars,
                  star,
                  setSelectedStars
                )
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                variant === "dark"
                  ? selected
                    ? "border-amber-400/50 bg-amber-500/20 text-amber-300"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  : selected
                    ? "border-amber-400/60 bg-amber-500/15 text-amber-600 dark:text-amber-300"
                    : "border-border bg-transparent text-foreground hover:bg-accent"
              )}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  selected
                    ? variant === "dark"
                      ? "fill-amber-300 text-amber-300"
                      : "fill-amber-400 text-amber-400 dark:fill-amber-300 dark:text-amber-300"
                    : variant === "dark"
                      ? "text-white/40"
                      : "text-muted-foreground"
                )}
              />

              {star}
            </button>
          );
        })}
      </div>
    </section>

    {/* Hotel Amenities */}
    {amenityGroups.hotel.length > 0 && (
      <section>
        <div className="mb-2.5">
          <p className={sectionLabelClass(variant)}>
            Hotel Amenities
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {visibleHotelAmenities.map((amenity) => {
            const selected =
              selectedAmenities.includes(amenity.id);

            return (
              <button
                key={amenity.id}
                type="button"
                onClick={() =>
                  togglePill(
                    selectedAmenities,
                    amenity.id,
                    setSelectedAmenities
                  )
                }
                className={chipClass(selected, variant)}
              >
                {amenity.name}
              </button>
            );
          })}

          {amenityGroups.hotel.length > AMENITIES_PREVIEW && (
            <button
              type="button"
              onClick={() =>
                setShowAllHotelAmenities((current) => !current)
              }
              className={moreChipClass(variant)}
            >
              {showAllHotelAmenities
                ? "Show less"
                : `+${amenityGroups.hotel.length - AMENITIES_PREVIEW} more`}
            </button>
          )}
        </div>
      </section>
    )}

    {/* Room Amenities */}
    {amenityGroups.room.length > 0 && (
      <section>
        <div className="mb-2.5">
          <p className={sectionLabelClass(variant)}>
            Room Amenities
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {visibleRoomAmenities.map((amenity) => {
            const selected =
              selectedAmenities.includes(amenity.id);

            return (
              <button
                key={amenity.id}
                type="button"
                onClick={() =>
                  togglePill(
                    selectedAmenities,
                    amenity.id,
                    setSelectedAmenities
                  )
                }
                className={chipClass(selected, variant)}
              >
                {amenity.name}
              </button>
            );
          })}

          {amenityGroups.room.length > AMENITIES_PREVIEW && (
            <button
              type="button"
              onClick={() =>
                setShowAllRoomAmenities((current) => !current)
              }
              className={moreChipClass(variant)}
            >
              {showAllRoomAmenities
                ? "Show less"
                : `+${amenityGroups.room.length - AMENITIES_PREVIEW} more`}
            </button>
          )}
        </div>
      </section>
    )}
  </div>
);

  /*
   * ================================================================
   * FILTERS TRIGGER BUTTON (shared look, different behavior per breakpoint)
   * ================================================================
   */

  const filtersTriggerButton = (active: boolean, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
        active || activeCount > 0
          ? "border-primary/60 bg-primary/15 text-white"
          : "border-white/20 bg-white/5 text-white hover:bg-white/10"
      )}
      aria-expanded={active}
      aria-controls="hero-search-filters-panel"
    >
      <SlidersHorizontal className="size-4" />
      <span className="hidden sm:inline">Filters</span>

      {activeCount > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
          {activeCount}
        </span>
      )}
    </button>
  );

  /*
   * ================================================================
   * FILTERS — MOBILE POPOVER
   * ================================================================
   */

  const filtersPopover = (
    <Popover
      open={isFilterOpen && activeFilterPanel === "mobile"}
      onOpenChange={(open) => {
        setIsFilterOpen(open);
        setActiveFilterPanel(open ? "mobile" : null);
      }}
    >
      <PopoverTrigger asChild>
        {filtersTriggerButton(
          isFilterOpen && activeFilterPanel === "mobile",
          () => setActiveFilterPanel("mobile")
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className={cn(
          "z-[500] w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden p-0",
          popoverCardClass
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-foreground">
              Filters
            </div>

            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {activeCount > 0
                ? `${activeCount} active`
                : "Refine your stay"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetFilters}
              className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Reset all
            </button>

            <button
              type="button"
              onClick={() => {
                setIsFilterOpen(false);
                setActiveFilterPanel(null);
              }}
              className="flex size-7 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-accent"
              aria-label="Close filters"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="max-h-[55vh] overflow-y-auto px-4 py-4 custom-scrollbar"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          {renderFilterContent("light")}
        </div>

      </PopoverContent>
    </Popover>
  );

  /*
   * ================================================================
   * DESKTOP GLASS BAR — filters expand as a side panel
   * ================================================================
   */

  const isDesktopFilterOpen = isFilterOpen && activeFilterPanel === "desktop";

  const desktopBar = (
    <div
      className={cn(
        "hidden h-[190px] overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-2xl shadow-black/20 backdrop-blur-2xl transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] xl:flex",
        isDesktopFilterOpen
          ? "w-[1000px] max-w-[calc(100vw-48px)]"
          : "w-[620px] max-w-[calc(100vw-48px)]"
      )}
    >
      {/* Left — search */}
      <div className="flex w-[620px] shrink-0 flex-col gap-1 p-2">
        {/* Row 1: Location */}
        {locationField}

        <div className={dividerClass} />

        {/* Row 2: Dates + Guests */}
        <div className="flex items-center">
          {dateField("desktop")}
          <div className={vDividerClass} />
          {guestField("desktop")}
        </div>

        <div className={dividerClass} />

        {/* Row 3: Filters + Search */}
        <div className="flex items-center gap-2 px-1 py-1">
          {showFilters &&
            filtersTriggerButton(isDesktopFilterOpen, () => {
              setIsFilterOpen((current) =>
                activeFilterPanel === "desktop" ? !current : true
              );
              setActiveFilterPanel("desktop");
            })}
          <div className="flex-1">{searchButton}</div>
        </div>
      </div>

      {/* Right — filters side panel */}
      {showFilters && (
        <div
          id="hero-search-filters-panel"
          className={cn(
            "h-full shrink-0 overflow-hidden border-l border-white/15 text-white transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isDesktopFilterOpen ? "w-[380px] opacity-100" : "w-0 opacity-0"
          )}
        >
          <div className="flex h-full w-[380px] min-w-0 flex-col">
            {/* Header */}
            <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-white/15 px-5">
              <div>
                <div className="text-[13px] font-semibold tracking-[-0.01em] text-white">
                  Filters
                </div>

                <div className="mt-0.5 text-[11px] text-white/50">
                  {activeCount > 0
                    ? `${activeCount} active`
                    : "Refine your stay"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[12px] font-medium text-white/50 transition-colors hover:text-white"
                >
                  Reset all
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsFilterOpen(false);
                    setActiveFilterPanel(null);
                  }}
                  className="flex size-7 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
                  aria-label="Close filters"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4 custom-scrollbar"
              data-lenis-prevent
              data-lenis-prevent-wheel
              data-lenis-prevent-touch
            >
              {renderFilterContent("dark")}
            </div>

          </div>
        </div>
      )}
    </div>
  );

  /*
   * ================================================================
   * MOBILE / TABLET GLASS CARD
   * ================================================================
   */

  const mobileBar = (
    <div className="hero-search-mobile flex w-full flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-2xl xl:hidden">
      <div className="animate-hero-search-enter flex flex-col gap-2">
        {locationField}

        <div className="grid grid-cols-2 gap-2">
          {dateField("mobile")}
          {guestField("mobile")}
        </div>

        <div className="flex items-center gap-2">
          {showFilters && filtersPopover}
          <div className="flex-1">{searchButton}</div>
        </div>
      </div>
    </div>
  );

  /*
   * ================================================================
   * FINAL
   * ================================================================
   */

  return (
    <div
      ref={panelRef}
      className={cn(
        "relative z-30 w-full",
        className
      )}
    >
      <div className="hidden w-full justify-center xl:flex">
        {desktopBar}
      </div>

      <div className="w-full xl:hidden">
        {mobileBar}
      </div>
    </div>
  );
};

export default SearchBar;
