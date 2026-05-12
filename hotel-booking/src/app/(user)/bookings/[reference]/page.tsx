"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Clock, Loader2, CheckCircle2, XCircle } from "lucide-react";
import BookingConfirmation from "@/components/booking/booking-confirmation";
import { Button } from "@/components/ui/button";

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

  return <BookingConfirmation booking={booking} />;
}
