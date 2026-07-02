'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Star, Building2, Heart,
  Users, BedDouble, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoomTypeStrip {
  id:              number;
  name:            string;
  base_price:      number;
  max_occupancy:   number;
  room_size:       string | null;
  cover_image:     string | null;
  bed_types:       { name: string; count: number }[];
  available_count: number;
  dates_filtered:  boolean;
}

export interface HotelCardProps {
  id:                number;
  slug:              string;
  name:              string;
  city:              string;
  hotel_type:        string;
  star_rating?:      number;
  guest_rating?:     number;
  cover_image:       string | null;
  short_description?: string;
  starting_price?:   number;
  room_types?:       RoomTypeStrip[];
  total_room_types?: number;
  amenities?:        string[];
  has_dates?:        boolean;
  checkIn?:          string;
  checkOut?:         string;
  guests?:           number;
  roomListMaxHeight?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildRoomUrl(slug: string, roomTypeId: number, checkIn?: string, checkOut?: string, guests?: number) {
  const p = new URLSearchParams();
  if (checkIn)  p.set('check_in',  checkIn);
  if (checkOut) p.set('check_out', checkOut);
  if (guests)   p.set('guests',    String(guests));
  p.set('room_type', String(roomTypeId));
  return `/hotels/${slug}?${p.toString()}#available-rooms`;
}

// ─── Premium Styled Room Row Component ──────────────────────────────────────

function RoomRow({
  rt,
  slug,
  checkIn,
  checkOut,
  guests,
  guestCount,
}: {
  rt:         RoomTypeStrip;
  slug:       string;
  checkIn?:   string;
  checkOut?:  string;
  guests?:    number;
  guestCount: number;
}) {
  const capacityOk = !guestCount || rt.max_occupancy >= guestCount;
  const isAvail    = !rt.dates_filtered || rt.available_count > 0;
  const disabled   = !capacityOk || !isAvail;

  const href = disabled ? undefined : buildRoomUrl(slug, rt.id, checkIn, checkOut, guests);

  const rowContent = (
    <div
      className={cn(
        "group/row flex gap-3 p-3 transition-colors bg-card relative z-10 ",
        disabled
          ? "opacity-40 grayscale bg-muted/10 cursor-not-allowed"
          : "hover:bg-muted/30"
      )}
    >
      {/* Room Image Container */}
      <div className="relative h-[88px] w-[140px] shrink-0 overflow-hidden rounded-lg bg-secondary/40">
        {rt.cover_image ? (
          <Image
            src={rt.cover_image}
            alt={rt.name}
            fill
            className="object-cover transition-transform duration-500 group-hover/row:scale-105"
            sizes="110px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <BedDouble className="h-6 w-6 text-muted-foreground/20" />
          </div>
        )}

        {/* Status Badges Overlay */}
        {!isAvail ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/75">
            <span className="text-[9px] font-black tracking-widest text-destructive">FULL</span>
          </div>
        ) : !capacityOk ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/75">
            <span className="text-[9px] font-black tracking-wide text-amber-500 text-center leading-tight px-1">Doesnt fit guest count</span>
          </div>
        ) : rt.available_count > 0 && rt.dates_filtered ? (
          <div className="absolute bottom-1.5 left-1.5 rounded bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white linen-none">
            {rt.available_count} left
          </div>
        ) : null}
      </div>

