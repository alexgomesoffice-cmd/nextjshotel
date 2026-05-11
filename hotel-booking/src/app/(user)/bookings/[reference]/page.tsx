"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Hotel, Clock, BedDouble,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatBDT } from "@/lib/utils";
import ReservationTimer from "@/components/booking/reservation-timer";

interface RoomBooking {
  id: number;
  price_per_night: number;
  nights: number;
  subtotal: number;
  room_type: { id: number; name: string };
  room_detail: { id: number; room_number: string; floor: number | null; ac: boolean };
}

interface Booking {
  id: number;
  booking_reference: string;
  status: string;
  check_in: string;
  check_out: string;
  total_price: string;
  advance_amount: string;
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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  RESERVED:    { label: "Reserved",    color: "bg-amber-500/20 text-amber-700 border-amber-500/30",   icon: Clock },
  BOOKED:      { label: "Confirmed",   color: "bg-green-500/20 text-green-700 border-green-500/30",   icon: CheckCircle2 },
  EXPIRED:     { label: "Expired",     color: "bg-gray-500/20 text-gray-600 border-gray-500/30",      icon: AlertCircle },
  CANCELLED:   { label: "Cancelled",   color: "bg-red-500/20 text-red-700 border-red-500/30",         icon: XCircle },
  CHECKED_IN:  { label: "Checked In",  color: "bg-blue-500/20 text-blue-700 border-blue-500/30",     icon: CheckCircle2 },
  CHECKED_OUT: { label: "Checked Out", color: "bg-purple-500/20 text-purple-700 border-purple-500/30", icon: CheckCircle2 },
  NO_SHOW:     { label: "No Show",     color: "bg-red-500/20 text-red-700 border-red-500/30",         icon: XCircle },
};

export default function BookingDetailPage() {
  const params = useParams();
  const reference = params.reference as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const res = await fetch(`/api/user/bookings/${reference}`, { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.success) {
          setBooking(data.data);
        } else {
          setError(data.message || "Booking not found");
        }
      } catch {
        setError("Failed to load booking details");
      } finally {
        setLoading(false);
      }
    };
    if (reference) fetchBooking();
  }, [reference]);

  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-16 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Booking Not Found</h1>
        <p className="text-muted-foreground mb-6">{error || "We couldn't find this booking."}</p>
        <Link href="/bookings"><Button variant="outline">Back to My Bookings</Button></Link>
      </div>
    );
  }

  const sc = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.EXPIRED;
  const StatusIcon = sc.icon;
  const nightCount = Math.round(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isReserved = booking.status === "RESERVED";
  const reservedUntilFuture = isReserved && booking.reserved_until && new Date(booking.reserved_until) > new Date();

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 space-y-6">
      {/* Back link */}
      <Link href="/bookings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="h-4 w-4" /> Back to My Bookings
      </Link>

      {/* Header */}
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

      {/* Reservation Timer (BUG 18) */}
      {reservedUntilFuture && (
        <ReservationTimer reservedUntil={booking.reserved_until!} />
      )}

      {/* Hotel info */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Hotel className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{booking.hotel.name}</h2>
          </div>
          {booking.hotel.city && (
            <p className="text-sm text-muted-foreground">{booking.hotel.city.name}</p>
          )}

          {/* Dates grid */}
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

      {/* Room details */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-lg mb-4">Rooms</h3>
          <div className="space-y-3">
            {booking.room_bookings.map(rb => (
              <div key={rb.id} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
                <div className="flex items-start gap-3">
                  <BedDouble className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{rb.room_type.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Room {rb.room_detail.room_number}
                      {rb.room_detail.floor ? ` · Floor ${rb.room_detail.floor}` : ""}
                      {rb.room_detail.ac ? " · AC" : ""}
                    </p>
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

          {/* Total */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/50">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-xl text-primary">{formatBDT(Number(booking.total_price))}</span>
          </div>
        </CardContent>
      </Card>

      {/* Special request */}
      {booking.special_request && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-lg mb-2">Special Request</h3>
            <p className="text-sm text-muted-foreground">{booking.special_request}</p>
          </CardContent>
        </Card>
      )}

      {/* Booking meta */}
      <p className="text-xs text-muted-foreground text-center">
        Booked on {new Date(booking.created_at).toLocaleDateString("en-BD", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}
