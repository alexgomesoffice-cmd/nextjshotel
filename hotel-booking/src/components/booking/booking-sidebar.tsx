"use client";

import { useState } from "react";
import {
  Users,
  Calendar as CalendarIcon,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { format, differenceInCalendarDays, addDays } from "date-fns";

export interface SelectedVariant {
  variantId: number;
  roomTypeId: number;
  roomTypeName: string;
  price: number;
  quantity: number;
}

interface BookingSidebarProps {
  hotelSlug: string;
  selectedVariants: SelectedVariant[];
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  displayPrice?: number;
  onDatesChange?: (checkIn: string, checkOut: string) => void;
  onGuestsChange?: (guests: number) => void;
  guestWarning?: string | null;
}

const SERVICE_FEE_PERCENT = 0.1;

export default function BookingSidebar({
  hotelSlug,
  selectedVariants,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  displayPrice,
  onDatesChange,
  onGuestsChange,
  guestWarning,
}: BookingSidebarProps) {
  const router = useRouter();

  const parseDate = (s?: string) => {
    if (!s) return undefined;
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
  };

  const [date, setDate] = useState<DateRange | undefined>({
    from: parseDate(initialCheckIn) ?? new Date(),
    to: parseDate(initialCheckOut) ?? addDays(new Date(), 1),
  });

  const [guests, setGuests] = useState(initialGuests);

  const nights =
    date?.from && date?.to
      ? Math.max(differenceInCalendarDays(date.to, date.from), 1)
      : 1;

  const hasSelections = selectedVariants.length > 0;
  const roomsTotal = selectedVariants.reduce((s, v) => s + v.price * nights * v.quantity, 0);
  const grandTotal = roomsTotal ;

  const headerPrice =
    selectedVariants.length > 0
      ? Math.min(...selectedVariants.map(v => v.price))
      : displayPrice;

  const handleDateSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (newDate?.from && newDate?.to && onDatesChange) {
      onDatesChange(format(newDate.from, "yyyy-MM-dd"), format(newDate.to, "yyyy-MM-dd"));
    }
  };

  const handleGuestsChange = (newGuests: number) => {
    setGuests(newGuests);
    if (onGuestsChange) {
      onGuestsChange(newGuests);
    }
  };

  const handleReserve = () => {
    if (!hasSelections || !date?.from || !date?.to) return;

    const selectionsByRoomType = selectedVariants.reduce<Record<number, number>>(
      (acc, variant) => {
        acc[variant.roomTypeId] = (acc[variant.roomTypeId] || 0) + variant.quantity;
        return acc;
      },
      {}
    );

    const params = new URLSearchParams();
    params.set("hotel", hotelSlug);
    params.set("check_in", format(date.from, "yyyy-MM-dd"));
    params.set("check_out", format(date.to, "yyyy-MM-dd"));
    params.set("guests", guests.toString());

    Object.entries(selectionsByRoomType).forEach(([roomTypeId, qty]) => {
      params.append("room_type_ids[]", roomTypeId);
      params.append("quantities[]", qty.toString());
    });

    router.push(`/bookings/new?${params.toString()}`);
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden sticky top-24 shadow-md">
      {/* Header */}
      <div className="flex items-baseline justify-between px-5 pt-5 pb-4">
        <h3 className="font-bold text-lg text-foreground">Book your stay</h3>
        {headerPrice && (
  <div className="flex flex-col items-end leading-tight">
    {!hasSelections && (
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Starts from
      </span>
    )}

    <span className="font-bold text-lg text-primary">
      TK {Number(headerPrice).toLocaleString()}
      <span className="text-xs text-muted-foreground font-normal">/night</span>
    </span>
  </div>
)}
      </div>

      <div className="px-5 pb-5 space-y-3">
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
                  onClick={() => handleDateSelect({ from: undefined, to: undefined })}
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
              onSelect={handleDateSelect}
              numberOfMonths={1}
              className="p-3 w-full"
            />
          </PopoverContent>
        </Popover>

        <div className="flex items-center justify-between border border-border/50 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-primary" />
            <span>{guests} Guest{guests !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleGuestsChange(Math.max(1, guests - 1))}
              disabled={guests <= 1}
              className={cn(
                "h-7 w-7 rounded-full border flex items-center justify-center text-sm font-bold transition-colors",
                guests > 1
                  ? "border-border/50 text-foreground hover:border-primary hover:text-primary"
                  : "border-border/20 text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              −
            </button>
            <span className="w-4 text-center text-sm font-medium tabular-nums">{guests}</span>
            <button
              onClick={() => handleGuestsChange(Math.min(10, guests + 1))}
              disabled={guests >= 10}
              className={cn(
                "h-7 w-7 rounded-full border flex items-center justify-center text-sm font-bold transition-colors",
                guests < 10
                  ? "border-border/50 text-foreground hover:border-primary hover:text-primary"
                  : "border-border/20 text-muted-foreground/30 cursor-not-allowed"
              )}
            >
              +
            </button>
          </div>
        </div>
        {guestWarning && (
          <div className="text-sm text-destructive mt-2 px-2">{guestWarning}</div>
        )}

        {hasSelections ? (
          <div className="border border-border/40 rounded-xl overflow-hidden">
            <p className="text-xs text-muted-foreground px-3 pt-3 pb-2 font-medium">Selected rooms</p>
            <div className="divide-y divide-border/20">
              {selectedVariants.map(v => (
                <div key={v.variantId} className="flex items-center gap-2 px-3 py-2.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-foreground flex-1 truncate">
                    {v.roomTypeName}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">×{v.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="border border-border/30 rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground">No room selected — choose from the list</p>
          </div>
        )}

        {hasSelections && nights > 0 && (
          <div className="space-y-2 pt-1">
            {selectedVariants.map(v => (
              <div key={v.variantId} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  TK {Number(v.price).toLocaleString()} × {v.quantity} room{v.quantity > 1 ? "s" : ""}
                </span>
                <span className="text-foreground">TK {(v.price * nights * v.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
            </div>
            <div className="flex items-center justify-between font-bold text-base pt-2 border-t border-border/30">
              <span className="text-foreground">Total</span>
              <span className="text-primary">TK {grandTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold rounded-xl"
          disabled={!hasSelections || !date?.from || !date?.to || nights < 1}
          onClick={handleReserve}
        >
          Reserve now
        </Button>
      </div>
    </div>
  );
}
