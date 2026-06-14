'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Star, Building2, ChevronRight, Heart,
  Users, BedDouble, Hotel, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types (keep identical to current — no API changes) ──────────────────────

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
  has_dates?:        boolean;
  checkIn?:          string;
  checkOut?:         string;
  guests?:           number;
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

// ─── Room chip — inside the strip ────────────────────────────────────────────

function RoomChip({
  rt,
  slug,
  checkIn,
  checkOut,
  guests,
  guestCount,
}: {
  rt:        RoomTypeStrip;
  slug:      string;
  checkIn?:  string;
  checkOut?: string;
  guests?:   number;
  guestCount: number;
}) {
  const capacityOk = !guestCount || rt.max_occupancy >= guestCount;
  const isAvail    = !rt.dates_filtered || rt.available_count > 0;
  const disabled   = !capacityOk || !isAvail;

  const href = disabled ? undefined : buildRoomUrl(slug, rt.id, checkIn, checkOut, guests);

  const chipContent = (
    <span
      className={cn(
        'flex-shrink-0 w-[130px] rounded-xl border overflow-hidden transition-all duration-200 flex flex-col',
        disabled
          ? 'opacity-40 grayscale cursor-not-allowed border-border/20 bg-muted/10'
          : 'border-border/60 hover:border-primary/70 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 bg-card cursor-pointer'
      )}
    >
      {/* Image */}
      <span className="relative h-[72px] w-full overflow-hidden bg-secondary/40 block">
        {rt.cover_image ? (
          <Image
            src={rt.cover_image}
            alt={rt.name}
            fill
            className="object-cover"
            sizes="130px"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <BedDouble className="h-6 w-6 text-muted-foreground/20" />
          </span>
        )}
        {/* Status overlay */}
        {!isAvail ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/75">
            <span className="text-[9px] font-black tracking-widest text-destructive">FULL</span>
          </span>
        ) : !capacityOk ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/75">
            <span className="text-[9px] font-black tracking-wide text-amber-500 text-center leading-tight px-1">LOW CAP</span>
          </span>
        ) : rt.available_count > 0 && rt.dates_filtered ? (
          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
            {rt.available_count} left
          </span>
        ) : null}
      </span>

      {/* Text */}
      <span className="flex flex-col gap-0.5 p-2">
        <span className="text-[12px] font-semibold leading-tight line-clamp-1">{rt.name}</span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Users className="h-2.5 w-2.5 shrink-0" />
          <span>{rt.max_occupancy}</span>
          {rt.bed_types[0] && (
            <span className="truncate ml-0.5">· {rt.bed_types[0].name}</span>
          )}
        </span>
        <span className="text-[13px] font-bold text-primary mt-0.5 leading-none">
          ৳{Number(rt.base_price).toLocaleString()}
          <span className="text-[9px] font-normal text-muted-foreground ml-0.5">/n</span>
        </span>
      </span>
    </span>
  );

  if (disabled) return chipContent;

  return (
    <Link href={href!} className="flex-shrink-0 no-underline">
      {chipContent}
    </Link>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

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
}: HotelCardProps) => {
  const dateParams = checkIn && checkOut
    ? `?check_in=${checkIn}&check_out=${checkOut}&guests=${guests || 1}`
    : '';
  const hotelUrl  = `/hotels/${slug}${dateParams}`;
  const guestNum  = guests ?? 0;

  const hasRoomStrip = has_dates && !!room_types && room_types.length > 0;
  const showRoomHint = !has_dates && !!total_room_types && total_room_types > 0;

  const availableCount = hasRoomStrip
    ? room_types!.filter(rt => rt.available_count > 0 || !rt.dates_filtered).length
    : 0;

  return (
    <article className="group flex flex-col rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-xl hover:shadow-black/20 hover:-translate-y-1 transition-all duration-400">

      {/* ── Cover image ─────────────────────────────────────────────────── */}
      <Link href={hotelUrl} className="block relative overflow-hidden bg-muted"
        style={{ height: hasRoomStrip ? '200px' : '216px' }}>
        {cover_image ? (
          <Image
            src={cover_image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            priority={false}
          />
        ) : (
          <span className="flex h-full items-center justify-center bg-secondary/50">
            <Building2 className="h-12 w-12 text-muted-foreground/20" />
          </span>
        )}

        {/* dark gradient at bottom */}
        <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Top badges */}
        <span className="absolute top-3 left-3 right-3 flex items-start justify-between">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/85 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-foreground shadow">
            {hotel_type}
          </span>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
            aria-label="Save hotel"
            className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-rose-500 transition-colors"
          >
            <Heart className="h-4 w-4" />
          </button>
        </span>

        {/* Guest rating pill */}
        {guest_rating > 0 && (
          <span className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-amber-400/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
            <Star className="h-3 w-3 fill-white text-white" />
            <span className="text-[11px] font-bold text-white">{Number(guest_rating).toFixed(1)}</span>
          </span>
        )}

        {/* City */}
        <span className="absolute bottom-3 left-3 flex items-center gap-1 text-white/90">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="text-sm font-medium drop-shadow">{city}</span>
        </span>
      </Link>

      {/* ── Hotel info ──────────────────────────────────────────────────── */}
      <Link href={hotelUrl} className="block px-5 pt-4 pb-3">
        {/* Stars */}
        {star_rating > 0 && (
          <span className="flex gap-0.5 mb-1.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-3 w-3',
                  i < Math.floor(star_rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-muted text-muted'
                )}
              />
            ))}
          </span>
        )}

        <h3 className="text-[15px] font-bold tracking-tight leading-snug line-clamp-1 group-hover:text-primary transition-colors mb-1.5">
          {name}
        </h3>

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {short_description || 'Experience a wonderful stay with premium amenities and excellent service.'}
        </p>
      </Link>

      {/* ── Room strip — dates given ─────────────────────────────────────── */}
      {hasRoomStrip && (
        <div className="mx-0 border-t border-primary/20 bg-primary/5 px-1.5 pt-3 pb-3">
          {/* Strip header */}
          <div className="flex items-center justify-between mb-2.5">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary/80">
              <BedDouble className="h-3.5 w-3.5" />
              Available Rooms
            </span>
            <span className="text-[10px] text-muted-foreground font-medium">
              {availableCount}/{room_types!.length} open
            </span>
          </div>

          {/* Horizontally scrollable chips — partial 3rd card visible as scroll hint */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mr-4 pr-4">
            {room_types!.map(rt => (
              <RoomChip
                key={rt.id}
                rt={rt}
                slug={slug}
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                guestCount={guestNum}
              />
            ))}
            {/* Scroll hint fade — only if 3+ rooms */}
            {room_types!.length >= 3 && (
              <span className="flex-shrink-0 w-4" aria-hidden />
            )}
          </div>

          {/* Scroll hint text if more than 2 room types */}
          {room_types!.length > 2 && (
            <p className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
              <ArrowRight className="h-2.5 w-2.5" />
              Scroll to see all room types
            </p>
          )}
        </div>
      )}

      {/* ── Room hint — no dates ─────────────────────────────────────────── */}
      {showRoomHint && !hasRoomStrip && (
        <div className="mx-4 mb-3 flex items-center justify-between gap-2 rounded-xl border border-dashed border-border/60 bg-secondary/20 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hotel className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            {total_room_types} room type{total_room_types! > 1 ? 's' : ''}
          </span>
          <span className="text-[11px] text-primary/80 font-medium flex items-center gap-0.5 whitespace-nowrap">
            Add dates <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      )}

      {/* ── Footer — price + CTA ─────────────────────────────────────────── */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 px-5 py-3.5">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
            Starts from
          </p>
          {starting_price ? (
            <p className="text-base font-bold text-foreground leading-none">
              ৳{Number(starting_price).toLocaleString()}
              <span className="text-xs font-normal text-muted-foreground ml-1">/ night</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground font-medium">Price unavailable</p>
          )}
        </div>

        <Link
          href={hotelUrl}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          View
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
};

export default HotelCard;