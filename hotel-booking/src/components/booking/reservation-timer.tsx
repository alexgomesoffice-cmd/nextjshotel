"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useBookingStatus } from "@/hooks/use-booking-status";

interface ReservationTimerProps {
  reservedUntil: string; // ISO datetime string
  reference: string;     // The booking reference code
}

export default function ReservationTimer({ reservedUntil, reference }: ReservationTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = Math.floor((new Date(reservedUntil).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const expiryRequestedRef = useRef(false);

  const liveStatus = useBookingStatus(reference, "RESERVED");

  // Force expired if socket says it's expired or cancelled, or local timer hits 0
  const isExpired = secondsLeft <= 0 || liveStatus === "EXPIRED" || liveStatus === "CANCELLED";
  const isConfirmed = liveStatus === "BOOKED";

  useEffect(() => {
    expiryRequestedRef.current = false;
  }, [reference, reservedUntil]);

  useEffect(() => {
    if (isExpired) return;

    const interval = setInterval(() => {
      const diff = Math.floor((new Date(reservedUntil).getTime() - Date.now()) / 1000);
      const remaining = Math.max(0, diff);
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [reservedUntil, isExpired]);

  useEffect(() => {
    if (secondsLeft > 0 || expiryRequestedRef.current) return;
    if (liveStatus !== "RESERVED") return;

    expiryRequestedRef.current = true;

    void fetch(`/api/bookings/${reference}/expire`, {
      method: "POST",
      credentials: "include",
    }).catch((error) => {
      console.error("Failed to expire reservation", error);
    });
  }, [secondsLeft, liveStatus, reference]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const isUrgent = secondsLeft <= 120 && secondsLeft > 0; // under 2 min

  if (isExpired) {
    return (
      <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl px-5 py-4 text-sm">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="font-semibold text-destructive">Your reservation has expired</p>
          <p className="text-destructive/80 mt-0.5">The rooms have been released. Please make a new reservation.</p>
        </div>
      </div>
    );
  }

  if (isConfirmed) {
    return (
      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-4 text-sm">
        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
        <div>
          <p className="font-semibold text-green-700 dark:text-green-400">Reservation Confirmed</p>
          <p className="text-green-600/80 dark:text-green-400/80 mt-0.5">Your booking is secured.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl px-5 py-4 text-sm border ${isUrgent
        ? "bg-destructive/10 border-destructive/30"
        : "bg-amber-500/10 border-amber-500/30"
      }`}>
      <Clock className={`h-5 w-5 shrink-0 ${isUrgent ? "text-destructive" : "text-amber-600 dark:text-amber-400"}`} />
      <div className="flex-1">
        <p className={`font-semibold ${isUrgent ? "text-destructive" : "text-amber-800 dark:text-amber-300"}`}>
          Complete your booking in {timeStr}
        </p>
        <p className={`mt-0.5 ${isUrgent ? "text-destructive/80" : "text-amber-700 dark:text-amber-400"}`}>
          Your rooms are held for a limited time. After expiry, they will be released.
        </p>
      </div>
      <span className={`font-mono font-bold text-2xl tabular-nums ${isUrgent ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>
        {timeStr}
      </span>
    </div>
  );
}
