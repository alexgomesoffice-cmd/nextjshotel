"use client";

import { useState } from "react";
import { format, addDays } from "date-fns";
import { DateRange } from "react-day-picker";

import {
    Search,
    MapPin,
    Calendar as CalendarIcon,
    Users,
    Minus,
    Plus,
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

interface SearchBarProps {
    showFilters?: boolean;
}

const SearchBar = ({
    showFilters = true,
}: SearchBarProps) => {
    const [searchLocation, setSearchLocation] = useState("");

    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(),
        to: addDays(new Date(), 4),
    });

    const [guests, setGuests] = useState(1);
    const [rooms, setRooms] = useState(1);

    const [isGuestOpen, setIsGuestOpen] = useState(false);

    return (
        <div className="w-full max-w-5xl mx-auto px-4">
            <div className="rounded-2xl border border-border/40 bg-background/60 backdrop-blur-xl p-5 shadow-2xl animate-fade-in-up">
                <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1.8fr_1.2fr_0.8fr] gap-4">
                    {/* Location */}
                    <div className="relative">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block pl-1">
                            Location
                        </label>

                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />

                            <Input
                                placeholder="Where are you going?"
                                value={searchLocation}
                                onChange={(e) =>
                                    setSearchLocation(e.target.value)
                                }
                                className="pl-12 h-12 rounded-xl"
                            />
                        </div>
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
                        <Button className="w-full h-12 rounded-xl gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                            <Search className="h-5 w-5" />
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