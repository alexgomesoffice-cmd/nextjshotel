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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchSuggestion {
  id: number;
  name: string;
  type: "hotel" | "city";
  city?: string;
}

const SearchBar = ({ showFilters = true }: { showFilters?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchLocation, setSearchLocation] = useState("");
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [isGuestOpen, setIsGuestOpen] = useState(false);

  const [suggestions, setSuggestions] = useState<{
    hotels: SearchSuggestion[];
    cities: SearchSuggestion[];
  }>({ hotels: [], cities: [] });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);

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

    if (Number.isFinite(queryGuests) && queryGuests > 0) setGuests(queryGuests);
    if (Number.isFinite(queryRooms) && queryRooms > 0) setRooms(queryRooms);
  }, [searchParams]);

  const handleLocationChange = async (value: string) => {
    setSearchLocation(value);
    if (value.length >= 1) {
      setIsLoadingSuggestions(true);
      try {
        const [citiesRes, hotelsRes] = await Promise.all([
          fetch(`/api/public/cities?q=${encodeURIComponent(value)}`),
          fetch(`/api/public/hotels?location=${encodeURIComponent(value)}&limit=5`),
        ]);

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
              .map((h: any) => ({ id: h.id, name: h.name, type: "hotel", city: h.city }));
          }
        }
        setSuggestions(next);
      } catch {
        setSuggestions({ hotels: [], cities: [] });
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      setSuggestions({ hotels: [], cities: [] });
    }
  };

  const handleSuggestionSelect = (s: SearchSuggestion) => {
    setSearchLocation(s.type === "hotel" ? `${s.name}, ${s.city}` : s.name);
    setSuggestions({ hotels: [], cities: [] });
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchLocation) params.set("location", searchLocation);
    if (date?.from) params.set("check_in", format(date.from, "yyyy-MM-dd"));
    if (date?.to) params.set("check_out", format(date.to, "yyyy-MM-dd"));
    params.set("guests", String(guests));
    params.set("rooms", String(rooms));
    router.push(`/search?${params.toString()}`);
  };

  const hasSuggestions =
    suggestions.hotels.length > 0 || suggestions.cities.length > 0;

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="glass rounded-2xl p-3 sm:p-4 shadow-lg border border-border/50 hover:border-primary/40 transition-colors relative">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.8fr_1.2fr_auto] gap-3 sm:gap-4">

          {/* Location */}
          <div className="relative group overflow-visible">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1 group-focus-within:text-primary transition-colors">
              Location
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    ref={locationInputRef}
                    placeholder="Where are you going?"
                    value={searchLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setSuggestions({ hotels: [], cities: [] });
                        handleSearch();
                      }
                    }}
                    className="pl-12 h-12 rounded-xl border-border/40 hover:border-primary/40 focus:border-primary transition-all bg-secondary/30"
                  />
                  {isLoadingSuggestions && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </PopoverTrigger>

              {hasSuggestions && (
                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  className="w-(--radix-popover-trigger-width) p-0 overflow-hidden"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="bg-popover border border-border/40 rounded-lg shadow-2xl max-h-72 overflow-y-auto">
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
                    {suggestions.hotels.length > 0 && (
                      <div className={cn("p-2", suggestions.cities.length > 0 && "border-t border-border/40")}>
                        <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Hotels</div>
                        {suggestions.hotels.map((hotel) => (
                          <button
                            key={`hotel-${hotel.id}`}
                            onClick={() => handleSuggestionSelect(hotel)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors"
                          >
                            <Hotel className="h-4 w-4 text-primary shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{hotel.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{hotel.city}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </PopoverContent>
              )}
            </Popover>
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
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
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
            <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full h-12 rounded-xl border border-border/50 bg-secondary/30 px-4 text-sm hover:border-primary/40 transition-all"
                >
                  <Users className="h-5 w-5 text-muted-foreground mr-2 shrink-0" />
                  <span className="truncate text-left flex-1">
                    {guests} {guests === 1 ? "Guest" : "Guests"} · {rooms}{" "}
                    {rooms === 1 ? "Room" : "Rooms"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 rounded-xl p-4 space-y-4" align="start" sideOffset={8}>
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
                    <span className="w-6 text-center font-semibold">{guests}</span>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(10, guests + 1))}
                      disabled={guests >= 10}
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
              </PopoverContent>
            </Popover>
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
