"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Search,
  MapPin,
  Calendar as CalendarIcon,
  Users,
  Minus,
  Plus,
  Hotel,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getBookingWindowEnd,
  getBookingWindowStart,
  getMaxCheckOutDate,
  validateBookingDateRange,
} from "@/lib/date-policy";

export interface SearchSuggestion {
  id: number;
  name: string;
  type: "hotel" | "city";
  city?: string;
  address?: string;
}

type ActiveOverlay = "location" | "guest" | null;

const SearchBar = ({ showFilters = true }: { showFilters?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchLocation, setSearchLocation] = useState("");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [activeOverlay, setActiveOverlay] = useState<ActiveOverlay>(null);

  const [suggestions, setSuggestions] = useState<{
    hotels: SearchSuggestion[];
    cities: SearchSuggestion[];
  }>({ hotels: [], cities: [] });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef<number>(0);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Derived values (read-only, never set directly)
  const isGuestOpen = activeOverlay === "guest";
  const isLocationSuggestionsOpen = activeOverlay === "location";

  // Pre-fill from URL params on mount
  useEffect(() => {
    if (!searchParams) return;
    const queryLocation = searchParams.get("location");
    const queryCheckIn = searchParams.get("check_in");
    const queryCheckOut = searchParams.get("check_out");
    const queryGuests = Number(searchParams.get("guests"));
    const queryRooms = Number(searchParams.get("rooms"));

    if (queryLocation) setSearchLocation(queryLocation);

    const from = queryCheckIn ? new Date(queryCheckIn) : undefined;
    const to = queryCheckOut ? new Date(queryCheckOut) : undefined;
    if (from && !isNaN(from.valueOf())) {
      setDate({ from, to: to && !isNaN(to.valueOf()) ? to : undefined });
    } else {
      setDate({ from: new Date(), to: addDays(new Date(), 3) });
    }

    setDateValidationError(
      queryCheckIn && queryCheckOut
        ? (() => {
            const validation = validateBookingDateRange(queryCheckIn, queryCheckOut);
            return validation.isValid ? null : validation.message;
          })()
        : null,
    );

    if (Number.isFinite(queryGuests) && queryGuests > 0) setGuests(queryGuests);
    if (Number.isFinite(queryRooms) && queryRooms > 0) setRooms(queryRooms);
  }, [searchParams]);

  // Outside click handler for both Location and Guest overlays
  useEffect(() => {
    if (activeOverlay === null) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if click is inside the SearchBar
      if (searchBarRef.current?.contains(target)) {
        return;
      }

      setActiveOverlay(null);
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [activeOverlay]);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveOverlay(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleLocationChange = async (value: string) => {
    setSearchLocation(value);
    
    // IMMEDIATELY set active overlay to location, closing guest
    setActiveOverlay("location");

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (value.length >= 1) {
      setIsLoadingSuggestions(true);
      const currentRequestId = ++requestIdRef.current;
      const currentAbortController = new AbortController();
      abortControllerRef.current = currentAbortController;

      try {
        const [citiesRes, hotelsRes] = await Promise.all([
          fetch(`/api/public/cities?q=${encodeURIComponent(value)}`, {
            signal: currentAbortController.signal,
          }),
          fetch(`/api/public/hotels?location=${encodeURIComponent(value)}&limit=5`, {
            signal: currentAbortController.signal,
          }),
        ]);

        // If request was aborted, don't update state
        if (currentAbortController.signal.aborted) {
          return;
        }

        const next: { hotels: SearchSuggestion[]; cities: SearchSuggestion[] } = {
          hotels: [],
          cities: [],
        };

        if (citiesRes.ok) {
          const d = await citiesRes.json();
          if (d.success && Array.isArray(d.data)) {
            next.cities = d.data.map((c: any) => ({ id: c.id, name: c.name, type: "city" }));
          }
        }
        if (hotelsRes.ok) {
          const d = await hotelsRes.json();
          if (d.success && Array.isArray(d.data)) {
            next.hotels = d.data
              .slice(0, 5)
              .map((h: any) => ({ id: h.id, name: h.name, type: "hotel", city: h.city, address: h.address }));
          }
        }

        // Only update state if:
        // 1. Request is still active (not aborted)
        // 2. This is still the latest request (requestId matches)
        // 3. activeOverlay is still "location" (user hasn't switched to guest)
        if (!currentAbortController.signal.aborted && currentRequestId === requestIdRef.current) {
          setSuggestions(next);
          // Open suggestions only if we have results AND overlay is still location
          if ((next.hotels.length > 0 || next.cities.length > 0) && activeOverlay === "location") {
            setActiveOverlay("location");
          } else if (next.hotels.length === 0 && next.cities.length === 0) {
            setActiveOverlay(null);
          }
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name !== "AbortError") {
          setSuggestions({ hotels: [], cities: [] });
          if (currentRequestId === requestIdRef.current) {
            setActiveOverlay(null);
          }
        }
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      setSuggestions({ hotels: [], cities: [] });
      setActiveOverlay(null);
    }
  };

  const handleSuggestionSelect = (s: SearchSuggestion) => {
    setSearchLocation(s.type === "hotel" ? `${s.name}, ${s.city}` : s.name);
    setSuggestions({ hotels: [], cities: [] });
    setActiveOverlay(null);
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    setDateValidationError(null);

    if (newDate?.from && newDate?.to) {
      const validation = validateBookingDateRange(newDate.from, newDate.to);
      if (!validation.isValid) setDateValidationError(validation.message);
    }
  };

  const handleSearch = () => {
    if (!date?.from || !date?.to) {
      setDateValidationError("Please select check-in and check-out dates.");
      return;
    }

    const validation = validateBookingDateRange(date.from, date.to);
    if (!validation.isValid) {
      setDateValidationError(validation.message);
      return;
    }

    // Preserve existing params (e.g. filter sidebar selections) so they don't reset
    const params = new URLSearchParams(searchParams.toString());
    if (searchLocation) params.set("location", searchLocation);
    else params.delete("location");
    if (date?.from) params.set("check_in", format(date.from, "yyyy-MM-dd"));
    else params.delete("check_in");
    if (date?.to) params.set("check_out", format(date.to, "yyyy-MM-dd"));
    else params.delete("check_out");
    params.set("guests", String(guests));
    params.set("rooms", String(rooms));
    // Reset to page 1 on new search
    params.delete("page");
    router.push(`/search?${params.toString()}`, { scroll: false });
  };

  const handleGuestTriggerClick = () => {
    if (activeOverlay === "guest") {
      setActiveOverlay(null);
      return;
    }

    // Abort active location request and clear suggestions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSuggestions({ hotels: [], cities: [] });
    requestIdRef.current += 1;

    setActiveOverlay("guest");
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div ref={searchBarRef} className="glass rounded-2xl p-3 sm:p-4 shadow-lg border border-border/50 hover:border-primary/40 transition-colors relative">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.8fr_1.2fr_auto] gap-3 sm:gap-4">

          {/* Location */}
          <div className="relative group overflow-visible">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1 group-focus-within:text-primary transition-colors">
              Location
            </label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                ref={locationInputRef}
                placeholder="Where are you going?"
                value={searchLocation}
                onChange={(e) => handleLocationChange(e.target.value)}
                onFocus={() => setActiveOverlay("location")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSuggestions({ hotels: [], cities: [] });
                    setActiveOverlay(null);
                    handleSearch();
                  }
                }}
                className="pl-12 h-12 rounded-xl border-border/40 hover:border-primary/40 focus:border-primary transition-all bg-secondary/30"
              />
              {isLoadingSuggestions && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Location suggestions — absolute positioned div (not Radix Popover) */}
            {activeOverlay === "location" && (suggestions.hotels.length > 0 || suggestions.cities.length > 0) && (
              <div className="absolute left-0 right-0 top-[calc(100%+6px)] bg-popover border border-border/40 rounded-lg shadow-2xl max-h-72 overflow-y-auto custom-scrollbar z-50"
                data-lenis-prevent="true"
                data-lenis-prevent-wheel="true"
                data-lenis-prevent-touch="true"
              >
                {suggestions.hotels.length > 0 && (
                  <div className={cn(suggestions.cities.length > 0 ? "border-b border-border/40" : "", "p-2")}>
                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Hotels</div>
                    {suggestions.hotels.map((h) => (
                      <button
                        key={`hotel-${h.id}`}
                        onClick={() => handleSuggestionSelect(h)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors"
                      >
                        <Hotel className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{h.name}</div>
                            {h.address && <div className="text-xs text-muted-foreground truncate">{h.address}</div>}
                            <div className="text-xs text-muted-foreground/70 truncate">{h.city}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {suggestions.cities.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Locations</div>
                    {suggestions.cities.map((city) => (
                      <button
                        key={`city-${city.id}`}
                        onClick={() => handleSuggestionSelect(city)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors"
                      >
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{city.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stay Dates — DateRange (same as hero-search) */}
          <div className="relative group">
            <label className="text-xs font-semibold text-primary/70 mb-1.5 block pl-1 transition-colors group-hover:text-primary">
              Stay Dates
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start rounded-xl font-normal border-border/40 bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-5 w-5 text-primary/60 group-hover:text-primary transition-colors" />
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Check-in</span>
                      <span className="text-sm font-semibold">
                        {date?.from ? format(date.from, "MMM dd, yyyy") : "Add date"}
                      </span>
                    </div>
                    <div className="h-6 w-px bg-border/60 mx-1" />
                    <div className="flex flex-col items-start leading-none">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Check-out</span>
                      <span className="text-sm font-semibold">
                        {date?.to ? format(date.to, "MMM dd, yyyy") : "Add date"}
                      </span>
                    </div>
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-(--radix-popover-trigger-width) p-0 rounded-2xl shadow-2xl border-primary/20 bg-popover backdrop-blur-md overflow-hidden"
                align="center"
                sideOffset={8}
              >
                <div className="p-4 border-b border-border/40 bg-primary/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">Select Dates</span>
                    <span className="text-sm text-muted-foreground italic">Minimum 1 night stay</span>
                  </div>
                  {date?.from && date?.to && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 hover:text-primary"
                      onClick={() => {
                        setDate({ from: undefined, to: undefined });
                        setDateValidationError(null);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                {dateValidationError && (
                  <div className="flex items-start gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500 mt-0.5" />
                    <div className="text-xs text-amber-700 dark:text-amber-200">{dateValidationError}</div>
                  </div>
                )}
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={handleDateChange}
                  numberOfMonths={1}
                  disabled={(d) => {
                    const windowStart = getBookingWindowStart();
                    const windowEnd = getBookingWindowEnd();
                    if (d < windowStart || d >= windowEnd) return true;

                    if (date?.from && !date?.to) {
                      const maxCheckOut = getMaxCheckOutDate(date.from);
                      return d <= date.from || d > maxCheckOut;
                    }

                    return false;
                  }}
                  fromDate={getBookingWindowStart()}
                  toDate={getBookingWindowEnd()}
                  className="p-3 w-full"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Guests & Rooms */}
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
              Guests &amp; Rooms
            </label>
            <button
              type="button"
              data-guest-trigger
              onClick={handleGuestTriggerClick}
              className="flex items-center justify-between w-full h-12 rounded-xl border border-border/50 bg-secondary/30 px-4 text-sm hover:border-primary/40 transition-all"
            >
              <Users className="h-5 w-5 text-muted-foreground mr-2 shrink-0" />
              <span className="truncate text-left flex-1">
                {guests} {guests === 1 ? "Guest" : "Guests"} · {rooms}{" "}
                {rooms === 1 ? "Room" : "Rooms"}
              </span>
            </button>

            {/* Guest dropdown — absolute positioned div (not Radix Popover) */}
            {isGuestOpen && (
              <div
                data-guest-popover
                className="absolute left-0 top-[calc(100%+8px)] w-64 bg-popover border border-border/40 rounded-xl shadow-2xl p-4 space-y-4 z-50"
              >
                {/* Guests */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Guests</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      disabled={guests <= 1}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{guests}</span>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(30, guests + 1))}
                      disabled={guests >= 30}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Rooms */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rooms</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRooms(Math.max(1, rooms - 1))}
                      disabled={rooms <= 1}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">{rooms}</span>
                    <button
                      type="button"
                      onClick={() => setRooms(Math.min(10, rooms + 1))}
                      disabled={rooms >= 10}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Search button */}
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              className="w-full h-12 rounded-xl gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Search className="h-5 w-5" />
              <span className="font-semibold">Search</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
