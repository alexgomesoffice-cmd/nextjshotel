"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { format, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import {
    Search, MapPin, Calendar as CalendarIcon, Users,
    Minus, Plus, Hotel, Loader2, SlidersHorizontal, X, Star, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface SearchSuggestion {
    id: number;
    name: string;
    type: 'hotel' | 'city';
    city?: string;
}

interface SearchBarProps { showFilters?: boolean; }

interface Amenity { id: number; name: string; context: string; }
interface AmenityGroups { hotel: Amenity[]; room: Amenity[]; }

const SearchBar = ({ showFilters = true }: SearchBarProps) => {
    const router = useRouter();
    const panelRef = useRef<HTMLDivElement>(null);

    // ── Main search state ──
    const [searchLocation, setSearchLocation] = useState("");
    const [date, setDate] = useState<DateRange | undefined>({ from: new Date(), to: addDays(new Date(), 4) });
    const [guests, setGuests] = useState(1);
    const [rooms, setRooms] = useState(1);
    const [isGuestOpen, setIsGuestOpen] = useState(false);

    // ── Suggestions ──
    const [suggestions, setSuggestions] = useState<{ hotels: SearchSuggestion[]; cities: SearchSuggestion[] }>({ hotels: [], cities: [] });
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const locationInputRef = useRef<HTMLInputElement>(null);

    // ── Filters ──
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [hotelTypeOptions, setHotelTypeOptions] = useState<{ id: number; name: string }[]>([]);
    const [amenityGroups, setAmenityGroups] = useState<AmenityGroups>({ hotel: [], room: [] });
    const allAmenityOptions = [...amenityGroups.hotel, ...amenityGroups.room];
    const [showAllHotelAmenities, setShowAllHotelAmenities] = useState(false);
    const [showAllRoomAmenities, setShowAllRoomAmenities] = useState(false);
    const AMENITIES_PREVIEW = 9;

    // Active selections
    const [selectedHotelTypes, setSelectedHotelTypes] = useState<string[]>([]);
    const [selectedStars, setSelectedStars] = useState<number[]>([]);
    const [selectedAmenities, setSelectedAmenities] = useState<number[]>([]);

    const activeCount = selectedHotelTypes.length + selectedStars.length + selectedAmenities.length;

    // ── Fetch filter data ──
    useEffect(() => {
        fetch('/api/public/hotel-types').then(r => r.json()).then(d => { if (d.success) setHotelTypeOptions(d.data); }).catch(() => {});
        fetch('/api/public/amenities').then(r => r.json()).then(d => {
            if (d.success) {
                setAmenityGroups({
                    hotel: Array.isArray(d.data.HOTEL) ? d.data.HOTEL : [],
                    room:  Array.isArray(d.data.ROOM)  ? d.data.ROOM  : [],
                });
            }
        }).catch(() => {});
    }, []);

    // ── Close panel on outside click ──
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Location suggestions ──
    const handleLocationChange = useCallback(async (value: string) => {
        setSearchLocation(value);
        if (value.length >= 1) {
            setIsLoadingSuggestions(true);
            try {
                const [citiesRes, hotelsRes] = await Promise.all([
                    fetch(`/api/public/cities?q=${encodeURIComponent(value)}`),
                    fetch(`/api/public/hotels?location=${encodeURIComponent(value)}`)
                ]);
                const ns: typeof suggestions = { hotels: [], cities: [] };
                if (citiesRes.ok) { const d = await citiesRes.json(); if (d.success) ns.cities = d.data.map((c: any) => ({ id: c.id, name: c.name, type: 'city' })); }
                if (hotelsRes.ok) { const d = await hotelsRes.json(); if (d.success) ns.hotels = d.data.map((h: any) => ({ id: h.id, name: h.name, type: 'hotel', city: h.city })); }
                setSuggestions(ns);
            } catch { setSuggestions({ hotels: [], cities: [] }); }
            finally { setIsLoadingSuggestions(false); }
        } else { setSuggestions({ hotels: [], cities: [] }); }
    }, []);

    const handleSuggestionSelect = (s: SearchSuggestion) => {
        setSearchLocation(s.type === 'hotel' ? `${s.name}, ${s.city}` : s.name);
        setSuggestions({ hotels: [], cities: [] });
    };

    // ── Search ──
    const handleSearch = () => {
        const params = new URLSearchParams();
        if (searchLocation) params.set("location", searchLocation);
        if (date?.from) params.set("check_in", format(date.from, "yyyy-MM-dd"));
        if (date?.to) params.set("check_out", format(date.to, "yyyy-MM-dd"));
        params.set("guests", String(guests));
        params.set("rooms", String(rooms));
        if (selectedHotelTypes.length) params.set("hotel_types", selectedHotelTypes.join(","));
        if (selectedStars.length) params.set("stars", selectedStars.join(","));
        if (selectedAmenities.length) params.set("amenities", selectedAmenities.join(","));
        // room-level amenity filter reuses the same param — backend already checks hotel_amenities
        router.push(`/search?${params.toString()}`);
    };

    const resetFilters = () => {
        setSelectedHotelTypes([]);
        setSelectedStars([]);
        setSelectedAmenities([]);
    };

    const togglePill = <T,>(arr: T[], val: T, set: (v: T[]) => void) =>
        set(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

    const visibleHotelAmenities = showAllHotelAmenities ? amenityGroups.hotel : amenityGroups.hotel.slice(0, AMENITIES_PREVIEW);
    const visibleRoomAmenities  = showAllRoomAmenities  ? amenityGroups.room  : amenityGroups.room.slice(0, AMENITIES_PREVIEW);

    return (
        <div className="w-full max-w-5xl mx-auto px-4" ref={panelRef}>
            {/* ── Main search card ── */}
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-2xl animate-fade-in-up">
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.8fr_1.2fr_0.8fr] gap-4">

                    {/* Location */}
                    <div className="relative group overflow-visible">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1 group-focus-within:text-primary transition-colors">Location</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
                                    <Input
                                        ref={locationInputRef}
                                        placeholder="Where are you going?"
                                        value={searchLocation}
                                        onChange={e => handleLocationChange(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') { setSuggestions({ hotels: [], cities: [] }); handleSearch(); } }}
                                        className="pl-12 h-12 rounded-xl border-border/40 hover:border-primary/40 focus:border-primary transition-all"
                                    />
                                    {isLoadingSuggestions && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                                </div>
                            </PopoverTrigger>
                            {(suggestions.hotels.length > 0 || suggestions.cities.length > 0) && (
                                <PopoverContent align="start" side="bottom" sideOffset={6} className="w-(--radix-popover-trigger-width) p-0 overflow-hidden" onOpenAutoFocus={e => e.preventDefault()}>
                                    <div className="bg-popover border border-border/40 rounded-lg shadow-2xl max-h-80 overflow-y-auto">
                                        {suggestions.cities.length > 0 && (
                                            <div className="p-2">
                                                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Locations</div>
                                                {suggestions.cities.map(c => (
                                                    <button key={`city-${c.id}`} onClick={() => handleSuggestionSelect(c)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors">
                                                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                                                        <div className="text-sm font-medium truncate">{c.name}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {suggestions.hotels.length > 0 && (
                                            <div className={cn(suggestions.cities.length > 0 ? 'border-t border-border/40' : '', 'p-2')}>
                                                <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Hotels</div>
                                                {suggestions.hotels.map(h => (
                                                    <button key={`hotel-${h.id}`} onClick={() => handleSuggestionSelect(h)} className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent rounded-md transition-colors">
                                                        <Hotel className="h-4 w-4 text-primary shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium truncate">{h.name}</div>
                                                            <div className="text-xs text-muted-foreground truncate">{h.city}</div>
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

                    {/* Dates */}
                    <div className="relative group">
                        <label className="text-xs font-semibold text-primary/70 mb-1.5 block pl-1 group-hover:text-primary transition-colors">Stay Dates</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full h-12 justify-start rounded-xl font-normal border-border/40 bg-muted/30 hover:border-primary/40 hover:bg-primary/5 transition-all duration-500 shadow-sm", !date && "text-muted-foreground")}>
                                    <CalendarIcon className="mr-3 h-5 w-5 text-primary/60" />
                                    <div className="flex items-center gap-3 w-full">
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Check-in</span>
                                            <span className="text-sm font-semibold">{date?.from ? format(date.from, "MMM dd, yyyy") : "Add date"}</span>
                                        </div>
                                        <div className="h-6 w-px bg-border/60 mx-1" />
                                        <div className="flex flex-col items-start leading-none">
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Check-out</span>
                                            <span className="text-sm font-semibold">{date?.to ? format(date.to, "MMM dd, yyyy") : "Add date"}</span>
                                        </div>
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-(--radix-popover-trigger-width) p-0 rounded-2xl shadow-2xl border-primary/20" align="center" sideOffset={8}>
                                <div className="p-4 border-b border-border/40 bg-primary/5 flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-primary uppercase tracking-widest">Select Dates</span>
                                        <span className="text-sm text-muted-foreground italic">Minimum 1 night stay</span>
                                    </div>
                                    {date?.from && date?.to && (
                                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setDate({ from: undefined, to: undefined })}>Clear</Button>
                                    )}
                                </div>
                                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={1} className="p-3 w-full" disabled={(d) => { const t = new Date(); t.setHours(0, 0, 0, 0); const max = new Date(t); max.setFullYear(max.getFullYear() + 1); return d < t || d > max; }} />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Guests & Rooms */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">Guests & Rooms</label>
                        <Popover open={isGuestOpen} onOpenChange={setIsGuestOpen}>
                            <PopoverTrigger asChild>
                                <button type="button" className="flex items-center justify-between w-full h-12 rounded-xl border border-input bg-background px-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <span>{guests} Guest{guests > 1 && "s"} · {rooms} Room{rooms > 1 && "s"}</span>
                                    </div>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 rounded-xl p-4 space-y-4" align="start">
                                {[{ label: 'Guests', val: guests, set: setGuests, max: 10 }, { label: 'Rooms', val: rooms, set: setRooms, max: 10 }].map(({ label, val, set, max }) => (
                                    <div key={label} className="flex items-center justify-between">
                                        <span className="text-sm font-medium">{label}</span>
                                        <div className="flex items-center gap-3">
                                            <button type="button" onClick={() => set(Math.max(1, val - 1))} className="w-8 h-8 rounded-full border flex items-center justify-center"><Minus className="h-4 w-4" /></button>
                                            <span>{val}</span>
                                            <button type="button" onClick={() => set(Math.min(max, val + 1))} className="w-8 h-8 rounded-full border flex items-center justify-center"><Plus className="h-4 w-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Search button */}
                    <div className="flex items-end">
                        <Button onClick={handleSearch} className="w-full h-12 rounded-xl gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                            <Search className="h-5 w-5" />
                            <span className="font-semibold">Search</span>
                        </Button>
                    </div>
                </div>

                {/* ── Filter trigger row ── */}
                {showFilters && (
                    <div className="mt-3 pt-3 border-t border-border/40 flex justify-center items-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(v => !v)}
                            className={cn(
                                "inline-flex items-center gap-2 h-8 px-3 rounded-full border text-xs font-medium transition-colors",
                                isFilterOpen || activeCount > 0
                                    ? "border-primary/60 bg-primary/10 text-primary"
                                    : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                            )}
                        >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Filters
                            {activeCount > 0 && (
                                <span className="ml-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeCount}</span>
                            )}
                            <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isFilterOpen && "rotate-180")} />
                        </button>

                        {/* Active filter pills */}
                        {selectedHotelTypes.map(t => (
                            <span key={t} className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-medium">
                                {t}
                                <button onClick={() => togglePill(selectedHotelTypes, t, setSelectedHotelTypes)} className="ml-0.5 hover:opacity-70"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                        {selectedStars.map(s => (
                            <span key={s} className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-medium">
                                {"★".repeat(s)}
                                <button onClick={() => togglePill(selectedStars, s, setSelectedStars)} className="ml-0.5 hover:opacity-70"><X className="w-3 h-3" /></button>
                            </span>
                        ))}
                        {selectedAmenities.map(id => {
                            const a = allAmenityOptions.find(x => x.id === id);
                            return a ? (
                                <span key={id} className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-primary/40 bg-primary/10 text-primary text-xs font-medium">
                                    {a.name}
                                    <button onClick={() => togglePill(selectedAmenities, id, setSelectedAmenities)} className="ml-0.5 hover:opacity-70"><X className="w-3 h-3" /></button>
                                </span>
                            ) : null;
                        })}
                        {activeCount > 0 && (
                            <button onClick={resetFilters} className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-1">Reset all</button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Slide-down filter panel ── */}
            {showFilters && (
                <div className={cn(
                    "overflow-hidden transition-all duration-300 ease-in-out",
                    isFilterOpen ? "max-h-[600px] opacity-100 mt-2" : "max-h-0 opacity-0 mt-0"
                )}>
                    <div className="rounded-2xl border border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl p-6 space-y-6">

                        {/* Hotel Type */}
                        {hotelTypeOptions.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-foreground">Hotel Type</h3>
                                <div className="flex flex-wrap gap-2">
                                    {hotelTypeOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => togglePill(selectedHotelTypes, opt.name, setSelectedHotelTypes)}
                                            className={cn(
                                                "h-8 px-4 rounded-full border text-xs font-medium transition-colors",
                                                selectedHotelTypes.includes(opt.name)
                                                    ? "border-primary bg-primary text-primary-foreground"
                                                    : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                                            )}
                                        >
                                            {opt.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Star Rating */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Star Rating</h3>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => togglePill(selectedStars, star, setSelectedStars)}
                                        className={cn(
                                            "h-9 px-3 rounded-full border text-sm font-medium transition-colors flex items-center gap-1",
                                            selectedStars.includes(star)
                                                ? "border-amber-400 bg-amber-400/20 text-amber-600 dark:text-amber-400"
                                                : "border-border/50 bg-muted/30 text-muted-foreground hover:border-amber-400/60"
                                        )}
                                    >
                                        <Star className={cn("w-3.5 h-3.5", selectedStars.includes(star) ? "fill-amber-400 text-amber-400" : "")} />
                                        {star}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amenities */}
                        {(amenityGroups.hotel.length > 0 || amenityGroups.room.length > 0) && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-foreground">Amenities</h3>

                                {/* Hotel amenities */}
                                {amenityGroups.hotel.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Hotel</p>
                                        <div className="flex flex-wrap gap-2">
                                            {visibleHotelAmenities.map(a => (
                                                <button key={a.id} type="button"
                                                    onClick={() => togglePill(selectedAmenities, a.id, setSelectedAmenities)}
                                                    className={cn(
                                                        "h-8 px-3 rounded-full border text-xs font-medium transition-colors",
                                                        selectedAmenities.includes(a.id)
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                                                    )}>{a.name}</button>
                                            ))}
                                            {amenityGroups.hotel.length > AMENITIES_PREVIEW && (
                                                <button type="button" onClick={() => setShowAllHotelAmenities(v => !v)}
                                                    className="h-8 px-3 rounded-full border border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors flex items-center gap-1">
                                                    {showAllHotelAmenities ? "Show less" : `+${amenityGroups.hotel.length - AMENITIES_PREVIEW} more`}
                                                    <ChevronDown className={cn("w-3 h-3 transition-transform", showAllHotelAmenities && "rotate-180")} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Room amenities */}
                                {amenityGroups.room.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Room</p>
                                        <div className="flex flex-wrap gap-2">
                                            {visibleRoomAmenities.map(a => (
                                                <button key={a.id} type="button"
                                                    onClick={() => togglePill(selectedAmenities, a.id, setSelectedAmenities)}
                                                    className={cn(
                                                        "h-8 px-3 rounded-full border text-xs font-medium transition-colors",
                                                        selectedAmenities.includes(a.id)
                                                            ? "border-primary bg-primary text-primary-foreground"
                                                            : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/60 hover:text-foreground"
                                                    )}>{a.name}</button>
                                            ))}
                                            {amenityGroups.room.length > AMENITIES_PREVIEW && (
                                                <button type="button" onClick={() => setShowAllRoomAmenities(v => !v)}
                                                    className="h-8 px-3 rounded-full border border-dashed border-border/60 text-xs font-medium text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors flex items-center gap-1">
                                                    {showAllRoomAmenities ? "Show less" : `+${amenityGroups.room.length - AMENITIES_PREVIEW} more`}
                                                    <ChevronDown className={cn("w-3 h-3 transition-transform", showAllRoomAmenities && "rotate-180")} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <button type="button" onClick={resetFilters} className="text-sm text-muted-foreground hover:text-destructive transition-colors">
                                Reset all filters
                            </button>
                            <Button onClick={() => { setIsFilterOpen(false); handleSearch(); }} className="h-9 px-6 rounded-full gap-2">
                                <Search className="w-4 h-4" />
                                Apply Filters
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchBar;