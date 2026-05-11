"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface ReservationTimerProps {
  reservedUntil: string; // ISO datetime string
}

export default function ReservationTimer({ reservedUntil }: ReservationTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    const diff = Math.floor((new Date(reservedUntil).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const isExpired = secondsLeft <= 0;

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

  return (
    <div className={`flex items-center gap-3 rounded-xl px-5 py-4 text-sm border ${
      isUrgent
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
