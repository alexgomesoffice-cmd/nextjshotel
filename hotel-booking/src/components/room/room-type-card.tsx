"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Users,
  Bed,
  Check,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

import { getAmenityIcon } from "@/lib/amenity-icons";
import { cn } from "@/lib/utils";
import {
  canVariantAccommodate,
  getRecommendedQuantity,
  formatCapacityMessage,
  formatRecommendationMessage,
} from "@/lib/room-capacity-calculator";


// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomTypeImage { id: number; image_url: string; }
interface RoomBedType { bed_type: { name: string }; count: number; }
interface RoomTypeAmenity { amenity: { name: string; icon: string | null }; }

export type ResolvedPricing = {
  basePrice: number;
  effectivePrice: number;
  discount: null | { ruleId: number; name: string; type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; amount: number };
};

export interface RoomVariant {
  id: number;
  room_size: string | null;
  max_occupancy: number | null;
  facilities: { name: string }[];
  bed_types: RoomBedType[];
  variant_images: { id: number; image_url: string }[];
  pricing: ResolvedPricing;
  total_rooms: number;
  available_count: number;
}

export interface RoomTypeCardProps {
  id: number;
  name: string;
  description: string | null;
  type_images: RoomTypeImage[];
  room_type_amenities: RoomTypeAmenity[];
  available_rooms_count: number;
  room_variants: RoomVariant[];
  onViewDetails?: () => void;
  selectedQuantities: Record<number, number>;
  onQuantityChange: (variantId: number, quantity: number) => void;
  guests?: number;
  forceExpanded?: boolean;
  isHighlighted?: boolean;
  onClearHighlight?: () => void;
  onViewRoomDetails?: (variantId: number) => void;
}

// ─── Variant Row ─────────────────────────────────────────────────────────────

interface VariantRowProps {
  variant: RoomVariant;
  roomName: string;
  typeImages: RoomTypeImage[];
  bedTypes: RoomBedType[];
  occupancy_adults: number;
  quantity: number;
  available: number;
  onQtyChange: (qty: number) => void;
  onViewRoomDetails?: () => void;
  guests?: number;
}

