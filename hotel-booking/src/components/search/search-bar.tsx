"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, MapPin, Calendar as CalendarIcon, Users, Minus, Plus, Hotel, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

export interface EnumOption {
    label: string;
    value: string;
}

export interface SearchSuggestion {
    id: number;
    name: string;
    type: 'hotel' | 'city';
    city?: string;
}

const SearchBar = ({ showFilters = true }: { showFilters?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchLocation, setSearchLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);

  const [hotelTypeOptions, setHotelTypeOptions] = useState<EnumOption[]>([]);
  const [roomTypeOptions, setRoomTypeOptions] = useState<EnumOption[]>([]);
  const [bedTypeOptions, setBedTypeOptions] = useState<EnumOption[]>([]);

  const [selectedHotelTypes, setSelectedHotelTypes] = useState<string[]>([]);
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<string[]>([]);
  const [selectedBedTypes, setSelectedBedTypes] = useState<string[]>([]);

  const [suggestions, setSuggestions] = useState<{ hotels: SearchSuggestion[]; cities: SearchSuggestion[] }>({ hotels: [], cities: [] });
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchParams) return;
    const queryLocation = searchParams.get("location");
    const queryCheckIn = searchParams.get("check_in") || searchParams.get("checkIn");
    const queryCheckOut = searchParams.get("check_out") || searchParams.get("checkOut");
    const queryGuests = Number(searchParams.get("guests"));
    const queryRooms = Number(searchParams.get("rooms"));

    if (queryLocation) setSearchLocation(queryLocation);
    if (queryCheckIn) {
      const parsedIn = new Date(queryCheckIn);
      if (!Number.isNaN(parsedIn.valueOf())) setCheckIn(parsedIn);
    }
    if (queryCheckOut) {
      const parsedOut = new Date(queryCheckOut);
      if (!Number.isNaN(parsedOut.valueOf())) setCheckOut(parsedOut);
    }
    if (Number.isFinite(queryGuests) && queryGuests > 0) setGuests(queryGuests);
    if (Number.isFinite(queryRooms) && queryRooms > 0) setRooms(queryRooms);
  }, [searchParams]);

  useEffect(() => {
    // Fetch hotel types and hardcode others for now to avoid creating new endpoints
    const run = async () => {
      try {
        const htRes = await fetch('/api/public/hotel-types');
        if (htRes.ok) {
            const data = await htRes.json();
            if (data.success && Array.isArray(data.data)) {
                setHotelTypeOptions(data.data.map((ht: any) => ({ label: ht.name, value: ht.name })));
            }
        }
        
        // Hardcode room types and bed types for now since their endpoints are not in the public API design
        setRoomTypeOptions([
            { label: 'Standard', value: 'Standard' },
            { label: 'Deluxe', value: 'Deluxe' },
            { label: 'Suite', value: 'Suite' },
        ]);
        setBedTypeOptions([
            { label: 'Single', value: 'Single' },
            { label: 'Double', value: 'Double' },
            { label: 'Queen', value: 'Queen' },
            { label: 'King', value: 'King' },
        ]);
      } catch (e) {
        console.error("Failed to load filter options:", e);
      }
    };
    run();
  }, []);

  useEffect(() => {
    if (checkIn && checkOut) {
      if (checkOut <= checkIn) {
        setDateError("Check-out must be after the check-in date.");
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [checkIn, checkOut]);

  const handleLocationChange = async (value: string) => {
    setSearchLocation(value);
    if (value.length >= 1) {
        setIsLoadingSuggestions(true);
        try {
            const [citiesRes, hotelsRes] = await Promise.all([
                fetch(`/api/public/cities?q=${encodeURIComponent(value)}`),
                fetch(`/api/public/hotels?location=${encodeURIComponent(value)}`)
            ]);
            
            const newSuggestions: { hotels: SearchSuggestion[]; cities: SearchSuggestion[] } = {
                hotels: [], cities: []
            };

            if (citiesRes.ok) {
                const citiesData = await citiesRes.json();
                if (citiesData.success && Array.isArray(citiesData.data)) {
                    newSuggestions.cities = citiesData.data.map((c: any) => ({
                        id: c.id, name: c.name, type: 'city'
                    }));
                }
            }
            
            if (hotelsRes.ok) {
                const hotelsData = await hotelsRes.json();
                if (hotelsData.success && Array.isArray(hotelsData.data)) {
                    newSuggestions.hotels = hotelsData.data.map((h: any) => ({
                        id: h.id, name: h.name, type: 'hotel', city: h.city
                    }));
                }
            }
            setSuggestions(newSuggestions);
        } catch (error) {
            console.error("Failed to fetch suggestions:", error);
            setSuggestions({ hotels: [], cities: [] });
        } finally {
            setIsLoadingSuggestions(false);
        }
    } else {
        setSuggestions({ hotels: [], cities: [] });
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'hotel') {
      setSearchLocation(`${suggestion.name}, ${suggestion.city}`);
    } else {
      setSearchLocation(suggestion.name);
    }
    setSuggestions({ hotels: [], cities: [] });
  };

  const handleSearch = () => {
    if (checkIn && checkOut && checkOut <= checkIn) {
      setDateError("Check-out must be after the check-in date.");
      return;
    }

    const params = new URLSearchParams();
    if (searchLocation) params.set("location", searchLocation);
    if (checkIn) params.set("check_in", format(checkIn, "yyyy-MM-dd"));
    if (checkOut) params.set("check_out", format(checkOut, "yyyy-MM-dd"));
    params.set("guests", String(guests));
    params.set("rooms", String(rooms));
    if (selectedHotelTypes.length) params.set("hotel_types", selectedHotelTypes.join(","));
    if (selectedRoomTypes.length) params.set("room_types", selectedRoomTypes.join(","));
    if (selectedBedTypes.length) params.set("bed_types", selectedBedTypes.join(","));

    router.push(`/search?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in-up" style={{ animationDelay: "400ms" }}>
      <div className="glass rounded-2xl p-3 sm:p-4 shadow-2xl shadow-primary/10 transition-shadow duration-500 group/bar relative overflow-visible border border-border/50 hover:border-primary/40">
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1.2fr_1.2fr_1.3fr_auto] gap-3 sm:gap-4">
          {/* Location */}
          <div className="relative group overflow-visible">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1 group-focus-within:text-primary transition-colors">
              Location
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                  <Input
                    ref={locationInputRef}
                    placeholder="Where are you going?"
                    value={searchLocation}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSuggestions({ hotels: [], cities: [] });
                        handleSearch();
                      }
                    }}
                    className="pl-12 bg-secondary/30 border-border/50 hover:border-primary/40 focus:border-primary transition-all duration-300 hover:bg-secondary/40 h-12 rounded-xl"
                  />
                  {isLoadingSuggestions && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </PopoverTrigger>

              {(suggestions.hotels.length > 0 || suggestions.cities.length > 0) && (
                <PopoverContent
                  align="start"
                  side="bottom"
                  sideOffset={6}
                  className="w-(--radix-popover-trigger-width) p-0 overflow-hidden"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div
                    ref={suggestionsRef}
                    className="bg-popover border border-border rounded-lg shadow-lg z-9999 max-h-80 overflow-y-auto"
                  >
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
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{city.name}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {suggestions.hotels.length > 0 && (
                      <div className={`${suggestions.cities.length > 0 ? 'border-t border-border' : ''} p-2`}>
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

          {/* Check-in */}
          <div className="relative group">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
              Check-in
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex items-center w-full h-12 rounded-xl border border-border/50 bg-secondary/30 px-4 text-sm hover:border-primary/40 transition-all duration-300 hover:bg-secondary/40 gap-2 justify-start font-normal",
                    !checkIn && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="truncate">{checkIn ? format(checkIn, "MMM dd, yyyy") : "Add date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                <Calendar
                  mode="single"
                  selected={checkIn}
                  onSelect={setCheckIn}
                  disabled={(date) => (checkOut ? date >= checkOut : date < new Date())}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Check-out */}
          <div className="relative group">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
              Check-out
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex items-center w-full h-12 rounded-xl border border-border/50 bg-secondary/30 px-4 text-sm hover:border-primary/40 transition-all duration-300 hover:bg-secondary/40 gap-2 justify-start font-normal",
                    !checkOut && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                  <span className="truncate">{checkOut ? format(checkOut, "MMM dd, yyyy") : "Add date"}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                <Calendar
                  mode="single"
                  selected={checkOut}
                  onSelect={setCheckOut}
                  disabled={(date) => (checkIn ? date <= checkIn : date <= new Date())}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Guests & Rooms Dropdown */}
          <div className="relative">
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
              Guests & Rooms
            </label>
            <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center justify-between w-full h-12 rounded-xl border border-border/50 bg-secondary/30 px-4 text-sm hover:border-primary/40 transition-all duration-300 hover:bg-secondary/40"
                >
                  <Users className="h-5 w-5 text-muted-foreground mr-2 shrink-0" />
                  <span className="truncate text-left flex-1">
                    {guests} {guests === 1 ? "Guest" : "Guests"} · {rooms} {rooms === 1 ? "Room" : "Rooms"}
                  </span>
                </button>
              </PopoverTrigger>

              <PopoverContent
                className="w-64 rounded-xl border border-border bg-popover p-4 shadow-xl space-y-4 animate-fade-in-up"
                align="start"
                sideOffset={8}
              >
                {/* Guests row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Guests</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                      disabled={guests <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">{guests}</span>
                    <button
                      type="button"
                      onClick={() => setGuests(Math.min(6, guests + 1))}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                      disabled={guests >= 6}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {/* Rooms row */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Rooms</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setRooms(Math.max(1, rooms - 1))}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                      disabled={rooms <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">{rooms}</span>
                    <button
                      type="button"
                      onClick={() => setRooms(Math.min(8, rooms + 1))}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors disabled:opacity-40"
                      disabled={rooms >= 8}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <Button onClick={handleSearch} className="w-full h-12 rounded-xl gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <Search className="h-5 w-5 transition-transform group-hover/btn:scale-110 group-hover/btn:rotate-12" />
              <span className="font-semibold">Search</span>
            </Button>
          </div>
        </div>

        {dateError && (
          <div className="mt-3 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive font-medium text-center">
            {dateError}
          </div>
        )}

        {/* Constant filter form (no dropdown) */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-linear-to-r from-primary to-accent" />
                  <span className="text-xs font-semibold text-foreground">Hotel Type</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hotelTypeOptions.map((opt) => {
                    const checked = selectedHotelTypes.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          "inline-flex items-center gap-2 cursor-pointer select-none rounded-full border px-3 py-1 text-xs transition-colors",
                          checked
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const isChecked = !!v;
                            setSelectedHotelTypes((prev) =>
                              isChecked
                                ? [...new Set([...prev, opt.value])]
                                : prev.filter((x) => x !== opt.value)
                            );
                          }}
                          className="translate-y-[0.5px]"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-linear-to-r from-primary to-accent" />
                  <span className="text-xs font-semibold text-foreground">Room Type</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roomTypeOptions.map((opt) => {
                    const checked = selectedRoomTypes.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          "inline-flex items-center gap-2 cursor-pointer select-none rounded-full border px-3 py-1 text-xs transition-colors",
                          checked
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const isChecked = !!v;
                            setSelectedRoomTypes((prev) =>
                              isChecked
                                ? [...new Set([...prev, opt.value])]
                                : prev.filter((x) => x !== opt.value)
                            );
                          }}
                          className="translate-y-[0.5px]"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-linear-to-r from-primary to-accent" />
                  <span className="text-xs font-semibold text-foreground">Bed Type</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bedTypeOptions.map((opt) => {
                    const checked = selectedBedTypes.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          "inline-flex items-center gap-2 cursor-pointer select-none rounded-full border px-3 py-1 text-xs transition-colors",
                          checked
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-primary/40 hover:bg-secondary/50"
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const isChecked = !!v;
                            setSelectedBedTypes((prev) =>
                              isChecked
                                ? [...new Set([...prev, opt.value])]
                                : prev.filter((x) => x !== opt.value)
                            );
                          }}
                          className="translate-y-[0.5px]"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
