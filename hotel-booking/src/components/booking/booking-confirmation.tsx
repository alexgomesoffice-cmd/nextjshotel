"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Hotel, Clock, BedDouble, CheckCircle2, XCircle, AlertCircle,
  Users, Info, MapPin, Mail, UserRound, ArrowLeft,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useBookingStatus } from "@/hooks/use-booking-status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatBDT } from "@/lib/utils";
import ReservationTimer from "@/components/booking/reservation-timer";
import { differenceInCalendarDays, format } from "date-fns";

interface NightlyRate {
  stay_date: string;
  price: number | string;
  pricing_rule_name: string | null;
}

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
  nightly_rates: NightlyRate[];
}

interface GroupedRoom {
  room_type: RoomBooking["room_type"];
  room_variant: RoomBooking["room_variant"];
  quantity: number;
  subtotal: number;
  nightly_rates: NightlyRate[];
}

interface NightlyRateGroup {
  startDate: string;
  endDate: string;
  nights: number;
  price: number;
  pricing_rule_name: string | null;
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

function groupNightlyRates(rates: NightlyRate[]): NightlyRateGroup[] {
  return rates.reduce<NightlyRateGroup[]>((groups, rate) => {
    const previous = groups[groups.length - 1];
    const isConsecutive = previous
      && differenceInCalendarDays(new Date(rate.stay_date), new Date(previous.endDate)) === 1;

    if (
      previous
      && isConsecutive
      && previous.price === Number(rate.price)
      && previous.pricing_rule_name === rate.pricing_rule_name
    ) {
      previous.endDate = rate.stay_date;
      previous.nights += 1;
    } else {
      groups.push({
        startDate: rate.stay_date,
        endDate: rate.stay_date,
        nights: 1,
        price: Number(rate.price),
        pricing_rule_name: rate.pricing_rule_name,
      });
    }

    return groups;
  }, []);
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
    booking.room_bookings.reduce<Record<string, GroupedRoom>>((acc, rb) => {
      const key = `${rb.room_type.id}-${rb.room_variant.id}`;
      if (!acc[key]) {
        acc[key] = {
          room_type: rb.room_type,
          room_variant: rb.room_variant,
          quantity: 0,
          subtotal: 0,
          nightly_rates: rb.nightly_rates,
        };
      }
      acc[key].quantity += 1;
      acc[key].subtotal += Number(rb.subtotal);
      return acc;
    }, {})
  );

