"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Hotel, Clock, BedDouble,
  CheckCircle2, XCircle, AlertCircle, CalendarDays, Users, Tag, Info
} from "lucide-react";
import { useEffect, useState } from "react";
import { useBookingStatus } from "@/hooks/use-booking-status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import ReservationTimer from "@/components/booking/reservation-timer";
import { format } from "date-fns";

interface RoomBooking {
  id: number;
  price_per_night: number;
  nights: number;
  subtotal: number;
  room_type: { id: number; name: string };
  room_variant: {
    id: number;
    room_size: string | null;
    max_occupancy: number | null;
    variant_images: { image_url: string; is_cover: boolean }[];
    bed_types: { count: number; bed_type: { name: string } }[];
    facilities: { facility: { name: string } }[];
  };
  nightly_rates: { stay_date: string; price: number | string; pricing_rule_name: string | null }[];
}

interface Booking {
  id: number;
  booking_reference: string;
  status: string;
  check_in: string;
  check_out: string;
  total_price: string;
  guests: number;
  rooms_count: number;
  special_request: string | null;
  reserved_until: string | null;
  created_at: string;
  hotel: {
    id: number;
    name: string;
    slug: string;
    city: { name: string } | null;
    images: { image_url: string }[];
  };
  room_bookings: RoomBooking[];
  end_user: { name: string; email: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  RESERVED: { label: "Reserved", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: Clock },
  BOOKED: { label: "Confirmed", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: CheckCircle2 },
  EXPIRED: { label: "Expired", color: "bg-gray-500/10 text-gray-500 border-gray-500/20", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  CHECKED_IN: { label: "Checked In", color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: CheckCircle2 },
  CHECKED_OUT: { label: "Checked Out", color: "bg-purple-500/10 text-purple-600 border-purple-500/20", icon: CheckCircle2 },
  NO_SHOW: { label: "No Show", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: XCircle },
};

interface BookingConfirmationProps {
  booking: Booking;
}

export default function BookingConfirmation({ booking }: BookingConfirmationProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(booking.status === "BOOKED");
  const liveStatus = useBookingStatus(booking.booking_reference, booking.status);

  useEffect(() => {
    const interval = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const effectiveStatus = confirmed || liveStatus === "BOOKED" ? "BOOKED" : liveStatus === "RESERVED"
    ? booking.reserved_until && new Date(booking.reserved_until).getTime() <= currentTime
      ? "EXPIRED"
      : "RESERVED"
    : liveStatus;

  const sc = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.EXPIRED;
  const StatusIcon = sc.icon;
  
  const checkInDate = new Date(booking.check_in);
  const checkOutDate = new Date(booking.check_out);
  const nightCount = Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const isReserved = effectiveStatus === "RESERVED";
  const reservedUntilFuture = isReserved && booking.reserved_until && new Date(booking.reserved_until).getTime() > currentTime;

  async function confirmBooking() {
    setConfirming(true);
    setConfirmError(null);
    try {
      const response = await fetch(`/api/bookings/${booking.booking_reference}/confirm`, {
        method: "POST",
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to confirm booking");
      setConfirmed(true);
    } catch (error) {
      setConfirmError(error instanceof Error ? error.message : "Unable to confirm booking");
    } finally {
      setConfirming(false);
    }
  }

  // Group identical room variants
  const groupedRooms = Object.values(
    booking.room_bookings.reduce((acc, rb) => {
      const key = `${rb.room_type.id}-${rb.room_variant.id}`;
      if (!acc[key]) {
        acc[key] = {
          room_type: rb.room_type,
          room_variant: rb.room_variant,
          quantity: 0,
          subtotal: 0,
          nights: rb.nights,
          nightly_rates: rb.nightly_rates,
        };
      }
      acc[key].quantity += 1;
      acc[key].subtotal += Number(rb.subtotal);
      return acc;
    }, {} as Record<string, any>)
  );

  return (
    <div className="bg-muted/30 min-h-screen pt-24 pb-20">
      <div className="container mx-auto max-w-5xl px-4">
        
        {/* Page Header */}
        <div className="mb-8">
          <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
            <span>&larr;</span> Back to My Bookings
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Reservation {isReserved ? "Held" : "Confirmation"}</h1>
              <p className="text-muted-foreground mt-1.5">
                {isReserved && reservedUntilFuture 
                  ? "Your room is temporarily held for you." 
                  : "Review the details of your reservation."}
              </p>
            </div>
            <div className="text-sm font-medium bg-background px-3 py-1.5 rounded-lg border shadow-sm">
              <span className="text-muted-foreground mr-2">Ref:</span>
              <span className="font-mono">{booking.booking_reference}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-start">
          
          {/* LEFT: Main Details */}
          <div className="space-y-6">
            
            {/* Hotel Context */}
            <Card className="p-5 flex items-center gap-4 bg-card/60 shadow-sm border-border/50">
              <div className="h-16 w-16 bg-muted rounded-md overflow-hidden shrink-0 relative">
                {booking.hotel.images[0] ? (
                  <Image src={booking.hotel.images[0].image_url} alt={booking.hotel.name} fill className="object-cover" />
                ) : (
                  <Hotel className="h-6 w-6 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold">{booking.hotel.name}</h2>
                {booking.hotel.city && <p className="text-sm text-muted-foreground">{booking.hotel.city.name}</p>}
              </div>
            </Card>

            {/* Dates & Guests */}
            <Card className="p-6 shadow-sm border-border/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Check-in</p>
                  <p className="font-medium">{format(checkInDate, "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Check-out</p>
                  <p className="font-medium">{format(checkOutDate, "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Stay</p>
                  <p className="font-medium">{nightCount} night{nightCount !== 1 ? "s" : ""}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Guests</p>
                  <p className="font-medium">{booking.guests} guest{booking.guests !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </Card>

            {/* Room Variants */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Room Selection</h3>
              {groupedRooms.map((group, index) => {
                const coverImage = group.room_variant.variant_images.find((img: any) => img.is_cover) ?? group.room_variant.variant_images[0];
                return (
                  <Card key={index} className="overflow-hidden shadow-sm border-border/50">
                    <div className="p-5 flex flex-col sm:flex-row gap-5">
                      <div className="w-full sm:w-40 h-32 bg-muted rounded-lg shrink-0 relative overflow-hidden">
                        {coverImage ? (
                          <Image src={coverImage.image_url} alt={group.room_type.name} fill className="object-cover" />
                        ) : (
                          <BedDouble className="h-8 w-8 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-lg leading-tight">{group.room_type.name}</h4>
                            <p className="text-sm font-medium text-muted-foreground">{group.room_variant.room_size}</p>
                          </div>
                          <Badge variant="secondary" className="font-medium">
                            {group.quantity} room{group.quantity !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-muted-foreground">
                          {group.room_variant.bed_types.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <BedDouble className="h-3.5 w-3.5" />
                              <span>{group.room_variant.bed_types.map((b: any) => `${b.count} × ${b.bed_type.name}`).join(", ")}</span>
                            </div>
                          )}
                          {group.room_variant.max_occupancy && (
                            <div className="flex items-center gap-1.5">
                              <Users className="h-3.5 w-3.5" />
                              <span>Up to {group.room_variant.max_occupancy} guests</span>
                            </div>
                          )}
                          {group.room_variant.facilities.length > 0 && (
                            <div className="flex items-center gap-1.5 w-full mt-1">
                              <span>{group.room_variant.facilities.map((f: any) => f.facility.name).join(" · ")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Guest Details */}
            <Card className="p-6 shadow-sm border-border/50">
              <h3 className="text-lg font-bold mb-4">Guest Details</h3>
              <div className="space-y-1">
                <p className="font-medium">{booking.end_user.name}</p>
                <p className="text-sm text-muted-foreground">{booking.end_user.email}</p>
              </div>
              {booking.special_request && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-sm font-semibold mb-1">Special Request</p>
                  <p className="text-sm text-muted-foreground">{booking.special_request}</p>
                </div>
              )}
            </Card>
            
            {/* Price Breakdown */}
            <Card className="p-6 shadow-sm border-border/50">
              <h3 className="text-lg font-bold mb-4">Price Breakdown</h3>
              <div className="space-y-6">
                {groupedRooms.map((group, index) => (
                  <div key={index}>
                    <div className="flex justify-between font-medium mb-3">
                      <span>{group.room_type.name} <span className="text-muted-foreground font-normal">({group.quantity} room{group.quantity !== 1 ? "s" : ""})</span></span>
                      <span>{formatBDT(group.subtotal)}</span>
                    </div>
                    <div className="space-y-2 text-sm pl-4 border-l-2 border-muted">
                      {group.nightly_rates.map((rate: any, i: number) => (
                        <div key={i} className="flex justify-between text-muted-foreground">
                          <span className="flex items-center gap-2">
                            {format(new Date(rate.stay_date), "MMM d")}
                            {rate.pricing_rule_name && (
                              <Badge variant="outline" className="text-[10px] uppercase h-5 px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                                {rate.pricing_rule_name}
                              </Badge>
                            )}
                          </span>
                          <span>{formatBDT(Number(rate.price))} × {group.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-border/50">
                <span className="font-semibold">Subtotal</span>
                <span className="font-semibold">{formatBDT(Number(booking.total_price))}</span>
              </div>
            </Card>

          </div>

          {/* RIGHT: Sticky Summary */}
          <div className="sticky top-24 space-y-4">
            <Card className="overflow-hidden shadow-md border-primary/20">
              
              <div className="bg-primary/5 p-5 border-b border-primary/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">Reservation Summary</h3>
                  <Badge variant="outline" className={`${sc.color} font-semibold uppercase tracking-wider text-xs px-2.5 py-1`}>
                    <StatusIcon className="h-3.5 w-3.5 mr-1.5" />
                    {sc.label}
                  </Badge>
                </div>
                
                {reservedUntilFuture ? (
                  <div className="bg-background rounded-lg p-4 border border-border/50 text-center">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-2">Time Remaining</p>
                    <ReservationTimer reservedUntil={booking.reserved_until!} reference={booking.booking_reference} />
                  </div>
                ) : effectiveStatus === "EXPIRED" ? (
                  <div className="bg-background rounded-lg p-4 border border-border/50 text-center text-muted-foreground">
                    <p className="text-sm">This reservation has expired.</p>
                  </div>
                ) : (
                  <div className="bg-background rounded-lg p-4 border border-border/50 text-center text-muted-foreground">
                    <p className="text-sm font-medium">Your booking is secured.</p>
                  </div>
                )}
              </div>

              <div className="p-5 bg-card">
                <div className="flex justify-between items-end mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Total Amount</p>
                    <p className="text-xs text-muted-foreground">Taxes & fees included</p>
                  </div>
                  <span className="text-2xl font-bold text-foreground">
                    {formatBDT(Number(booking.total_price))}
                  </span>
                </div>
                
                {isReserved && reservedUntilFuture && (
                  <div className="space-y-3">
                    {confirmError && (
                      <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>{confirmError}</p>
                      </div>
                    )}
                    <Button 
                      className="w-full h-12 text-base font-semibold shadow-sm" 
                      onClick={confirmBooking} 
                      disabled={confirming}
                    >
                      {confirming ? "Confirming..." : "Confirm Reservation"}
                    </Button>
                    <p className="text-[11px] text-center text-muted-foreground leading-relaxed px-2">
                      By confirming, you agree to the hotel's policies and terms of service.
                    </p>
                  </div>
                )}
              </div>
              
            </Card>
            
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-6">
              <Info className="h-4 w-4" />
              <p>Payment is handled directly with the hotel upon arrival.</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
