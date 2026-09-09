'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  MapPin, Star, Building2,
  Users, BedDouble, ArrowUpRight,
  CheckCircle2, AlertTriangle, Info,
} from 'lucide-react';
import { cn, formatDiscountLabel } from '@/lib/utils';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import FavoriteButton from './favorite-button';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RoomTypeStrip {
  id:              number;
  name:            string;
  base_price:      number | null;
  effective_price?: number | null;
  discount?: {
    ruleId: number;
    name: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT';
    value: number;
    amount: number;
  } | null;
  max_occupancy:   number;
  room_size:       string | null;
  cover_image:     string | null;
  bed_types:       { name: string; count: number }[];
  available_count: number;
  dates_filtered:  boolean;
  favoritePage?:      boolean;
}

export interface AccommodationContext {
  requestedGuests:          number;
  requestedRooms:           number | null;
  matchType:                'PRIMARY' | 'SUGGESTED' | 'ALTERNATIVE';
  minimumRoomsRequired:     number | null;
  canAccommodateGuests:     boolean;
  withinRequestedRoomLimit: boolean;
  suggestedMessage:         string;
}

export interface HotelListImage {
  id: number;
  image_url: string;
  is_cover?: boolean;
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
  images?:           HotelListImage[] | null;
  address?:          string;
  starting_price?:   number;
  starting_discount?: RoomTypeStrip['discount'];
  room_types?:       RoomTypeStrip[];
  total_room_types?: number;
  amenities?:        string[];
  has_dates?:        boolean;
  checkIn?:          string;
  checkOut?:         string;
  guests?:           number;
  rooms?:            number;
  roomListMaxHeight?: string;
  minPrice?:         number;
  maxPrice?:         number;
  /** Populated by the capacity engine when a guests param was supplied. */
  accommodation?:    AccommodationContext | null;
  isFavorited?:      boolean;
  favoritePage?:      boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildHotelQuery(checkIn?: string, checkOut?: string, guests?: number, rooms?: number) {
  const p = new URLSearchParams();
  if (checkIn)  p.set('check_in',  checkIn);
  if (checkOut) p.set('check_out', checkOut);
  if (guests && guests > 0) p.set('guests', String(guests));
  if (rooms && rooms > 0)   p.set('rooms', String(rooms));
  return p;
}

function buildRoomUrl(slug: string, roomTypeId: number, checkIn?: string, checkOut?: string, guests?: number, rooms?: number) {
  const p = buildHotelQuery(checkIn, checkOut, guests, rooms);
  p.set('room_type', String(roomTypeId));
  return `/hotels/${slug}?${p.toString()}#available-rooms`;
}

function getDisplayPrice(basePrice?: number | null, effectivePrice?: number | null) {
  if (typeof effectivePrice === 'number' && Number.isFinite(effectivePrice)) return effectivePrice;
  if (typeof basePrice === 'number' && Number.isFinite(basePrice)) return basePrice;
  return 0;
}

function renderStarIcons(starRating?: number) {
  const sanitizedRating = typeof starRating === 'number' && Number.isFinite(starRating)
    ? Math.max(0, Math.min(5, Math.round(starRating)))
    : 0;

  return Array.from({ length: sanitizedRating }, (_, index) => (
    <Star key={`star-${index}`} className="size-3 fill-amber-400 text-amber-400" />
  ));
}

// ─── Accommodation Badge ──────────────────────────────────────────────────────

function AccommodationBadge({ ctx }: { ctx: AccommodationContext }) {
  if (ctx.matchType === 'PRIMARY') {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 px-2 py-0.5 text-[10px] font-semibold">
          <CheckCircle2 className="size-3 shrink-0" />
          Fits your search
        </span>
        <span className="text-[10px] text-muted-foreground">
          {ctx.requestedGuests} guest{ctx.requestedGuests !== 1 ? 's' : ''}
          {ctx.requestedRooms !== null ? ` · up to ${ctx.requestedRooms} room${ctx.requestedRooms !== 1 ? 's' : ''}` : ''}
          {ctx.minimumRoomsRequired !== null ? ` · ${ctx.minimumRoomsRequired} needed` : ''}
        </span>
      </div>
    );
  }

  if (ctx.matchType === 'SUGGESTED') {
    return (
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
          <AlertTriangle className="size-3 shrink-0" />
          Requires {ctx.minimumRoomsRequired} room{ctx.minimumRoomsRequired !== 1 ? 's' : ''} instead of {ctx.requestedRooms}
        </span>
        
      </div>
    );
  }

  // ALTERNATIVE
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="inline-flex items-center gap-1 rounded-md bg-muted text-muted-foreground px-2 py-0.5 text-[10px] font-semibold">
        <Info className="size-3 shrink-0" />
        Partial capacity
      </span>
      <span className="text-[10px] text-muted-foreground truncate">
        {ctx.suggestedMessage}
      </span>
    </div>
  );
}

// ─── Premium Styled Room Row Component ──────────────────────────────────────

function CompactRoomRow({
  rt,
  slug,
  checkIn,
  checkOut,
  guests,
  rooms,
}: {
  rt:         RoomTypeStrip;
  slug:       string;
  checkIn?:   string;
  checkOut?:  string;
  guests?:    number;
  rooms?:      number;
}) {
  const isAvail = !rt.dates_filtered || rt.available_count > 0;
  const displayPrice = getDisplayPrice(rt.base_price, rt.effective_price);
  const hasDiscount = Boolean(rt.discount && rt.discount.amount > 0);
  const href = isAvail ? buildRoomUrl(slug, rt.id, checkIn, checkOut, guests, rooms) : undefined;

  const rowContent = (
    <div
      className={cn(
        "flex items-center justify-between gap-1 rounded-md border border-border/60 bg-muted/20 px-1.5 py-1 transition-colors leading-none",
        isAvail ? "hover:bg-muted/30" : "opacity-50"
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-normal leading-tight text-foreground">{rt.name}</p>
        {hasDiscount && rt.discount && (
          <p className="mt-0.5 text-[7px] font-medium leading-tight text-primary">{formatDiscountLabel(rt.discount)}</p>
        )}
      </div>

      <div className="shrink-0 text-right">
        {hasDiscount && rt.base_price && (
          <p className="text-[7px] text-muted-foreground line-through">BDT {Number(rt.base_price).toLocaleString()}</p>
        )}
        <p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">From</p>
        <p className="text-[9px] font-normal leading-tight text-foreground">BDT {displayPrice.toLocaleString()}</p>
      </div>
    </div>
  );

  if (!isAvail) return rowContent;

  return <Link href={href!} className="block no-underline">{rowContent}</Link>;
}

export function RoomRow({
  rt,
  slug,
  checkIn,
  checkOut,
  guests,
  rooms,
}: {
  rt:         RoomTypeStrip;
  slug:       string;
  checkIn?:   string;
  checkOut?:  string;
  guests?:    number;
  rooms?:      number;
}) {
  const isAvail    = !rt.dates_filtered || rt.available_count > 0;
  const disabled   = !isAvail;
  const displayPrice = getDisplayPrice(rt.base_price, rt.effective_price);
  const hasDiscount = Boolean(rt.discount && rt.discount.amount > 0);

  const href = disabled ? undefined : buildRoomUrl(slug, rt.id, checkIn, checkOut, guests, rooms);

  const rowContent = (
    <div
      className={cn(
        "group/row flex gap-2 p-2 transition-colors bg-card relative z-10 sm:gap-3 sm:p-3 lg:gap-3 lg:p-3",
        disabled
          ? "opacity-40 grayscale bg-muted/10 cursor-not-allowed"
          : "hover:bg-muted/30"
      )}
    >
      {/* Room Image Container */}
      <div className="relative h-[72px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-secondary/40 sm:h-20 sm:w-[108px] lg:h-[88px] lg:w-[140px]">
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
        ) : rt.available_count > 0 && rt.dates_filtered ? (
          <div className="absolute bottom-1.5 left-1.5 rounded bg-green-500 px-1.5 py-0.5 text-[9px] font-bold text-white linen-none">
            {rt.available_count} left
          </div>
        ) : null}
      </div>

      {/* Room Meta Information */}
      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-1.5 sm:gap-2">
            <h4 className="min-w-0 flex-1 line-clamp-2 text-[11px] sm:text-[13px] lg:text-[13.5px] font-semibold leading-tight text-foreground group-hover/row:text-primary transition-colors">
              {rt.name}
            </h4>
            <div className="w-[128px] shrink-0 text-right sm:w-[148px] lg:w-auto">
  {hasDiscount && (
    <p className="text-[9px] text-muted-foreground line-through sm:text-[10px] lg:text-[10px]">
      BDT {Number(rt.base_price).toLocaleString()}
    </p>
  )}

  <div className="flex items-center justify-end gap-1 lg:gap-2">
    {hasDiscount && rt.discount && (
      <span className="max-w-[72px] text-left text-[8px] font-semibold leading-tight text-primary sm:max-w-[88px] sm:text-[9px] lg:max-w-[150px] lg:text-right lg:text-[9px]">
        {formatDiscountLabel(rt.discount)}
      </span>
    )}

    <p className="whitespace-nowrap text-xs font-bold leading-none tracking-tight text-foreground sm:text-sm lg:text-[15px]">
      BDT {displayPrice.toLocaleString()}
    </p>
  </div>

  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
    night
  </p>
</div>

          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] sm:gap-2.5 sm:text-[11px] lg:gap-2.5 lg:text-[11px] text-muted-foreground">
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
            {isAvail && (
              <span className="rounded-md bg-green-500/10 text-green-600 px-1.5 py-0.5 text-[9px] sm:text-[9.5px] lg:text-[9.5px] font-medium uppercase tracking-wide dark:bg-green-500/20 dark:text-green-400">
                Available
              </span>
            )}
          </div>

          {!disabled && (
            <span className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-[10px] sm:px-3 sm:text-[11px] lg:px-3 lg:text-[11px] font-medium text-primary-foreground transition hover:bg-primary/90 shadow-sm">
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
  id,
  slug,
  name,
  city,
  hotel_type,
  star_rating  = 0,
  guest_rating = 0,
  cover_image,
  address,
  starting_price,
  starting_discount,
  room_types,
  total_room_types,
  has_dates,
  checkIn,
  checkOut,
  guests,
  rooms,
  amenities,
  roomListMaxHeight,
  minPrice,
  maxPrice,
  accommodation,
  isFavorited = false,
  favoritePage = false,
}: HotelCardProps) => {
  const hotelQuery = buildHotelQuery(checkIn, checkOut, guests, rooms);
  const hotelUrl  = hotelQuery.toString()
    ? `/hotels/${slug}?${hotelQuery.toString()}`
    : `/hotels/${slug}`;
  const displayStartingPrice = typeof starting_price === 'number' && Number.isFinite(starting_price)
    ? starting_price
    : null;

  const hasRoomStrip = !!room_types && room_types.length > 0;

  const availableCount = hasRoomStrip
  ? room_types!.filter(rt => !rt.dates_filtered || rt.available_count > 0).length
  : 0;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-400 hover:shadow-xl hover:-translate-y-1">
      
      {/* ── HOTEL SHOWCASE FRAME ─────────────────────────────────────────── */}
      <div className="relative flex flex-col">
<Link
  href={hotelUrl}
  className={cn(
    "block relative overflow-hidden bg-muted z-10",
    favoritePage ? "h-80 md:h-[360px]" : "h-72"
  )}
>
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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60  to-black/10" />

          {/* Top row actions & tags */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 z-20">
            <span className="rounded-full bg-background/90 px-2.5 py-1 text-[10px] uppercase font-semibold tracking-[0.12em] text-foreground backdrop-blur">
              {hotel_type}
            </span>
            <FavoriteButton hotelId={id} initialIsFavorited={isFavorited} />
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

            <h3 className="text-base sm:text-lg lg:text-2xl font-bold leading-tight tracking-tight line-clamp-2 ">
              {name}
            </h3>

            <div className="mt-1 flex items-center gap-1 text-[11px] sm:mt-1.5 sm:gap-1.5 sm:text-[12px] lg:mt-1.5 lg:gap-1.5 lg:text-[12px] text-white/85">
              <MapPin className="size-3.5 text-white/70" />
              <span>{city}</span>
              <span className="text-white/40">·</span>
              <span className="truncate max-w-[200px] text-white/80">
                {address}
              </span>
            </div>

            {/* Embedded Footer Pricing Block */}
            <div className="mt-4 flex min-w-0 items-end justify-between gap-2 border-t border-white/15 pt-3 lg:gap-3">
              <div className="min-w-0 flex-1 text-left">
                {amenities && amenities.length > 0 ? (
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:gap-2">
                    {amenities.slice(0,3).map((a, i) => (
                      <span key={i} className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] whitespace-normal break-words text-white/90 sm:px-2 sm:text-[10px]">{a}</span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">No amenities info</p>
                )}
              </div>
              
              <div className="w-[78px] shrink-0 text-right sm:w-[96px] lg:w-auto">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white/60">From</p>
                {displayStartingPrice !== null ? (
                  <p className="whitespace-nowrap text-xs font-bold leading-none sm:text-lg lg:text-xl">
                    BDT {displayStartingPrice.toLocaleString()}
                    {/*<span className="ml-0.5 text-[10px] tracking-wide text-white/70">/nt</span>*/}
                  </p>
                ) : (
                  <p className="text-[11px] text-white/70">N/A</p>
                )}
                {starting_discount && starting_discount.amount > 0 && (
                  <p className="mt-1 max-w-[180px] text-[10px] font-semibold leading-tight text-white/85">
                    {formatDiscountLabel(starting_discount)}
                  </p>
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
            <div className="min-w-0 flex-1 mr-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Available rooms
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                {has_dates
                  ? `${availableCount}/${room_types!.length} room type open`
                  : `${room_types!.length} room type${room_types!.length !== 1 ? 's' : ''} available`
                }
              </p>
              {/* Accommodation badge — only when capacity params were supplied */}
              {accommodation && (
                <AccommodationBadge ctx={accommodation} />
              )}
            </div>
            <Link 
              href={hotelUrl} 
              className="flex items-center gap-1 text-[11px] font-medium text-foreground hover:text-primary transition-colors shrink-0"
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
                const aAvail = !a.dates_filtered || a.available_count > 0;
                const bAvail = !b.dates_filtered || b.available_count > 0;

                if (aAvail !== bAvail) return aAvail ? -1 : 1;

                if (minPrice || maxPrice) {
                  const minP = minPrice ?? 0;
                  const maxP = maxPrice ?? Infinity;
                  const aMatches = getDisplayPrice(a.base_price, a.effective_price) >= minP && getDisplayPrice(a.base_price, a.effective_price) <= maxP;
                  const bMatches = getDisplayPrice(b.base_price, b.effective_price) >= minP && getDisplayPrice(b.base_price, b.effective_price) <= maxP;
                  
                  if (aMatches && !bMatches) return -1;
                  if (!aMatches && bMatches) return 1;
                }

                return 0;
              })
              .map(rt => (
              <RoomRow
                key={rt.id}
                rt={rt}
                slug={slug}
                checkIn={checkIn}
                checkOut={checkOut}
                guests={guests}
                rooms={rooms}
              />
            ))}
          </div>

        </div>
      )}

      {/* Accommodation badge when there is no room strip (edge case) */}
      {!hasRoomStrip && accommodation && (
        <div className="px-5 py-3 border-t border-border/60 bg-muted/10">
          <AccommodationBadge ctx={accommodation} />
        </div>
      )}
    </article>
  );
};

