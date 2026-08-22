"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import BookingConfirmation from "@/components/booking/booking-confirmation";
import { Button } from "@/components/ui/button";

interface RoomBooking {
  id: number;
  price_per_night: number;
  nights: number;
  subtotal: number;
  room_type: { id: number; name: string };
  room_detail: { id: number; room_number: string; floor: number | null };
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
}

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
