"use client";

import { useState, useRef, useEffect } from "react";
import { format, addDays } from "date-fns";
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
    Loader2
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
    type: 'hotel' | 'city';
    city?: string;
}

interface SearchBarProps {
    showFilters?: boolean;
}

const SearchBar = ({
    showFilters = true,
}: SearchBarProps) => {
    const router = useRouter();
    const [searchLocation, setSearchLocation] = useState("");

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 4),
    });

    const [guests, setGuests] = useState(1);
    const [rooms, setRooms] = useState(1);

    const [isGuestOpen, setIsGuestOpen] = useState(false);
    
    // Suggestions state
    const [suggestions, setSuggestions] = useState<{ hotels: SearchSuggestion[]; cities: SearchSuggestion[] }>({ hotels: [], cities: [] });
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const locationInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

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
        const params = new URLSearchParams();
        if (searchLocation) params.set("location", searchLocation);
        if (date?.from) params.set("check_in", format(date.from, "yyyy-MM-dd"));
        if (date?.to) params.set("check_out", format(date.to, "yyyy-MM-dd"));
        params.set("guests", String(guests));
        params.set("rooms", String(rooms));
        router.push(`/search?${params.toString()}`);
    };

    return (
        <div className="w-full max-w-5xl mx-auto px-4">
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-2xl animate-fade-in-up">
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.8fr_1.2fr_0.8fr] gap-4">
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
                                        className="pl-12 h-12 rounded-xl border-border/40 hover:border-primary/40 focus:border-primary transition-all"
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
                                        className="bg-popover border border-border/40 rounded-lg shadow-2xl z-9999 max-h-80 overflow-y-auto"
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
                                            <div className={`${suggestions.cities.length > 0 ? 'border-t border-border/40' : ''} p-2`}>
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

                    {/* Stay Dates (Range Picker) */}
                    <div className="relative group">
                        <label className="text-xs font-semibold text-primary/70 mb-1.5 block pl-1 transition-colors group-hover:text-primary">
                            Stay Dates
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full h-12 justify-start rounded-xl font-normal border-border/40 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-all duration-500 shadow-sm",
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
                                className="w-(--radix-popover-trigger-width) p-0 rounded-2xl shadow-2xl border-primary/20 bg-popover text-popover-foreground backdrop-blur-md overflow-hidden animate-scale-in"
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
                                            className="text-xs h-7 hover:text-primary text-foreground"
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
                                    className="p-3 w-full"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Guests & Rooms */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
                            Guests & Rooms
                        </label>

                        <Popover
                            open={isGuestOpen}
                            onOpenChange={setIsGuestOpen}
                        >
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center justify-between w-full h-12 rounded-xl border border-input bg-background px-4 text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />

                                        <span>
                                            {guests} Guest{guests > 1 && "s"} ·{" "}
                                            {rooms} Room{rooms > 1 && "s"}
                                        </span>
                                    </div>
                                </button>
                            </PopoverTrigger>

                            <PopoverContent
                                className="w-64 rounded-xl p-4 space-y-4"
                                align="start"
                            >
                                {/* Guests */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        Guests
                                    </span>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setGuests(Math.max(1, guests - 1))
                                            }
                                            className="w-8 h-8 rounded-full border flex items-center justify-center"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>

                                        <span>{guests}</span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setGuests(Math.min(10, guests + 1))
                                            }
                                            className="w-8 h-8 rounded-full border flex items-center justify-center"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Rooms */}
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">
                                        Rooms
                                    </span>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRooms(Math.max(1, rooms - 1))
                                            }
                                            className="w-8 h-8 rounded-full border flex items-center justify-center"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>

                                        <span>{rooms}</span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRooms(Math.min(10, rooms + 1))
                                            }
                                            className="w-8 h-8 rounded-full border flex items-center justify-center"
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

                {/* Optional Filter Area */}
                {showFilters && (
                    <div className="mt-2 pt-2">
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm">
                                Hotel
                            </Button>

                            <Button variant="outline" size="sm">
                                Apartment
                            </Button>

                            <Button variant="outline" size="sm">
                                Villa
                            </Button>

                            <Button variant="outline" size="sm">
                                Suite
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchBar;