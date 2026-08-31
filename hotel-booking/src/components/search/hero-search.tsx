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
    from: new Date(),
    to: addDays(new Date(), 4),
  });

  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);

  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<{
    hotels: SearchSuggestion[];
    cities: SearchSuggestion[];
  }>({
    hotels: [],
    cities: [],
  });

  const [isLoadingSuggestions, setIsLoadingSuggestions] =
    useState(false);

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
        setIsGuestOpen(false);

        setSuggestions({
          hotels: [],
          cities: [],
        });
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterOpen(false);
        setIsGuestOpen(false);

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

      if (!value.trim()) {
        setSuggestions({
          hotels: [],
          cities: [],
        });

        setIsLoadingSuggestions(false);

        return;
      }

      setIsLoadingSuggestions(true);

      try {
        const encoded = encodeURIComponent(value.trim());

        const [citiesResponse, hotelsResponse] =
          await Promise.all([
            fetch(`/api/public/cities?q=${encoded}`),
            fetch(`/api/public/hotels?location=${encoded}`),
          ]);

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

        setSuggestions(next);
      } catch {
        setSuggestions({
          hotels: [],
          cities: [],
        });
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
  };

  /*
   * ================================================================
   * SEARCH
   * ================================================================
   */

  const handleSearch = () => {
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
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const max = new Date(today);

    max.setFullYear(max.getFullYear() + 1);

    return day < today || day > max;
  };

  /*
   * ================================================================
   * SHARED STYLES
   * ================================================================
   */

  const cellClass =
    "relative min-w-0 overflow-visible rounded-[18px] border border-foreground/[0.10] bg-background/10 backdrop-blur-md dark:text-white transition-all duration-200 hover:border-foreground/[0.16] hover:bg-background/40";

  const labelClass =
    "pointer-events-none absolute left-4 top-2.5 z-10 text-[10px] font-medium tracking-[-0.01em] text-foreground/55 dark:text-white/55";

  /*
   * ================================================================
   * LOCATION FIELD
   * ================================================================
   */

  const locationField = (
    <div
      className={cn(
        cellClass,
        "relative z-20 h-full overflow-visible !rounded-[20px]"
      )}
    >
      <label className={labelClass}>Location</label>

      <MapPin className="pointer-events-none absolute left-4 top-[58%] h-[18px] w-[18px] -translate-y-1/2 text-foreground/65 dark:text-white/65" />

      <Input
        value={searchLocation}
        onChange={(event) =>
          void handleLocationChange(event.target.value)
        }
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            setSuggestions({
              hotels: [],
              cities: [],
            });

            handleSearch();
          }
        }}
        placeholder="Where are you going?"
        className="h-full rounded-[18px] border-0 bg-transparent pl-11 pr-11 pt-6 pb-2 text-base font-medium !text-foreground shadow-none placeholder:!text-foreground/50 dark:!text-white dark:placeholder:!text-white/50 focus-visible:ring-0"
        aria-label="Location"
      />

      {isLoadingSuggestions && (
        <Loader2 className="absolute right-4 top-[58%] h-4 w-4 -translate-y-1/2 animate-spin text-foreground/60 dark:text-white/60" />
      )}

      {(suggestions.hotels.length > 0 ||
        suggestions.cities.length > 0) && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[500] overflow-hidden rounded-2xl border border-foreground/10 bg-background/95 text-foreground shadow-2xl backdrop-blur-2xl">
          <div className="max-h-80 overflow-y-auto">
            {suggestions.hotels.length > 0 && (
              <div
                className={cn(
                  "p-2",
                  suggestions.cities.length > 0 &&
                    "border-b border-foreground/10"
                )}
              >
                <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/40">
                  Hotels
                </div>

                {suggestions.hotels.map((hotel) => (
                  <button
                    key={`hotel-${hotel.id}`}
                    type="button"
                    onClick={() =>
                      handleSuggestionSelect(hotel)
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.06]"
                  >
                    <Hotel className="h-4 w-4 shrink-0 text-primary" />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {hotel.name}
                      </div>

                      {hotel.address && (
                        <div className="truncate text-xs text-foreground/45">
                          {hotel.address}
                        </div>
                      )}

                      {hotel.city && (
                        <div className="truncate text-[11px] text-foreground/35">
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
                <div className="mb-2 px-2 text-[9px] font-bold uppercase tracking-[0.2em] text-foreground/40">
                  Locations
                </div>

                {suggestions.cities.map((city) => (
                  <button
                    key={`city-${city.id}`}
                    type="button"
                    onClick={() =>
                      handleSuggestionSelect(city)
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-foreground/[0.06]"
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
      )}
    </div>
  );

  /*
   * ================================================================
   * DATE FIELD
   * ================================================================
   */

  const dateField = (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            cellClass,
            "flex h-full w-full items-center px-4 pt-5 text-foreground dark:text-white"
          )}
        >
          <span className={labelClass}>Stay Dates</span>

          <CalendarIcon className="mr-3 h-[18px] w-[18px] shrink-0 text-foreground/65 dark:text-white/65" />

          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2.5">
            <div className="min-w-0">
              <div className="text-[10px] font-medium text-foreground/50 dark:text-white/50">
                Check in
              </div>

              <div className="mt-1 truncate text-sm font-semibold leading-5 tracking-[-0.01em] text-foreground dark:text-white">
                {date?.from
                  ? format(date.from, "MMM d, yyyy")
                  : "Select date"}
              </div>
            </div>

            <div className="min-w-0 border-l border-foreground/10 pl-2.5">
              <div className="text-[10px] font-medium text-foreground/50 dark:text-white/50">
                Check out
              </div>

              <div className="mt-1 truncate text-sm font-semibold leading-5 tracking-[-0.01em] text-foreground dark:text-white">
                {date?.to
                  ? format(date.to, "MMM d, yyyy")
                  : "Select date"}
              </div>
            </div>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={10}
        className={cn(
          "z-[500]",
          "w-[360px]",
          "max-w-[calc(100vw-2rem)]",
          "overflow-hidden",
          "rounded-2xl",
          "border border-foreground/10",
          "bg-background/95",
          "p-0",
          "text-foreground",
          "shadow-2xl",
          "backdrop-blur-2xl"
        )}
      >
        {/* Calendar Header */}
        <div className="flex items-center justify-between border-b border-foreground/10 bg-foreground/[0.03] px-4 py-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Select Dates
            </div>

            <div className="mt-0.5 text-xs text-foreground/45">
              Minimum 1 night stay
            </div>
          </div>

          {date?.from && date?.to && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-foreground/55 hover:bg-foreground/5 hover:text-foreground"
              onClick={() =>
                setDate({
                  from: undefined,
                  to: undefined,
                })
              }
            >
              Clear
            </Button>
          )}
        </div>

        {/* Calendar */}
        <div className="flex w-full justify-center pt-0 p-3">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
            disabled={isDateDisabled}
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

  const guestField = (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => setIsGuestOpen((current) => !current)}
        className={cn(
          cellClass,
          "flex h-full w-full items-center justify-between px-4 pt-5 !text-foreground dark:!text-white"
        )}
      >
        <span className={labelClass}>
          Guests & Rooms
        </span>

        <div className="flex min-w-0 items-center gap-2.5">
          <Users className="h-[18px] w-[18px] shrink-0 text-foreground/65 dark:text-white/65" />

          <span className="whitespace-nowrap text-sm font-semibold leading-5 text-foreground dark:text-white">
            {guests} Guest
            {guests > 1 ? "s" : ""} · {rooms} Room
            {rooms > 1 ? "s" : ""}
          </span>
        </div>

        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-foreground/50 dark:text-white/50 transition-transform duration-200",
            isGuestOpen && "rotate-180"
          )}
        />
      </button>

      {isGuestOpen && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[500] w-[300px] rounded-2xl border border-foreground/10 bg-background/95 p-4 text-foreground shadow-2xl backdrop-blur-2xl">
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
                <span className="text-sm font-medium">
                  {item.label}
                </span>

                <div className="mt-0.5 text-[10px] text-foreground/40">
                  {item.label === "Guests"
                    ? "People staying"
                    : "Rooms required"}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    item.setter(
                      Math.max(1, item.value - 1)
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 transition-colors hover:bg-foreground/10"
                  aria-label={`Decrease ${item.label}`}
                >
                  <Minus className="h-4 w-4" />
                </button>

                <span className="min-w-5 text-center text-sm font-semibold tabular-nums">
                  {item.value}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    item.setter(
                      Math.min(
                        item.max,
                        item.value + 1
                      )
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 bg-foreground/5 transition-colors hover:bg-foreground/10"
                  aria-label={`Increase ${item.label}`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
      className={cn(
        "h-[46px] w-full rounded-[12px]",
        "bg-primary text-primary-foreground",
        "shadow-[0_8px_22px_-14px_rgba(59,130,246,0.85)]",
        "transition-all duration-300",
        "hover:bg-primary/90",
        "hover:shadow-[0_12px_26px_-14px_rgba(59,130,246,0.95)]",
        "focus-visible:ring-2 focus-visible:ring-primary"
      )}
    >
      <Search className="mr-1.5 h-3.5 w-3.5" />

      <span className="text-[13px] font-semibold tracking-[-0.01em]">
        Search
      </span>
    </Button>
  );

  /*
   * ================================================================
   * FILTER CONTENT
   * ================================================================
   */

  const filterContent = (
  <div className="space-y-5 text-white">
    {/* Property Type */}
    {hotelTypeOptions.length > 0 && (
      <section>
        <div className="mb-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
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
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                  selected
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white"
                )}
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
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
                selected
                  ? "border-amber-400/60 bg-amber-500/15 text-amber-300"
                  : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white"
              )}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  selected
                    ? "fill-amber-300 text-amber-300"
                    : "text-white/40"
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
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
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                  selected
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white"
                )}
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
              className="rounded-full border border-dashed border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/45 transition-colors hover:border-white/25 hover:text-white"
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
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
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-all",
                  selected
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-white/10 bg-white/5 text-white/65 hover:border-white/20 hover:bg-white/10 hover:text-white"
                )}
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
              className="rounded-full border border-dashed border-white/15 px-3 py-1.5 text-[12px] font-medium text-white/45 transition-colors hover:border-white/25 hover:text-white"
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
   * DESKTOP BENTO
   * ================================================================
   */

  const desktopBento = (
    <div
      className={cn(
        "hidden lg:flex",
        "h-[260px]",
        "overflow-visible",
        "rounded-[28px]",
        "border border-foreground/[0.13]",
        "backdrop-blur-sm",
        "!text-foreground dark:!text-white",
        "shadow-[0_28px_80px_-35px_rgba(0,0,0,0.65)]",
        "backdrop-blur-2xl",
        "transition-[width,box-shadow]",
        "duration-500",
        "ease-[cubic-bezier(0.22,1,0.36,1)]",

        isFilterOpen
          ? "w-[1160px] max-w-[calc(100vw-48px)]"
          : "w-[760px] max-w-[calc(100vw-48px)]"
      )}
    >
      {/* ============================================================
          LEFT — SEARCH
          ============================================================ */}

      <div
        className={cn(
          "h-full shrink-0 p-3",
          "w-[760px]",
          isFilterOpen ? "max-w-[760px]" : "max-w-[760px]"
        )}
      >
        <div className="grid h-full grid-cols-1 gap-2.5">
          {/* Location */}
          <div className="min-w-0">
            {locationField}
          </div>

          {/* Date + Guests */}
          <div className="grid min-w-0 grid-cols-2 gap-2.5">
            {/* Date */}
            <div className="min-w-0">
              {dateField}
            </div>

            {/* Guests */}
            <div className="min-w-0">
              {guestField}
            </div>
          </div>

          {/* Search + Filters */}
          <div className="flex min-w-0 items-stretch gap-2.5">
            {/* Search */}
            <div className="min-w-0 flex-1">
              {searchButton}
            </div>

            {/* Filters */}
            {showFilters && (
              <button
                type="button"
                onClick={() =>
                  setIsFilterOpen((current) => !current)
                }
                className={cn(
                  "inline-flex h-[46px] w-[120px] shrink-0",
                  "items-center justify-center gap-1.5",
                  "rounded-[12px] border px-3",
                  "text-[13px] font-medium",
                  "transition-all duration-200",

                  isFilterOpen || activeCount > 0
                    ? "border-primary/40 bg-primary/8 text-primary shadow-[0_6px_18px_-14px_rgba(59,130,246,0.7)]"
                    : "border-foreground/[0.10] bg-background/30 text-foreground dark:text-white backdrop-blur-md hover:border-foreground/[0.16] hover:bg-background/40 hover:text-foreground dark:hover:text-white"
                )}
                aria-expanded={isFilterOpen}
                aria-controls="hero-search-filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />

                <span>
                  {isFilterOpen ? "Hide" : "Filters"}
                </span>

                {activeCount > 0 && (
                  <span
                    className={cn(
                      "flex h-4 min-w-4 items-center justify-center",
                      "rounded-full bg-primary px-1",
                      "text-[9px] font-bold text-primary-foreground",

                      isFilterOpen &&
                        "bg-background text-primary"
                    )}
                  >
                    {activeCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================
          RIGHT — FILTERS
          ============================================================ */}

      {showFilters && (
        <div
          id="hero-search-filters"
          className={cn(
            "h-full shrink-0 overflow-hidden",
            "border-l border-foreground/10",
            "bg-foreground/[0.02]",
            "transition-[width,opacity]",
            "duration-500",
            "ease-[cubic-bezier(0.22,1,0.36,1)]",
            isFilterOpen
              ? "w-[400px] opacity-100"
              : "w-0 opacity-0"
          )}
        >
          <div className="flex h-full w-[400px] min-w-0 flex-col">
            {/* Header */}
            <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-foreground/[0.08] px-5">
              <div>
                <div className="text-[13px] font-semibold tracking-[-0.01em] text-White">
                  Filters
                </div>

                <div className="mt-0.5 text-[11px] text-white/45">
                  {activeCount > 0
                    ? `${activeCount} active`
                    : "Refine your stay"}
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setIsFilterOpen(false)
                }
                className="flex h-7 w-7 items-center justify-center rounded-full border border-foreground/10 text-white transition-colors hover:bg-foreground/8 hover:text-foreground"
                aria-label="Close filters"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Filter Content */}
            <div
              className="min-h-0 flex-1 overflow-y-auto px-5 py-4 custom-scrollbar"
              data-lenis-prevent
              data-lenis-prevent-wheel
              data-lenis-prevent-touch
            >
              {filterContent}
            </div>

            {/* Footer */}
            <div className="flex h-[54px] shrink-0 items-center justify-between gap-3 border-t border-foreground/[0.08] px-5">
              <button
                type="button"
                onClick={resetFilters}
                className="text-[12px] font-medium text-white/45 transition-colors hover:text-foreground"
              >
                Reset all
              </button>

              <Button
                type="button"
                onClick={() => {
                  setIsFilterOpen(false);
                  handleSearch();
                }}
                className="h-8 rounded-[10px] bg-primary px-4 text-[12px] font-semibold text-primary-foreground shadow-[0_4px_14px_-8px_rgba(59,130,246,0.8)] hover:bg-primary/90"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /*
   * ================================================================
   * TABLET / MOBILE
   * ================================================================
   */

  const mobileBento = (
    <div
      className={cn(
        "w-full lg:hidden",
        "rounded-[24px]",
        "border border-foreground/[0.13]",
        "bg-background/70",
        "p-3",
        "!text-foreground dark:!text-white",
        "shadow-[0_24px_60px_-30px_rgba(0,0,0,0.65)]",
        "backdrop-blur-2xl"
      )}
    >
      <div className="grid grid-cols-1 gap-2.5">
        {/* Location */}
        <div className="h-[72px]">
          {locationField}
        </div>

        {/* Dates + Guests */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="h-[72px]">
            {dateField}
          </div>

          <div className="h-[72px]">
            {guestField}
          </div>
        </div>

        {/* Search + Filters */}
        <div
          className={cn(
            "grid gap-2.5",
            showFilters
              ? "grid-cols-1 sm:grid-cols-[1fr_170px]"
              : "grid-cols-1"
          )}
        >
          <div className="h-[64px]">
            {searchButton}
          </div>

          {showFilters && (
            <button
              type="button"
              onClick={() =>
                setIsFilterOpen((current) => !current)
              }
              className={cn(
                "flex h-[64px] items-center justify-center gap-2",
                "rounded-[18px] border px-4",
                "text-sm font-semibold",
                "transition-all",

                isFilterOpen || activeCount > 0
                  ? "border-primary/50 bg-primary text-primary-foreground"
                  : "border-foreground/10 bg-foreground/[0.055] text-foreground/70 hover:border-foreground/20 hover:bg-foreground/[0.09] hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="h-4 w-4" />

              <span>Filters</span>

              {activeCount > 0 && (
                <span
                  className={cn(
                    "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                    isFilterOpen
                      ? "bg-background text-primary"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  {activeCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Mobile Filter Workspace */}
        {showFilters && isFilterOpen && (
          <div className="overflow-hidden rounded-[16px] border border-foreground/10 bg-foreground/[0.025]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
              <div>
                <div className="text-sm font-semibold">
                  Filters
                </div>

                <div className="mt-0.5 text-[10px] text-foreground/40">
                  {activeCount > 0
                    ? `${activeCount} active`
                    : "Refine your stay"}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsFilterOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/10 text-foreground/45 hover:bg-foreground/10 hover:text-foreground"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-[55vh] overflow-y-auto px-4 py-4 custom-scrollbar">
              {filterContent}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-foreground/10 px-4 py-3">
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-medium text-foreground/45 hover:text-foreground"
              >
                Reset all
              </button>

              <Button
                type="button"
                onClick={() => {
                  setIsFilterOpen(false);
                  handleSearch();
                }}
                className="h-9 rounded-full bg-primary px-4 text-xs font-semibold"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}
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
      <div className="hidden w-full justify-center lg:flex">
        {desktopBento}
      </div>

      {mobileBento}
    </div>
  );
};

export default SearchBar;