export const HotelListCard = ({
  id,
  slug,
  name,
  city,
  hotel_type,
  star_rating = 0,
  guest_rating = 0,
  cover_image,
  address,
  starting_price,
  starting_discount,
  images,
  room_types,
  has_dates,
  checkIn,
  checkOut,
  guests,
  rooms,
  minPrice,
  maxPrice,
  accommodation,
  amenities,
  isFavorited = false,
}: HotelCardProps) => {
  const router = useRouter();
  const hotelQuery = buildHotelQuery(checkIn, checkOut, guests, rooms);
  const hotelUrl = hotelQuery.toString()
    ? `/hotels/${slug}?${hotelQuery.toString()}`
    : `/hotels/${slug}`;
  const displayPrice = typeof starting_price === 'number' && Number.isFinite(starting_price)
    ? starting_price
    : null;
  const availableCount = room_types?.filter((room) => !room.dates_filtered || room.available_count > 0).length ?? 0;
  const visibleRooms = room_types ? [...room_types].sort((a, b) => {
    const aAvail = !a.dates_filtered || a.available_count > 0;
    const bAvail = !b.dates_filtered || b.available_count > 0;
    if (aAvail !== bAvail) return aAvail ? -1 : 1;
    if (minPrice || maxPrice) {
      const minP = minPrice ?? 0;
      const maxP = maxPrice ?? Infinity;
      const aMatches = getDisplayPrice(a.base_price, a.effective_price) >= minP && getDisplayPrice(a.base_price, a.effective_price) <= maxP;
      const bMatches = getDisplayPrice(b.base_price, b.effective_price) >= minP && getDisplayPrice(b.base_price, b.effective_price) <= maxP;
      if (aMatches !== bMatches) return aMatches ? -1 : 1;
    }
    return 0;
  }) : [];

  const listImages = images && images.length > 0
    ? images
    : cover_image
      ? [{ id: 0, image_url: cover_image, is_cover: true }]
      : [];

  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);
  const [selectedSlide, setSelectedSlide] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;

    const updateSelected = () => setSelectedSlide(carouselApi.selectedScrollSnap());
    updateSelected();
    carouselApi.on('select', updateSelected);
    carouselApi.on('reInit', updateSelected);

    return () => {
      carouselApi.off('select', updateSelected);
      carouselApi.off('reInit', updateSelected);
    };
  }, [carouselApi]);

  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, [role="button"]')) {
      return;
    }
    router.push(hotelUrl);
  };
  const phonePreviewRooms = visibleRooms.slice(0, 2);
  const remainingRoomCount = Math.max(0, visibleRooms.length - phonePreviewRooms.length);

  return (
    <article
      className="group grid min-w-0 cursor-pointer grid-cols-[128px_minmax(0,1fr)] overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg sm:grid-cols-[minmax(170px,42%)_minmax(0,1fr)]"
      onClick={handleCardClick}
    >
      <div className="relative min-h-0 overflow-hidden bg-muted sm:min-h-56">
        {listImages.length > 0 ? (
          <Carousel
            opts={{ loop: false, containScroll: 'trimSnaps', dragFree: false, align: 'start' }}
            setApi={setCarouselApi}
            className="h-full [&>[data-slot=carousel-content]]:h-full [&>[data-slot=carousel-content]]:overflow-y-hidden"
          >
            <CarouselContent className="h-full">
              {listImages.map((image) => (
                <CarouselItem key={image.id} className="relative h-full basis-full pl-0">
                  <div className="relative h-full min-h-[120px] w-full sm:min-h-[224px]">
                    <Image
                      src={image.image_url}
                      alt={name}
                      fill
                      sizes="(max-width: 640px) 100vw, 30vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {listImages.length > 1 && (
              <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1.5">
                {listImages.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    aria-label={`View hotel image ${index + 1}`}
                    className={cn(
                      'h-1.5 w-1.5 rounded-full transition-all',
                      selectedSlide === index ? 'bg-white shadow-sm' : 'bg-white/50'
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      carouselApi?.scrollTo(index);
                    }}
                  />
                ))}
              </div>
            )}
          </Carousel>
        ) : (
          <div className="flex h-full min-h-[120px] items-center justify-center bg-secondary/50 sm:min-h-[224px]">
            <Building2 className="h-12 w-12 text-muted-foreground/20" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
        <div className="absolute right-2 top-2 sm:right-3 sm:top-3">
          <FavoriteButton hotelId={id} initialIsFavorited={isFavorited} />
        </div>
        <span className="absolute bottom-7 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-foreground backdrop-blur sm:left-3 sm:top-3 sm:bottom-auto sm:right-auto sm:px-2.5 sm:py-1 sm:text-[10px]">
          {hotel_type}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 p-1.5 sm:gap-3 sm:p-5">
        <div className="min-w-0">
          <div className="mb-0.5 flex flex-wrap items-center gap-1 text-[9px] sm:gap-2 sm:text-xs">
            {guest_rating > 0 && <span className="font-semibold text-amber-500">{Number(guest_rating).toFixed(1)} ★</span>}
            {star_rating > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                {renderStarIcons(star_rating)}
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[13px] font-bold leading-tight tracking-tight text-foreground sm:text-xl">{name}</h3>
              <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1 text-[9.5px] leading-tight text-muted-foreground sm:text-sm">
                <MapPin className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                <span className="min-w-0">{city}</span>
                {address && <><span>·</span><span className="min-w-0">{address}</span></>}
              </p>
            </div>

            <div className="shrink-0 pt-0.5 text-right">
              <p className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">From</p>
              <p className="whitespace-nowrap text-[11px] font-bold leading-tight text-foreground sm:text-lg">
                {displayPrice !== null ? `BDT ${displayPrice.toLocaleString()}` : 'Price unavailable'}
              </p>
              {starting_discount && starting_discount.amount > 0 && (
                <p className="mt-0.5 text-[8px] font-semibold leading-tight text-primary sm:text-xs">
                  {formatDiscountLabel(starting_discount)}
                </p>
              )}
            </div>
          </div>
        </div>

        {amenities && amenities.length > 0 && (
          <div className="hidden sm:flex sm:flex-wrap sm:gap-1">
            {amenities.slice(0, 3).map((amenity) => (
              <span key={amenity} className="max-w-full rounded-md bg-secondary/70 px-1 py-0.5 text-[8.5px] leading-tight text-muted-foreground sm:px-2 sm:py-1 sm:text-[10px]">
                {amenity}
              </span>
            ))}
          </div>
        )}

        {accommodation && <AccommodationBadge ctx={accommodation} />}

        <div className="border-t border-border/60 pt-1 sm:pt-3">
          <div className="hidden sm:block">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">Available rooms</p>
            <p className="text-[9.5px] text-muted-foreground sm:text-xs">
              {has_dates ? `${availableCount}/${room_types?.length ?? 0} room types open` : `${room_types?.length ?? 0} room types available`}
            </p>
          </div>

          <div className="mt-1 block sm:hidden">
            {phonePreviewRooms.length > 0 && (
              <div className="space-y-1">
                {phonePreviewRooms.map((room) => (
                  <CompactRoomRow
                    key={room.id}
                    rt={room}
                    slug={slug}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    guests={guests}
                    rooms={rooms}
                  />
                ))}
                {remainingRoomCount > 0 && (
                  <p className="text-[9px] text-muted-foreground">{remainingRoomCount} more available</p>
                )}
              </div>
            )}
          </div>

          <div className="hidden sm:block">
            {visibleRooms.length > 0 && (
              <div
                className="mt-2 h-[92px] divide-y divide-border/60 overflow-y-auto bg-card custom-scrollbar [&::-webkit-scrollbar-thumb]:opacity-0 hover:[&::-webkit-scrollbar-thumb]:opacity-100 sm:h-[108px] lg:h-[116px]"
                data-lenis-prevent={visibleRooms.length >= 3 ? "" : undefined}
                data-lenis-prevent-wheel={visibleRooms.length >= 3 ? "" : undefined}
                data-lenis-prevent-touch={visibleRooms.length >= 3 ? "" : undefined}
              >
                {visibleRooms.map((room) => (
                  <RoomRow
                    key={room.id}
                    rt={room}
                    slug={slug}
                    checkIn={checkIn}
                    checkOut={checkOut}
                    guests={guests}
                    rooms={rooms}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </article>
  );
};

export default HotelCard;