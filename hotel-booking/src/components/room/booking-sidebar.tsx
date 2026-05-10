"use client";

import { useState } from "react";
import { format, differenceInCalendarDays, addDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, ShieldCheck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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
}

const SERVICE_FEE_PERCENT = 0.1;

export default function BookingSidebar({
  hotelSlug,
  selectedVariants,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  displayPrice,
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

  const nights =
    date?.from && date?.to
      ? Math.max(differenceInCalendarDays(date.to, date.from), 1)
      : 1;

  const hasSelections = selectedVariants.length > 0;
  const roomsTotal = selectedVariants.reduce((s, v) => s + v.price * nights * v.quantity, 0);
  const serviceFee = Math.round(roomsTotal * SERVICE_FEE_PERCENT);
  const grandTotal = roomsTotal + serviceFee;

  const headerPrice =
    selectedVariants.length > 0
      ? Math.min(...selectedVariants.map(v => v.price))
      : displayPrice;

  const handleReserve = () => {
    if (!hasSelections || !date?.from || !date?.to) return;
    const primary = selectedVariants[0];
    const params = new URLSearchParams();
    params.set("hotel", hotelSlug);
    params.set("room_type", primary.roomTypeId.toString());
    params.set("quantity", selectedVariants.reduce((s, v) => s + v.quantity, 0).toString());
    params.set("check_in", format(date.from, "yyyy-MM-dd"));
    params.set("check_out", format(date.to, "yyyy-MM-dd"));
    params.set("guests", initialGuests.toString());
    router.push(`/bookings/new?${params.toString()}`);
  };

  return (
    <div className="bg-card border border-border/40 rounded-2xl overflow-hidden sticky top-24">
      {/* Header */}
      <div className="flex items-baseline justify-between px-5 pt-5 pb-4">
        <h3 className="font-bold text-lg text-foreground">Book your stay</h3>
        {headerPrice && (
          <span className="font-bold text-lg text-primary">
            ৳{Number(headerPrice).toLocaleString()}
            <span className="text-xs text-muted-foreground font-normal">/night</span>
          </span>
        )}
      </div>

      <div className="px-5 pb-5 space-y-3">
        {/* Check-in */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full text-left">
              <p className="text-xs text-muted-foreground mb-1.5">Check-in</p>
              <div className="flex items-center gap-2.5 border border-border/50 rounded-xl px-4 py-3 hover:border-primary/50 transition-colors bg-background/50">
                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {date?.from ? format(date.from, "EEE, MMM d, yyyy") : "Select date"}
                </span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
            <div className="p-2.5 border-b border-border/40 bg-primary/5 flex items-center justify-between">
              <span className="text-xs font-semibold text-primary uppercase tracking-widest">Select Dates</span>
              {date?.from && date?.to && (
                <Button variant="ghost" size="sm" className="text-xs h-7"
                  onClick={() => setDate({ from: undefined, to: undefined })}>Clear</Button>
              )}
            </div>
            <Calendar initialFocus mode="range" defaultMonth={date?.from}
              selected={date} onSelect={setDate} numberOfMonths={1}
              disabled={{ before: new Date() }} className="p-3" />
          </PopoverContent>
        </Popover>

        {/* Check-out */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="w-full text-left">
              <p className="text-xs text-muted-foreground mb-1.5">Check-out</p>
              <div className="flex items-center gap-2.5 border border-border/50 rounded-xl px-4 py-3 hover:border-primary/50 transition-colors bg-background/50">
                <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-foreground">
                  {date?.to ? format(date.to, "EEE, MMM d, yyyy") : "Select date"}
                </span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" sideOffset={6}>
            <Calendar initialFocus mode="range" defaultMonth={date?.from}
              selected={date} onSelect={setDate} numberOfMonths={1}
              disabled={{ before: date?.from ?? new Date() }} className="p-3" />
          </PopoverContent>
        </Popover>

        {/* Selected rooms */}
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

        {/* Price breakdown */}
        {hasSelections && nights > 0 && (
          <div className="space-y-2 pt-1">
            {selectedVariants.map(v => (
              <div key={v.variantId} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  ৳{Number(v.price).toLocaleString()} × {v.quantity} room{v.quantity > 1 ? "s" : ""}
                </span>
                <span className="text-foreground">৳{(v.price * nights * v.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Service fee</span>
              <span className="text-foreground">৳{serviceFee.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between font-bold text-base pt-2 border-t border-border/30">
              <span className="text-foreground">Total</span>
              <span className="text-primary">৳{grandTotal.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Reserve button */}
        <Button
          className="w-full h-12 text-base font-semibold rounded-xl"
          disabled={!hasSelections || !date?.from || !date?.to || nights < 1}
          onClick={handleReserve}
        >
          {!hasSelections
            ? "Select a room to book"
            : `Reserve for ৳${grandTotal.toLocaleString()}`}
        </Button>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          You won't be charged yet
        </div>
      </div>
    </div>
  );
}
