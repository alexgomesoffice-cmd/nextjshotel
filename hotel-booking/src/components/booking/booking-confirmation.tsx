"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Hotel, Clock, BedDouble,
  CheckCircle2, XCircle, AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useBookingStatus } from "@/hooks/use-booking-status";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import ReservationTimer from "@/components/booking/reservation-timer";

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
  RESERVED: { label: "Reserved", color: "bg-amber-500/20 text-amber-700 border-amber-500/30", icon: Clock },
  BOOKED: { label: "Confirmed", color: "bg-green-500/20 text-green-700 border-green-500/30", icon: CheckCircle2 },
  EXPIRED: { label: "Expired", color: "bg-gray-500/20 text-gray-600 border-gray-500/30", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", color: "bg-red-500/20 text-red-700 border-red-500/30", icon: XCircle },
  CHECKED_IN: { label: "Checked In", color: "bg-blue-500/20 text-blue-700 border-blue-500/30", icon: CheckCircle2 },
  CHECKED_OUT: { label: "Checked Out", color: "bg-purple-500/20 text-purple-700 border-purple-500/30", icon: CheckCircle2 },
  NO_SHOW: { label: "No Show", color: "bg-red-500/20 text-red-700 border-red-500/30", icon: XCircle },
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
  const nightCount = Math.round(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)
  );
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

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
      <Link href="/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <span className="text-foreground">←</span> Back to My Bookings
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Booking Details</h1>
          <p className="text-muted-foreground mt-1">
            Reference: <span className="font-mono font-medium text-foreground">{booking.booking_reference}</span>
          </p>
        </div>
        <Badge variant="outline" className={`${sc.color} text-sm px-3 py-1.5`}>
          <StatusIcon className="h-4 w-4 mr-1.5" />
          {sc.label}
        </Badge>
      </div>

      {reservedUntilFuture && (
        <ReservationTimer reservedUntil={booking.reserved_until!} reference={booking.booking_reference} />
      )}

      {isReserved && reservedUntilFuture && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div>
              <h2 className="font-bold text-lg">Reservation held</h2>
              <p className="text-sm text-muted-foreground">Confirm before the timer expires to keep these rooms.</p>
            </div>
            {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}
            <Button className="w-full sm:w-auto" onClick={confirmBooking} disabled={confirming}>
              {confirming ? "Confirming Booking..." : "Confirm Booking"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-xl font-bold">Guest Details</h2>
          <p className="text-sm font-medium">{booking.end_user.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{booking.end_user.email}</p>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3 mb-1">
            {booking.hotel.images[0] && <Image src={booking.hotel.images[0].image_url} alt={booking.hotel.name} width={88} height={64} className="h-16 w-[88px] rounded-lg object-cover" />}
            <Hotel className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{booking.hotel.name}</h2>
          </div>
          {booking.hotel.city && (
            <p className="text-sm text-muted-foreground">{booking.hotel.city.name}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Check-in</p>
              <p className="font-medium text-sm">
                {new Date(booking.check_in).toLocaleDateString("en-BD", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Check-out</p>
              <p className="font-medium text-sm">
                {new Date(booking.check_out).toLocaleDateString("en-BD", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Duration</p>
              <p className="font-medium text-sm">{nightCount} night{nightCount !== 1 ? "s" : ""}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Guests</p>
              <p className="font-medium text-sm">{booking.guests} adult{booking.guests !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4">Rooms</h3>
          <div className="space-y-3">
            {booking.room_bookings.map(rb => (
              <div key={rb.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                <div className="flex items-start gap-3">
                  {(() => {
                    const image = rb.room_variant.variant_images.find((item) => item.is_cover) ?? rb.room_variant.variant_images[0];
                    return image ? <Image src={image.image_url} alt={rb.room_type.name} width={72} height={56} className="h-14 w-[72px] rounded-lg object-cover" /> : null;
                  })()}
                  <BedDouble className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{rb.room_type.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rb.room_variant.room_size || "Room configuration"}
                      {rb.room_variant.max_occupancy ? ` · Up to ${rb.room_variant.max_occupancy} guests` : ""}
                    </p>
                    {(rb.room_variant.bed_types.length > 0 || rb.room_variant.facilities.length > 0) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[...rb.room_variant.bed_types.map((bed) => `${bed.count} × ${bed.bed_type.name}`), ...rb.room_variant.facilities.map((item) => item.facility.name)].join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatBDT(Number(rb.subtotal))}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBDT(Number(rb.price_per_night))} × {rb.nights} night{rb.nights !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 mt-2 border-t border-border/50">
            <h4 className="font-semibold text-sm mb-3">Nightly price breakdown</h4>
            <div className="space-y-2">
              {booking.room_bookings.flatMap((rb) => rb.nightly_rates.map((rate) => (
                <div key={`${rb.id}-${rate.stay_date}`} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(rate.stay_date).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" })}
                    {rate.pricing_rule_name ? ` · ${rate.pricing_rule_name}` : ""}
                  </span>
                  <span className="font-medium">{formatBDT(Number(rate.price))}</span>
                </div>
              ))) }
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-xl text-primary">{formatBDT(Number(booking.total_price))}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-3 text-lg font-bold">Good to know</h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Secure booking. Your reservation details are protected.</p>
            <p>Payment is handled directly with the hotel upon arrival.</p>
          </div>
        </CardContent>
      </Card>

      {booking.special_request && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-2">Special Request</h3>
            <p className="text-sm text-muted-foreground">{booking.special_request}</p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Booked on {new Date(booking.created_at).toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}