function VariantRow({
  variant, roomName, typeImages, bedTypes, occupancy_adults,
  quantity, available, onQtyChange, onViewRoomDetails,
  guests = 1,
}: VariantRowProps) {
  const images = variant.variant_images.length > 0 ? variant.variant_images : typeImages;
  const [imgIdx, setImgIdx] = useState(0);
  const isSelected = quantity > 0;
  const isUnavailable = available <= 0;
  const maxOccupancy = variant.max_occupancy ?? occupancy_adults;

  // Calculate if this variant can accommodate the requested guests
  const canAccommodate = canVariantAccommodate(maxOccupancy, available, guests);
  const recommendedQuantity = getRecommendedQuantity(maxOccupancy, available, guests);

  // Determine if current quantity is insufficient
  const totalCapacity = quantity * maxOccupancy;
  const isInsufficientQuantity = quantity > 0 && totalCapacity < guests;

  const bedLabel = bedTypes.map(b => b.bed_type.name).join(", ");
  const title = bedLabel ? `${roomName} • ${bedLabel}` : roomName;

  return (
    <div className={cn(
      "grid grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)_8.5rem] gap-0 border-t border-border/20 transition-colors",
      isSelected ? "bg-primary/5" : "bg-transparent",
      isUnavailable && "opacity-60 bg-muted/30"
    )}>
      {/* ── Image ── */}
      <div
        onClick={onViewRoomDetails}
        tabIndex={-1}
        className="relative aspect-4/3 sm:aspect-auto sm:min-h-32.5 sm:h-full group overflow-hidden bg-muted cursor-pointer"
      >
        {images.length > 0 ? (
          <>
            <Image
              src={images[imgIdx].image_url}
              alt={roomName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setImgIdx(p => p === 0 ? images.length - 1 : p - 1); }}
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setImgIdx(p => p === images.length - 1 ? 0 : p + 1); }}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <ChevronRight className="h-3 w-3" />
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                  {images.map((_, i) => (
                    <div key={i} className={cn("rounded-full transition-all", i === imgIdx ? "w-3 h-1 bg-white" : "w-1 h-1 bg-white/50")} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Bed className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
      </div>

      {/* ── Content (middle) ── */}
      <div className="min-w-0 px-4 py-3 sm:px-5 sm:py-4">
        {/* Title + available badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-base text-foreground leading-tight">{title}</span>
            {available > 0 ? (
              <span className="text-[11px] text-muted-foreground bg-secondary/80 rounded-md px-2 py-0.5 border border-border/40 shrink-0">
                {available} available
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground bg-secondary/60 rounded-md px-2 py-0.5 border border-border/30 shrink-0">
                Unavailable for selected dates
              </span>
            )}
        </div>

        {/* Capacity */}
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />
          {formatCapacityMessage(maxOccupancy)}
        </div>

        {/* Facilities */}
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 text-xs text-muted-foreground">
          {variant.facilities.slice(0, 3).map((f) => (
            <span key={f.name} className="inline-flex items-center gap-1">
              <Check className="h-3 w-3 text-primary/80" /> {f.name}
            </span>
          ))}
        </div>

        {/* Recommendation */}
        {guests > 1 && canAccommodate && recommendedQuantity > 0 && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-green-600 dark:text-green-400 font-medium">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatRecommendationMessage(recommendedQuantity, guests)}</span>
          </div>
        )}
        {guests > 1 && !canAccommodate && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Cannot accommodate {guests} guests</span>
          </div>
        )}
      </div>

      {/* ── Price and quantity ── */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 px-4 pb-3 sm:px-5 sm:py-4 border-t sm:border-t-0 border-border/20">
        <div className="text-left sm:text-right shrink-0">
          {variant.pricing.discount && (
            <p className="text-[11px] text-muted-foreground line-through">
              TK {Number(variant.pricing.basePrice).toLocaleString()}
            </p>
          )}
          <p className="text-primary font-bold text-lg leading-tight">
            TK {Number(variant.pricing.effectivePrice).toLocaleString()}
          </p>
          <p className="text-[11px] text-muted-foreground">per night</p>
          {variant.pricing.discount && (
            <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {variant.pricing.discount.type === 'PERCENTAGE' ? `${variant.pricing.discount.value}% OFF` : `TK ${variant.pricing.discount.amount.toLocaleString()} OFF`}
            </span>
          )}
        </div>

        {isUnavailable ? (
          <div className="text-[11px] text-muted-foreground bg-secondary/50 border border-border/40 rounded-lg px-2.5 py-1.5 text-right">
            Not available for selected dates
          </div>
        ) : !canAccommodate ? (
          <div className="text-[11px] text-muted-foreground bg-secondary/50 border border-border/40 rounded-lg px-2.5 py-1.5 text-right">
            Insufficient capacity alone
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border/50 bg-background/40 p-0.5">
              <button
                onClick={() => onQtyChange(Math.max(0, quantity - 1))}
                disabled={quantity === 0}
                aria-label={`Decrease ${title} quantity`}
                className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold transition-colors",
                  quantity > 0
                    ? "text-foreground hover:bg-primary/10 hover:text-primary"
                    : "text-border/30 cursor-not-allowed"
                )}
              >
                −
              </button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                onClick={() => onQtyChange(Math.min(available, quantity + 1))}
                disabled={quantity >= available}
                aria-label={`Increase ${title} quantity`}
                className={cn(
                  "h-7 w-7 rounded-md flex items-center justify-center text-sm font-bold transition-colors",
                  quantity < available
                    ? "text-foreground hover:bg-primary/10 hover:text-primary"
                    : "text-border/30 cursor-not-allowed"
                )}
              >
                +
              </button>
            </div>

            {/* Warning if selected quantity is insufficient */}
            {isInsufficientQuantity && (
              <div className="text-[10px] text-amber-600 dark:text-amber-400 text-center px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded">
                Not enough for {guests} guests
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Room Type Card (Collapsed header) ───────────────────────────────────────

const RoomTypeCard = ({
  id, name, description,
  type_images, room_type_amenities, available_rooms_count,
  room_variants, onViewDetails, selectedQuantities, onQuantityChange,
  guests = 1, forceExpanded = false, isHighlighted = false, onClearHighlight,
  onViewRoomDetails
}: RoomTypeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(forceExpanded);
  const coverImage = type_images?.[0]?.image_url || null;
  const totalSelected = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);
  const isUnavailable = available_rooms_count === 0;
  const shouldExpand = forceExpanded || isExpanded;
  // "From" price — the cheapest currently-effective variant price, since
  // Room Type no longer carries its own price (that moved to Variant).
  const cheapestVariant = room_variants.reduce<RoomVariant | null>((min, v) =>
    !min || v.pricing.effectivePrice < min.pricing.effectivePrice ? v : min, null);

  return (
    <div
      id={id ? `room-type-${id}` : undefined}
      className={cn(
        "rounded-xl border overflow-hidden bg-card transition-all duration-50  shadow-xl",
        isHighlighted && "ring-2 ring-primary/70 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]",
        isUnavailable
          ? "opacity-60 border-border/30"
          : shouldExpand || totalSelected > 0
            ? "border-primary/70"
            : "border-border/30 hover:border-border/50"
      )}
    >
      {/* ── Card Header: image LEFT + info RIGHT ── */}
      <div className={cn("select-none", isUnavailable && "cursor-not-allowed")}> 
        {/* Side-by-side row */}
        <div className="flex min-h-52.5 flex-col sm:flex-row">

          {/* Left: image panel */}
          <div className="relative aspect-video w-full shrink-0 bg-muted overflow-hidden sm:aspect-auto sm:w-60 sm:min-h-52.5">
            {coverImage ? (
              <Image
                src={coverImage}
                alt={name}
                fill
                sizes="(max-width: 640px) 190px, 240px"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Bed className="h-10 w-10 text-muted-foreground/20" />
              </div>
            )}
          </div>

          {/* Right: info panel */}
          <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col">
            {/* Name + price */}
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-bold text-xl text-foreground leading-tight">
                {name}
              </h3>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">From</p>
                {cheapestVariant?.pricing.discount && (
                  <p className="text-xs text-muted-foreground line-through">
                    TK {Number(cheapestVariant.pricing.basePrice).toLocaleString()}
                  </p>
                )}
                <p className="text-xl font-bold text-primary leading-tight">
                  TK {Number(cheapestVariant?.pricing.effectivePrice ?? 0).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ night</span>
                </p>
                {cheapestVariant?.pricing.discount && (
                  <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {cheapestVariant.pricing.discount.type === 'PERCENTAGE' ? `${cheapestVariant.pricing.discount.value}% OFF` : `TK ${cheapestVariant.pricing.discount.amount.toLocaleString()} OFF`}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            )}

            {/* Divider */}
            <hr className="border-border/30 my-3" />

            {/* Top highlights */}
            {room_type_amenities && room_type_amenities.length > 0 && (
              <div className="mt-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
                  Top highlights
                </p>
                <div className="flex flex-wrap gap-2">
{room_type_amenities.slice(0, 4).map((prop, i) => {
  const Icon = getAmenityIcon(prop.amenity.icon);

  return (
    <span
      key={i}
      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border/40 rounded-full px-3 py-1"
    >
      <Icon className="h-3 w-3 text-primary shrink-0" />
      {prop.amenity.name}
    </span>
  );
})}


                </div>
              </div>
            )}

            <div className="mt-auto pt-4 flex items-center justify-between gap-3 flex-wrap">
              {onViewDetails && (
                <button
                  onClick={e => { e.stopPropagation(); onViewDetails(); }}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  View Details
                </button>
              )}
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (isUnavailable) return;
                  if (isHighlighted && isExpanded) {
                    onClearHighlight?.();
                    setIsExpanded(false);
                  } else {
                    setIsExpanded(!isExpanded);
                  }
                }}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1 hover:bg-primary/10 transition-colors"
              >
                <span>{shouldExpand ? 'Hide room options' : `View ${room_variants.length} room option${room_variants.length !== 1 ? 's' : ''}`}</span>
                <ChevronUp className={cn("h-4 w-4 transition-transform duration-200", !shouldExpand && "rotate-180")} />
              </button>
            </div>
          </div>
        </div>
        
      </div>




      {/* ── Expanded: Choose your room header + variant rows ── */}
      <div 
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
          shouldExpand ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden min-h-0">
          {/* Section header */}
          <div className="border-t border-border/30 px-5 py-3 flex items-center gap-2 bg-muted/10">
            <span className="text-sm font-semibold text-foreground">Choose your room</span>
            {available_rooms_count > 0 && (
              <span className="text-sm text-primary font-semibold">{available_rooms_count} available</span>
            )}
          </div>

          {room_variants.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground border-t border-border/20">
              No rooms currently available in this category.
            </div>
          ) : (
            room_variants.map(variant => (
              <VariantRow
                key={variant.id}
                variant={variant}
                roomName={name}
                typeImages={type_images}
                bedTypes={variant.bed_types}
                occupancy_adults={variant.max_occupancy ?? 2}
                quantity={selectedQuantities[variant.id] ?? 0}
                available={variant.available_count}
                onQtyChange={qty => onQuantityChange(variant.id, qty)}
                onViewRoomDetails={() => onViewRoomDetails?.(variant.id)}
                guests={guests}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomTypeCard;