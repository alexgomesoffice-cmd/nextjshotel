"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, Info, AlertTriangle, User, Mail } from "lucide-react";
import Link from "next/link";

interface BookingClientProps {
  bookingData: {
    hotelId: number;
    roomSelections: {
      roomTypeId: number;
      quantity: number;
    }[];
    checkIn: string;
    checkOut: string;
    guests: number;
  };
}

interface UserProfile {
  name: string;
  email: string;
  detail: {
    nid_no: string | null;
    passport: string | null;
  } | null;
}

export default function BookingClient({ bookingData }: BookingClientProps) {
  const router = useRouter();
  const [specialRequest, setSpecialRequest] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const hasValidId = !!(userProfile?.detail?.nid_no || userProfile?.detail?.passport);

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        if (res.ok && data.success) {
          setUserProfile(data.data);
        }
      } catch {
        // Profile fetch failed — user may not be logged in
      } finally {
        setProfileLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleBooking = async () => {
    if (!hasValidId) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/bookings/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotel_id: bookingData.hotelId,
          room_selections: bookingData.roomSelections.map(selection => ({
            room_type_id: selection.roomTypeId,
            quantity: selection.quantity,
          })),
          check_in: bookingData.checkIn,
          check_out: bookingData.checkOut,
          guests: bookingData.guests,
          special_request: specialRequest,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Something went wrong while booking.");
      }

      // Redirect to booking detail page — NOT /profile
      router.push(`/bookings/${data.data.booking_reference}`);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User info card */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Guest Details</h2>
        {profileLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile...
          </div>
        ) : userProfile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{userProfile.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">{userProfile.email}</span>
            </div>

            {/* NID/Passport warning */}
            {!hasValidId && (
              <div className="mt-4 flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl px-4 py-3 text-sm">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">NID or Passport required</p>
                  <p className="text-amber-700 dark:text-amber-400">
                    Please add your NID or Passport number to your profile before completing this booking.
                  </p>
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1 mt-2 text-primary font-medium hover:underline"
                  >
                    Go to Profile →
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Unable to load your profile. Please try refreshing.</p>
        )}
      </div>

      {/* Good to know */}
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

      {/* Special requests */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-4">Special Requests</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Special requests cannot be guaranteed – but the property will do its best to meet your needs.
        </p>
        <Textarea
          placeholder="Please write your requests in English or Bengali. (e.g. Quiet room, high floor, airport transfer)"
          className="min-h-30 resize-y"
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
          disabled={isSubmitting || profileLoading || !hasValidId}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Confirming Reservation...
            </>
          ) : !hasValidId ? (
            "NID/Passport Required"
          ) : (
            "Confirm Reservation"
          )}
        </Button>
      </div>
      
      <p className="text-xs text-center text-muted-foreground mt-4">
        By clicking &quot;Confirm Reservation&quot;, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}
