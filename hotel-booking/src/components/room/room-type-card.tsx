"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Users, Bed, Check,
  ChevronUp, ChevronLeft, ChevronRight,
  Maximize2, Cigarette, PawPrint, ShieldAlert, Images,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomTypeImage { id: number; image_url: string; }
interface RoomBedType { bed_type: { name: string }; count: number; }
interface RoomProperty { amenity: { name: string; icon: string | null }; }

export interface RoomVariant {
  id: number;
  room_number: string;
  price: number;
  ac: boolean;
  smoking_allowed: boolean;
  pet_allowed: boolean;
  notes: string | null;
  room_images: { id: number; image_url: string }[];
  available_count: number;
}

export interface RoomTypeCardProps {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  occupancy_adults: number;
  room_size: string | null;
  type_images: RoomTypeImage[];
  room_bed_types: RoomBedType[];
  room_properties: RoomProperty[];
  available_rooms_count: number;
  room_variants: RoomVariant[];
  onViewDetails?: () => void;
  selectedQuantities: Record<number, number>;
  onQuantityChange: (variantId: number, quantity: number) => void;
  isGuestMismatch?: boolean;
  guestMismatchReason?: string;
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
  onViewDetails?: () => void;
  onViewRoomDetails?: () => void;
  isGuestMismatch?: boolean;
  guestMismatchReason?: string;
}