  return (
    <div className="min-h-screen bg-muted/30 pb-16 pt-24 sm:pb-20">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mb-7">
          <Link
            href="/bookings"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Bookings
          </Link>
          <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Your stay
              </p>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Reservation {isReserved ? "held" : "confirmation"}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {isReserved && reservedUntilFuture
                  ? "Your room is temporarily held for you."
                  : "Review the details of your reservation."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-lg border border-border/70 bg-card px-3.5 py-2 text-sm">
                <span className="mr-2 text-muted-foreground">Reference</span>
                <span className="font-mono font-semibold tracking-wide">{booking.booking_reference}</span>
              </div>
              <Badge variant="outline" className={`${sc.color} gap-1.5 px-3 py-2 text-xs font-semibold`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {sc.label}
              </Badge>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
          <main className="min-w-0 space-y-6">
            <Card className="gap-0 overflow-hidden rounded-2xl border border-border/70 bg-card p-0 shadow-sm ring-0">
              <div className="flex flex-col sm:flex-row">
                <div className="relative h-48 shrink-0 bg-muted sm:h-44 sm:w-56">
                  {booking.hotel.images[0] ? (
                    <Image
                      src={booking.hotel.images[0].image_url}
                      alt={booking.hotel.name}
                      fill
                      sizes="(max-width: 640px) 100vw, 224px"
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <Hotel className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-center p-5 sm:p-7">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    You are staying at
                  </p>
                  <h2 className="text-2xl font-bold tracking-tight">{booking.hotel.name}</h2>
                  {booking.hotel.city && (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {booking.hotel.city.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 border-t border-border/70 sm:grid-cols-4">
                <div className="border-b border-r border-border/70 p-4 sm:border-b-0">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Check-in</p>
                  <p className="font-semibold">{format(checkInDate, "EEE, MMM d, yyyy")}</p>
                </div>
                <div className="border-b border-border/70 p-4 sm:border-b-0 sm:border-r">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Check-out</p>
                  <p className="font-semibold">{format(checkOutDate, "EEE, MMM d, yyyy")}</p>
                </div>
                <div className="border-r border-border/70 p-4">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Length of stay</p>
                  <p className="font-semibold">{nightCount} night{nightCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="p-4">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Guests</p>
                  <p className="font-semibold">{booking.guests} guest{booking.guests !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </Card>

            <section aria-labelledby="room-selection-heading" className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your accommodation</p>
                  <h2 id="room-selection-heading" className="mt-1 text-xl font-bold tracking-tight">Room selection</h2>
                </div>
                <span className="text-sm text-muted-foreground">
                  {booking.rooms_count} room{booking.rooms_count !== 1 ? "s" : ""}
                </span>
              </div>
              {groupedRooms.map((group) => {
                const coverImage = group.room_variant.variant_images.find((image) => image.is_cover)
                  ?? group.room_variant.variant_images[0];
                return (
                  <Card key={`${group.room_type.id}-${group.room_variant.id}`} className="gap-0 overflow-hidden rounded-2xl border border-border/70 p-0 shadow-sm ring-0">
                    <div className="flex flex-col sm:flex-row">
                      <div className="relative h-48 shrink-0 bg-muted sm:h-auto sm:min-h-52 sm:w-56">
                        {coverImage ? (
                          <Image
                            src={coverImage.image_url}
                            alt={`${group.room_type.name}${group.room_variant.room_size ? `, ${group.room_variant.room_size}` : ""}`}
                            fill
                            sizes="(max-width: 640px) 100vw, 224px"
                            className="object-cover"
                          />
                        ) : (
                          <BedDouble className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 p-5 sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Room type</p>
                            <h3 className="text-xl font-bold tracking-tight">{group.room_type.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Room variant · {group.room_variant.room_size || `Variant #${group.room_variant.id}`}
                            </p>
                          </div>
                          <Badge variant="secondary" className="px-3 py-1.5 font-semibold">
                            {group.quantity} room{group.quantity !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                        <div className="my-5 h-px bg-border/70" />
                        <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
                          {group.room_variant.bed_types.length > 0 && (
                            <div className="flex items-center gap-2">
                              <BedDouble className="h-4 w-4 text-primary" />
                              <span>{group.room_variant.bed_types.map((bed) => `${bed.count} × ${bed.bed_type.name}`).join(", ")}</span>
                            </div>
                          )}
                          {group.room_variant.max_occupancy && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span>Up to {group.room_variant.max_occupancy} guest{group.room_variant.max_occupancy !== 1 ? "s" : ""}</span>
                            </div>
                          )}
                        </div>
                        {group.room_variant.facilities.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {group.room_variant.facilities.map(({ facility }) => (
                              <span key={facility.name} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                {facility.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </section>

            <section aria-labelledby="guest-details-heading">
              <Card className="gap-0 rounded-2xl border border-border/70 p-5 shadow-sm ring-0 sm:p-6">
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Who is checking in</p>
                  <h2 id="guest-details-heading" className="mt-1 text-xl font-bold tracking-tight">Guest details</h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-primary">
                      <UserRound className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Lead guest</p>
                      <p className="mt-0.5 font-semibold">{booking.end_user.name}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                      <Mail className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground">Email address</p>
                      <p className="mt-0.5 break-all font-medium">{booking.end_user.email}</p>
                    </div>
                  </div>
                </div>
                {booking.special_request && (
                  <div className="mt-5 border-t border-border/70 pt-4">
                    <p className="mb-1 text-sm font-semibold">Special request</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{booking.special_request}</p>
                  </div>
                )}
              </Card>
            </section>

            <section aria-labelledby="price-breakdown-heading">
              <Card className="gap-0 rounded-2xl border border-border/70 p-5 shadow-sm ring-0 sm:p-6">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your total stay cost</p>
                    <h2 id="price-breakdown-heading" className="mt-1 text-xl font-bold tracking-tight">Price breakdown</h2>
                  </div>
                  <span className="text-right text-sm text-muted-foreground">{nightCount} night{nightCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-border/70">
                  {groupedRooms.map((group) => (
                    <div key={`${group.room_type.id}-${group.room_variant.id}`} className="py-4 first:pt-0 last:pb-0">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{group.room_type.name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {group.quantity} room{group.quantity !== 1 ? "s" : ""}
                            {group.room_variant.room_size ? ` · ${group.room_variant.room_size}` : ""}
                          </p>
                        </div>
                        <p className="font-semibold tabular-nums">{formatBDT(group.subtotal)}</p>
                      </div>
                      <div className="space-y-2.5 rounded-xl bg-muted/50 px-3.5 py-3">
                        {groupNightlyRates(group.nightly_rates).map((rate, index) => {
                          const isRange = rate.startDate !== rate.endDate;
                          return (
                            <div key={`${rate.startDate}-${rate.price}-${index}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                                <span className="font-medium text-foreground">
                                  {format(new Date(rate.startDate), "MMM d")}
                                  {isRange && ` - ${format(new Date(rate.endDate), "MMM d")}`}
                                </span>
                                <span>{rate.nights} night{rate.nights !== 1 ? "s" : ""}</span>
                                {rate.pricing_rule_name && (
                                  <Badge variant="outline" className="h-5 border-primary/20 bg-primary/5 px-1.5 text-[10px] text-primary">
                                    {rate.pricing_rule_name}
                                  </Badge>
                                )}
                              </div>
                              <span className="shrink-0 text-muted-foreground">
                                {formatBDT(rate.price)} <span className="text-xs">per room / night</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-border/70 pt-4">
                  <span className="font-semibold">Total amount</span>
                  <span className="text-lg font-bold tabular-nums">{formatBDT(Number(booking.total_price))}</span>
                </div>
                <p className="mt-1 text-right text-xs text-muted-foreground">Taxes and fees included</p>
              </Card>
            </section>
          </main>

          <aside aria-labelledby="reservation-summary-heading" className="lg:sticky lg:top-24">
            <Card className="gap-0 overflow-hidden rounded-2xl border border-primary/20 p-0 shadow-lg ring-0">
              <div className="bg-primary/5 p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Next step</p>
                    <h2 id="reservation-summary-heading" className="mt-1 text-xl font-bold tracking-tight">Reservation summary</h2>
                  </div>
                  <Badge variant="outline" className={`${sc.color} shrink-0 gap-1.5 px-2.5 py-1.5 font-semibold`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                    {sc.label}
                  </Badge>
                </div>
                {reservedUntilFuture ? (
                  <div>
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Time remaining
                    </p>
                    <ReservationTimer reservedUntil={booking.reserved_until!} reference={booking.booking_reference} />
                  </div>
                ) : effectiveStatus === "EXPIRED" ? (
                  <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
                    This reservation has expired and the rooms have been released.
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Your booking is secured.
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6">
                <div className="mb-5 space-y-3 border-b border-border/70 pb-5 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Check-in</span>
                    <span className="text-right font-medium">{format(checkInDate, "EEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Check-out</span>
                    <span className="text-right font-medium">{format(checkOutDate, "EEE, MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">Rooms and guests</span>
                    <span className="text-right font-medium">
                      {booking.rooms_count} room{booking.rooms_count !== 1 ? "s" : ""} · {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="mb-5 flex items-end justify-between gap-3">
                  <div>
                    <p className="font-semibold">Total amount</p>
                    <p className="mt-1 text-xs text-muted-foreground">Taxes and fees included</p>
                  </div>
                  <span className="text-2xl font-bold tracking-tight tabular-nums">
                    {formatBDT(Number(booking.total_price))}
                  </span>
                </div>

                {isReserved && reservedUntilFuture && (
                  <div className="space-y-3">
                    {confirmError && (
                      <div role="alert" className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p>{confirmError}</p>
                      </div>
                    )}
                    <Button
                      className="h-12 w-full text-base font-semibold shadow-sm"
                      onClick={confirmBooking}
                      disabled={confirming}
                    >
                      {confirming ? "Confirming..." : "Confirm reservation"}
                    </Button>
                    <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
                      By confirming, you agree to the hotel&apos;s policies and terms of service.
                    </p>
                  </div>
                )}
                <div className="mt-5 flex items-start gap-2 border-t border-border/70 pt-4 text-xs leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>Payment is handled directly with the hotel upon arrival.</p>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
