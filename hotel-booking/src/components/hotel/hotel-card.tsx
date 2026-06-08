'use client';

import Image from "next/image";
import Link from "next/link";
import { MapPin, Star, Building2, ChevronRight, Heart, Users, Bed, Hotel } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoomTypeStrip {
  id: number;
  name: string;
  base_price: number;
  max_occupancy: number;
  room_size: string | null;
  cover_image: string | null;
  bed_types: { name: string; count: number }[];
  available_count: number;
  dates_filtered: boolean;
}

export interface HotelCardProps {
  id: number;
  slug: string;
  name: string;
  city: string;
  hotel_type: string;
  star_rating?: number;
  guest_rating?: number;
  cover_image: string | null;
  short_description?: string;
  starting_price?: number;
  room_types?: RoomTypeStrip[];
  total_room_types?: number;
  has_dates?: boolean;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

const HotelCard = ({
  slug,
  name,
  city,
  hotel_type,
  star_rating = 0,
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
  const hotelUrl = `/hotels/${slug}${dateParams}`;

  // Show full strip only when dates are provided and API returned room types
  const hasRoomStrip = has_dates && room_types && room_types.length > 0;
  // Show count label when no dates
  const showRoomCount = !has_dates && !!total_room_types && total_room_types > 0;

  const buildRoomUrl = (roomTypeId: number) => {
    const p = new URLSearchParams();
    if (checkIn)  p.set('check_in',  checkIn);
    if (checkOut) p.set('check_out', checkOut);
    if (guests)   p.set('guests',    String(guests));
    p.set('room_type', String(roomTypeId));
    return `/hotels/${slug}?${p.toString()}`;
  };

  return (
    <div className="group relative flex flex-col rounded-3xl border border-border/50 bg-card overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1">

      {/* ── Main clickable hotel area ── */}
      <Link href={hotelUrl} className="block">

        {/* Cover image */}
        <div className="relative h-52 w-full overflow-hidden bg-muted">
          {cover_image ? (
            <Image
              src={cover_image} alt={name} fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary/50">
              <Building2 className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />

          {/* Badges */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
            <span className="inline-flex items-center rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-primary shadow-sm">
              {hotel_type}
            </span>
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); }}
              className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-red-500 transition-colors"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>

          {/* City */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center text-white">
            <MapPin className="h-4 w-4 mr-1 shrink-0" />
            <span className="text-sm font-medium truncate drop-shadow-md">{city}</span>
          </div>
        </div>

        {/* Hotel info */}
        <div className="p-5 pb-3">
          <div className="flex justify-between items-start mb-2 gap-2">
            <h3 className="text-lg font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
              {name}
            </h3>
            {guest_rating > 0 && (
              <div className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md shrink-0">
                <span className="font-bold text-sm">{Number(guest_rating).toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Stars */}
          <div className="flex items-center gap-0.5 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(star_rating) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"}`} />
            ))}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {short_description || "Experience a wonderful stay with premium amenities and excellent service."}
          </p>
        </div>
      </Link>

      {/* ── Room strip (dates given) ── */}
      {hasRoomStrip && (
        <div className="px-5 pt-3 pb-1 border-t border-border/40 mt-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Available Rooms
            </span>
            <span className="text-[11px] text-muted-foreground">
              {room_types!.filter(rt => rt.available_count > 0).length} of {room_types!.length} types open
            </span>
          </div>

          {/* Horizontally scrollable room cards */}
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {room_types!.map(rt => {
              const capacityOk = !guests || rt.max_occupancy >= (guests ?? 0);
              const roomAvail  = !rt.dates_filtered || rt.available_count > 0;
              const disabled   = !capacityOk || !roomAvail;

              return (
                <Link
                  key={rt.id}
                  href={disabled ? '#' : buildRoomUrl(rt.id)}
                  onClick={e => disabled && e.preventDefault()}
                  className={cn(
                    "flex-shrink-0 w-[108px] rounded-xl border text-left overflow-hidden transition-all duration-200 no-underline",
                    disabled
                      ? "opacity-40 grayscale cursor-not-allowed border-border/30 bg-muted/20 pointer-events-none"
                      : "border-border/50 hover:border-primary/60 hover:shadow-md hover:-translate-y-0.5 bg-card cursor-pointer"
                  )}
                >
                  {/* Room thumbnail */}
                  <div className="relative h-[60px] bg-muted overflow-hidden">
                    {rt.cover_image ? (
                      <img src={rt.cover_image} alt={rt.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Bed className="h-5 w-5 text-muted-foreground/30" />
                      </div>
                    )}
                    {!roomAvail && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <span className="text-[8px] font-black text-destructive tracking-widest">FULL</span>
                      </div>
                    )}
                    {!capacityOk && roomAvail && (
                      <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <span className="text-[8px] font-black text-amber-600 tracking-wide text-center leading-tight px-1">LOW CAP</span>
                      </div>
                    )}
                  </div>

                  {/* Room info */}
                  <div className="p-1.5">
                    <div className="text-[11px] font-semibold line-clamp-1 leading-tight">{rt.name}</div>
                    <div className="flex items-center gap-0.5 text-[9px] text-muted-foreground mt-0.5">
                      <Users className="h-2.5 w-2.5 shrink-0" />
                      <span>{rt.max_occupancy}</span>
                      {rt.bed_types[0] && (
                        <span className="ml-0.5 truncate">· {rt.bed_types[0].name}</span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-primary mt-1 leading-none">
                      ৳{Number(rt.base_price).toLocaleString()}
                    </div>
                    <div className="text-[9px] text-muted-foreground">/night</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Room count label (no dates) ── */}
      {showRoomCount && !hasRoomStrip && (
        <div className="px-5 py-3 border-t border-border/40 mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Hotel className="h-3.5 w-3.5 shrink-0" />
            <span>
              {total_room_types} room type{total_room_types! > 1 ? 's' : ''} available
              &nbsp;·&nbsp;
              <span className="text-primary/70 font-medium">Add dates to see rooms</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Price footer ── */}
      <div className="px-5 py-4 mt-auto border-t border-border/50 flex items-end justify-between">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
            Starts from
          </span>
          <div className="flex items-baseline gap-1">
            {starting_price ? (
              <>
                <span className="text-lg font-bold text-foreground">
                  ৳{Number(starting_price).toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">/ night</span>
              </>
            ) : (
              <span className="text-sm font-semibold text-muted-foreground">Price unavailable</span>
            )}
          </div>
        </div>

        <Link
          href={hotelUrl}
          className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary transition-colors group/btn"
        >
          <ChevronRight className="h-4 w-4 text-primary group-hover/btn:text-primary-foreground transition-colors" />
        </Link>
      </div>
    </div>
  );
};

export default HotelCard;
