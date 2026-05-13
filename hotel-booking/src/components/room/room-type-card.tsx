"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Users, Bed, Check,
  ChevronUp, ChevronLeft, ChevronRight,
  Maximize2, Cigarette, PawPrint, ShieldAlert,
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
}

// ─── Variant Row ─────────────────────────────────────────────────────────────

interface VariantRowProps {
  variant: RoomVariant;
  roomName: string;
  typeImages: RoomTypeImage[];
  bedTypes: RoomBedType[];
  amenities: RoomProperty[];
  quantity: number;
  available: number;
  onQtyChange: (qty: number) => void;
  onViewDetails?: () => void;
  isGuestMismatch?: boolean;
  guestMismatchReason?: string;
}

function VariantRow({
  variant, roomName, typeImages, bedTypes, amenities,
  quantity, available, onQtyChange, onViewDetails,
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
      <button
        onClick={onViewDetails}
        tabIndex={-1}
        className="relative w-32.5 sm:w-37.5 shrink-0 group overflow-hidden bg-muted self-stretch"
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
      </button>

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

          {/* Guest / smoking / pet flags */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> 2 guests
            </span>
            <span className="flex items-center gap-1.5">
              <Cigarette className="h-3.5 w-3.5" />
              {variant.smoking_allowed ? "Smoking" : "No smoking"}
            </span>
            <span className="flex items-center gap-1.5">
              <PawPrint className="h-3.5 w-3.5" />
              {variant.pet_allowed ? "Pet friendly" : "No pets"}
            </span>
          </div>

          {/* Amenity checkmarks */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {variant.ac && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary/80 shrink-0" /> AC
              </span>
            )}
            {amenities.map((prop, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3 w-3 text-primary/80 shrink-0" /> {prop.amenity.name}
              </span>
            ))}
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
              ৳{Number(variant.price).toLocaleString()}
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
  name, description, base_price, occupancy_adults, room_size,
  type_images, room_bed_types, room_properties, available_rooms_count,
  room_variants, onViewDetails, selectedQuantities, onQuantityChange,
  isGuestMismatch, guestMismatchReason,
}: RoomTypeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const coverImage = type_images?.[0]?.image_url || null;
  const totalSelected = Object.values(selectedQuantities).reduce((a, b) => a + b, 0);
  const isUnavailable = available_rooms_count === 0 && room_variants.length === 0;
  const isDisabled = isGuestMismatch || isUnavailable;

  return (
    <div className={cn(
      "rounded-2xl border overflow-hidden bg-card transition-all duration-200",
      isDisabled
        ? "opacity-60 border-border/30"
        : isExpanded || totalSelected > 0
          ? "border-primary/70"
          : "border-border/30 hover:border-border/50"
    )}>
      {/* ── Collapsed Header ── */}
      <div
        onClick={() => {
          if (!isDisabled) setIsExpanded(!isExpanded);
        }}
        className={cn(
          "cursor-pointer hover:bg-white/5 transition-colors select-none",
          isDisabled && "cursor-not-allowed"
        )}
      >
        {/* Row 1: icon + name/desc + price + chevron */}
        <div className="flex items-start gap-3 px-4 pt-4 pb-3">
          {/* Square icon */}
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {coverImage ? (
              <div className="relative w-11 h-11 rounded-xl overflow-hidden">
                <Image src={coverImage} alt={name} fill sizes="44px" className="object-cover" />
              </div>
            ) : (
              <Bed className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3
              className="font-bold text-base text-foreground leading-tight cursor-pointer hover:text-primary transition-colors"
              onClick={e => { if (onViewDetails) { e.stopPropagation(); onViewDetails(); } }}
            >
              {name}
            </h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>

          {/* Price + chevron */}
          <div className="flex items-start gap-3 shrink-0">
            <div className="text-right pt-0.5">
              <p className="text-xs text-muted-foreground leading-none">from</p>
              <p className="text-2xl font-bold text-primary leading-tight mt-0.5">
                ৳{Number(base_price).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground leading-none mt-0.5">per night</p>
            </div>
            {/* Blue circle chevron */}
            <div className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300",
              "bg-primary text-white"
            )}>
              <ChevronUp className={cn("h-4 w-4 transition-transform duration-300", !isExpanded && "rotate-180")} />
            </div>
          </div>
        </div>

        {/* Row 2: stats */}
        <div className="flex items-center gap-4 px-4 pb-2 text-sm text-muted-foreground flex-wrap">
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
          {available_rooms_count > 0 && (
            <span className="text-primary font-semibold text-sm">{available_rooms_count} available</span>
          )}
        </div>

        {/* Row 3: amenity pill chips (bordered) */}
        {room_properties && room_properties.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {room_properties.slice(0, 7).map((prop, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-border/40 rounded-full px-3 py-1"
              >
                <Check className="h-3 w-3 text-primary shrink-0" />
                {prop.amenity.name}
              </span>
            ))}
            {room_properties.length > 7 && (
              <button
                onClick={e => { e.stopPropagation(); if (onViewDetails) onViewDetails(); }}
                className="text-xs text-primary hover:underline"
              >
                +{room_properties.length - 7} more
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Expanded: Variant rows ── */}
      {isExpanded && (
        <div className="animate-in slide-in-from-top-1 duration-200">
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
                amenities={room_properties}
                quantity={selectedQuantities[variant.id] ?? 0}
                available={available_rooms_count}
                onQtyChange={qty => onQuantityChange(variant.id, qty)}
                onViewDetails={onViewDetails}
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
