"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, Info } from "lucide-react";

interface BookingClientProps {
  bookingData: {
    hotelId: number;
    roomTypeId: number;
    checkIn: string;
    checkOut: string;
    guests: number;
    quantity: number;
  };
}

export default function BookingClient({ bookingData }: BookingClientProps) {
  const router = useRouter();
  const [specialRequest, setSpecialRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBooking = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: bookingData.hotelId,
          room_type_id: bookingData.roomTypeId,
          check_in: bookingData.checkIn,
          check_out: bookingData.checkOut,
          guests: bookingData.guests,
          quantity: bookingData.quantity,
          special_request: specialRequest,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Something went wrong while booking.");
      }

      // On success, redirect to success/confirmation page.
      // For now, redirect to a simple success page or user bookings dashboard if it exists
      // Let's assume there is a /profile/bookings route, otherwise redirect to home with success message
      router.push(`/profile?booking_success=${data.data.booking_reference}`);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Good to know:</h2>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
            <span>
              <strong>Secure Booking.</strong> Your details are protected by industry-standard encryption.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Info className="h-5 w-5 text-primary shrink-0" />
            <span>
              <strong>Payment.</strong> You will pay directly at the hotel upon arrival, or via a secure payment link sent to your email.
            </span>
          </li>
        </ul>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Special Requests</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Special requests cannot be guaranteed – but the property will do its best to meet your needs.
        </p>
        <Textarea
          placeholder="Please write your requests in English or Bengali. (e.g. Quiet room, high floor, airport transfer)"
          className="min-h-[120px] resize-y"
          value={specialRequest}
          onChange={(e) => setSpecialRequest(e.target.value)}
        />
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          className="w-full sm:w-auto text-lg h-14 px-10 rounded-xl"
          onClick={handleBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Confirming Reservation...
            </>
          ) : (
            "Complete Booking"
          )}
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground mt-4">
        By clicking "Complete Booking", you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