      {/* Room Meta Information */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-[13.5px] font-semibold leading-tight text-foreground group-hover/row:text-primary transition-colors">
              {rt.name}
            </h4>
            <div className="text-right shrink-0">
              <p className="text-[15px] font-bold leading-none tracking-tight text-foreground">
                TK {Number(rt.base_price).toLocaleString()}
              </p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">night</p>
            </div>
          </div>

          <div className="mt-1 flex items-center gap-2.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <BedDouble className="size-3" />
              {rt.bed_types[0] ? rt.bed_types[0].name : "Standard Bed"}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {rt.max_occupancy} Guests
            </span>
            {rt.room_size && <span>{rt.room_size}</span>}
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap gap-1">
            {isAvail && capacityOk && (
              <span className="rounded-md bg-green-500/10 text-green-600 px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wide dark:bg-green-500/20 dark:text-green-400">
                Available
              </span>
            )}
          </div>

          {!disabled && (
            <span className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground transition hover:bg-primary/90 shadow-sm">
              Book
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (disabled) return rowContent;

  return (
    <Link href={href!} className="block no-underline relative z-20">
      {rowContent}
    </Link>
  );
}

// ─── Main Premium Hotel Card Component ───────────────────────────────────────

const HotelCard = ({
  slug,
  name,
  city,
  hotel_type,
  star_rating  = 0,
  guest_rating = 0,
  cover_image,
  short_description,
  starting_price,
  room_types,
  total_room_types,
  has_dates,
  checkIn,
  checkOut,
  guests,
  amenities,
  roomListMaxHeight,
}: HotelCardProps) => {
  const dateParams = checkIn && checkOut
    ? `?check_in=${checkIn}&check_out=${checkOut}&guests=${guests || 1}`
    : '';
  const hotelUrl  = `/hotels/${slug}${dateParams}`;
  const guestNum  = guests ?? 0;

  const hasRoomStrip = !!room_types && room_types.length > 0;
  const showRoomHint = !has_dates && !!total_room_types && total_room_types > 0;

  const availableCount = hasRoomStrip
  ? room_types!.filter(rt => !rt.dates_filtered || rt.available_count > 0).length
  : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-400 hover:shadow-xl hover:-translate-y-1">
      
      {/* ── HOTEL SHOWCASE FRAME ─────────────────────────────────────────── */}
      <div className="relative flex flex-col">
        <Link href={hotelUrl} className="block relative h-72 overflow-hidden bg-muted z-10">
          {cover_image ? (
            <Image
              src={cover_image}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              priority={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-secondary/50">
              <Building2 className="h-12 w-12 text-muted-foreground/20" />
            </div>
          )}
          
          {/* Vignette Gradient Layer */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />

          {/* Top row actions & tags */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 z-20">
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] uppercase font-semibold tracking-[0.12em] text-foreground backdrop-blur">
              {hotel_type}
            </span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); }}
              type="button"
              aria-label="Save hotel"
              className="grid size-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition hover:bg-white/30"
            >
              <Heart className="size-4" />
            </button>
          </div>

          {/* Bottom Info Overlay */}
          <div className="absolute inset-x-0 bottom-0 p-5 text-white z-20">
            <div className="mb-2 flex items-center gap-1.5 text-[11px]">
              {guest_rating > 0 && (
                <span className="flex items-center gap-1 rounded-md bg-white/95 px-1.5 py-0.5 text-foreground">
                  <Star className="size-3 fill-amber-500 text-amber-500" />
                  <span className="font-semibold">{Number(guest_rating).toFixed(1)}</span>
                </span>
              )}
              {star_rating > 0 && (
                <span className="font-medium flex items-center text-amber-300">
                  {star_rating} ★ Rating
                </span>
              )}
            </div>

            <h3 className="text-2xl font-bold leading-tight tracking-tight line-clamp-2 ">
              {name}
            </h3>

            <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-white/85">
              <MapPin className="size-3.5 text-white/70" />
              <span>{city}</span>
              <span className="text-white/40">·</span>
              <span className="truncate max-w-[200px] text-white/80">
                {short_description}
              </span>
            </div>

            {/* Embedded Footer Pricing Block */}
            <div className="mt-4 flex items-end justify-between border-t border-white/15 pt-3">
              <div className="text-left flex items-center gap-3">
                {amenities && amenities.length > 0 ? (
                  <div className="flex items-center gap-2">
                    {amenities.slice(0,3).map((a, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 bg-white/10 rounded text-white/90">{a}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">No amenities info</p>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/60">From</p>
                {starting_price ? (
                  <p className="text-xl font-bold leading-none">
                    TK {Number(starting_price).toLocaleString()}
                    <span className="ml-0.5 text-[10px] tracking-wide text-white/70">/nt</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-white/70">N/A</p>
                )}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── ROOMS VERTICAL SEGMENT ─────────────────────────────────────────── */}
      {hasRoomStrip && (
        <div className="flex min-w-0 flex-col bg-card border-t border-border/60 relative z-20">
          <header className="flex items-center justify-between border-b border-border/60 px-5 py-3 bg-muted/20">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Available rooms
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                {has_dates
  ? `${availableCount}/${room_types!.length} room type open`
  : `${room_types!.length} room type${room_types!.length !== 1 ? 's' : ''} available`
}
              </p>
            </div>
            <Link 
              href={hotelUrl} 
              className="flex items-center gap-1 text-[11px] font-medium text-foreground hover:text-primary transition-colors"
            >
              View hotel <ArrowUpRight className="size-3.5" />
            </Link>
          </header>

          {/* List Wrapper — fixed height so all cards are equal */}
          <div
            className={cn(
              "divide-y divide-border/60 overflow-y-auto bg-card custom-scrollbar [&::-webkit-scrollbar-thumb]:opacity-0 hover:[&::-webkit-scrollbar-thumb]:opacity-100",
              roomListMaxHeight || "h-[228px]"
            )}
            data-lenis-prevent={room_types!.length >= 3 ? "" : undefined}
            data-lenis-prevent-wheel={room_types!.length >= 3 ? "" : undefined}
            data-lenis-prevent-touch={room_types!.length >= 3 ? "" : undefined}
          >
            {[...room_types!]
              .sort((a, b) => {
                const aCapacityOk = !guestNum || a.max_occupancy >= guestNum;
                const aAvail = !a.dates_filtered || a.available_count > 0;
                const aDisabled = !aCapacityOk || !aAvail;

                const bCapacityOk = !guestNum || b.max_occupancy >= guestNum;
                const bAvail = !b.dates_filtered || b.available_count > 0;
                const bDisabled = !bCapacityOk || !bAvail;

                if (aDisabled === bDisabled) return 0;
                return aDisabled ? 1 : -1;
              })
              .map(rt => (
              <RoomRow
                key={rt.id}
                rt={rt}
                slug={slug}
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                guestCount={guestNum}
              />
            ))}
          </div>

        </div>
      )}
    </article>
  );
};

export default HotelCard;