function VariantRow({
  variant, roomName, typeImages, bedTypes, occupancy_adults,
  quantity, available, onQtyChange, onViewDetails, onViewRoomDetails,
  isGuestMismatch, guestMismatchReason,
}: VariantRowProps) {
  const images = variant.room_images.length > 0 ? variant.room_images : typeImages;
  const [imgIdx, setImgIdx] = useState(0);
  const isSelected = quantity > 0;

  const bedLabel = bedTypes.map(b => b.bed_type.name).join(", ");
  const title = bedLabel ? `${roomName} • ${bedLabel}` : roomName;

  return (
    <div className={cn(
      "flex min-h-32.5 border-t border-border/20 transition-colors",
      isSelected ? "bg-primary/5" : "bg-transparent"
    )}>
      {/* ── Image ── */}
      <div
        onClick={onViewRoomDetails ?? onViewDetails}
        tabIndex={-1}
        className="relative w-32.5 sm:w-37.5 shrink-0 group overflow-hidden bg-muted self-stretch cursor-pointer"
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
      <div className="flex flex-1 min-w-0 gap-4 p-4">
        {/* Left: info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title + available badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">{title}</span>
            <span className="text-xs text-muted-foreground bg-secondary/80 rounded-md px-2 py-0.5 border border-border/40 shrink-0">
              {available} available
            </span>
          </div>

          {/* Guest / smoking / pet / AC flags */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {occupancy_adults} guest{occupancy_adults > 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1.5">
              <Cigarette className="h-3.5 w-3.5" />
              {variant.smoking_allowed ? "Smoking" : "No smoking"}
            </span>
            <span className="flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              {variant.pet_allowed ? "Pet friendly" : "No pets"}
            </span>
            {variant.ac && (
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary/80" /> AC
              </span>
            )}
          </div>

          {/* Notes / policy */}
          {variant.notes && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <ShieldAlert className="h-3 w-3 shrink-0" /> {variant.notes}
            </p>
          )}
        </div>

        {/* Middle-right: price + policy badge */}
        <div className="flex flex-col items-end justify-start gap-2 shrink-0 min-w-25">
          <div className="text-right">
            <p className="text-primary font-bold text-xl leading-tight">
              TK {Number(variant.price).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">per night</p>
          </div>

          {/* Cancellation label */}
          <p className={cn(
            "text-xs font-medium",
            variant.notes ? "text-destructive" : "text-muted-foreground"
          )}>
            {variant.notes ? "Non-refundable" : "Partially refundable"}
          </p>
        </div>

        {/* Far-right: stepper or mismatch reason */}
        <div className="flex flex-col items-center justify-center gap-2 shrink-0">
          {isGuestMismatch ? (
            <div className="text-xs text-muted-foreground bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 max-w-45 text-right">
              {guestMismatchReason}
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => onQtyChange(Math.max(0, quantity - 1))}
                disabled={quantity === 0}
                className={cn(
                  "h-7 w-7 rounded-full border flex items-center justify-center text-sm font-bold transition-all",
                  quantity > 0
                    ? "border-border/60 text-foreground hover:border-primary hover:text-primary"
                    : "border-border/20 text-border/30 cursor-not-allowed"
                )}
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-semibold tabular-nums">{quantity}</span>
              <button
                onClick={() => onQtyChange(Math.min(available, quantity + 1))}
                disabled={quantity >= available}
                className={cn(
                  "h-7 w-7 rounded-full border flex items-center justify-center text-sm font-bold transition-all",
                  quantity < available
                    ? "border-border/60 text-foreground hover:border-primary hover:text-primary"
                    : "border-border/20 text-border/30 cursor-not-allowed"
                )}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Room Type Card (Collapsed header) ───────────────────────────────────────

const RoomTypeCard = ({
  id, name, description, base_price, occupancy_adults, room_size,
  type_images, room_bed_types, room_properties, available_rooms_count,
  room_variants, onViewDetails, selectedQuantities, onQuantityChange,
  isGuestMismatch, guestMismatchReason, forceExpanded = false, isHighlighted = false, onClearHighlight,
  onViewRoomDetails
}: RoomTypeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(forceExpanded);
  const coverImage = type_images?.[0]?.image_url || null;
  const totalSelected = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);
  const isUnavailable = available_rooms_count === 0 && room_variants.length === 0;
  const isDisabled = isGuestMismatch || isUnavailable;
  const shouldExpand = forceExpanded || isExpanded;

  const handleHeaderClick = () => {
    if (!isDisabled) {
      if (isHighlighted) {
        // User is closing the highlighted room - clear highlight AND collapse immediately
        onClearHighlight?.();
        setIsExpanded(false);
      } else {
        // Normal toggle
        setIsExpanded(!isExpanded);
      }
    }
  };

  return (
    <div
      id={id ? `room-type-${id}` : undefined}
      className={cn(
        "rounded-2xl border overflow-hidden bg-card transition-all duration-50",
        isHighlighted && "ring-2 ring-primary/70 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]",
        isDisabled
          ? "opacity-60 border-border/30"
          : shouldExpand || totalSelected > 0
            ? "border-primary/70"
            : "border-border/30 hover:border-border/50"
      )}
    >
      {/* ── Card Header: image LEFT + info RIGHT ── */}
      <div
        onClick={handleHeaderClick}
        className={cn(
          "cursor-pointer select-none",
          isDisabled && "cursor-not-allowed"
        )}
      >
        {/* Side-by-side row */}
        <div className="flex min-h-[240px]">

          {/* Left: image panel */}
          <div className="relative w-[260px] sm:w-[320px] shrink-0 bg-muted overflow-hidden self-stretch">
            {coverImage ? (
              <Image
                src={coverImage}
                alt={name}
                fill
                sizes="(max-width: 640px) 260px, 320px"
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Bed className="h-10 w-10 text-muted-foreground/20" />
              </div>
            )}
            {/* View gallery button */}
            {onViewDetails && (
              <button
                onClick={e => { e.stopPropagation(); onViewDetails(); }}
                className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2.5 py-1.5 rounded-md backdrop-blur-sm hover:bg-black/75 transition-colors"
              >
                <Images className="h-3.5 w-3.5" /> View gallery
              </button>
            )}
          </div>

          {/* Right: info panel */}
          <div className="flex-1 min-w-0 p-5 flex flex-col">
            {/* Name */}
            <h3
              className="font-bold text-xl text-foreground leading-tight cursor-pointer hover:text-primary transition-colors"
              onClick={e => { if (onViewDetails) { e.stopPropagation(); onViewDetails(); } }}
            >
              {name}
            </h3>

            {/* Description */}
            {description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
            )}

            {/* Divider */}
            <hr className="border-border/30 my-3" />

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              {room_size && (
                <span className="flex items-center gap-1.5">
                  <Maximize2 className="h-3.5 w-3.5" /> {room_size}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Up to {occupancy_adults} guests
              </span>
              {room_bed_types?.map((b, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <Bed className="h-3.5 w-3.5" /> {b.bed_type.name}
                </span>
              ))}
            </div>

            {/* Top highlights */}
            {room_properties && room_properties.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70 mb-2">
                  Top highlights
                </p>
                <div className="flex flex-wrap gap-2">
                  {room_properties.slice(0, 4).map((prop, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border/40 rounded-full px-3 py-1"
                    >
                      <Check className="h-3 w-3 text-primary shrink-0" />
                      {prop.amenity.name}
                    </span>
                  ))}
                  {room_properties.length > 4 && (
                    <button
                      onClick={e => { e.stopPropagation(); if (onViewDetails) onViewDetails(); }}
                      className="inline-flex items-center text-xs font-medium text-primary border border-primary/30 bg-primary/5 rounded-full px-3 py-1 hover:bg-primary/10 transition-colors"
                    >
                      +{room_properties.length - 4} more
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Price — bottom right of info panel */}
            <div className="mt-auto pt-4 flex items-end justify-end">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-xl font-bold text-primary leading-tight">
                  TK {Number(base_price).toLocaleString()}
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ night</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom expand strip */}
        <div className="border-t border-border/20 px-5 py-3 flex items-center justify-between bg-muted/20 hover:bg-muted/30 transition-colors">
          <span className="text-sm text-muted-foreground">
            {room_variants.length} room option{room_variants.length !== 1 ? 's' : ''} available
          </span>
          <ChevronUp className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", !shouldExpand && "rotate-180")} />
        </div>
      </div>

      {/* ── Expanded: Choose your room header + variant rows ── */}
      {shouldExpand && (
        <div className="animate-in slide-in-from-top-1 duration-50">
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
                bedTypes={room_bed_types}
                occupancy_adults={occupancy_adults}
                quantity={selectedQuantities[variant.id] ?? 0}
                available={variant.available_count}
                onQtyChange={qty => onQuantityChange(variant.id, qty)}
                onViewDetails={onViewDetails}
                onViewRoomDetails={() => onViewRoomDetails?.(variant.id)}
                isGuestMismatch={isGuestMismatch}
                guestMismatchReason={guestMismatchReason}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default RoomTypeCard;
