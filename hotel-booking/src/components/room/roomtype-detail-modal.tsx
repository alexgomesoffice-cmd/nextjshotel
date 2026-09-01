"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  Users,
  Bed,
  CheckCircle2,
  Wind,
  Tv,
  Coffee,
  Bath,
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from "lucide-react";
import { getAmenityIcon } from "@/lib/amenity-icons";
import { Button } from "@/components/ui/button";
import { getLenis } from "@/components/ui/SmoothScroll";

interface RoomTypeImage {
  id: number;
  image_url: string;
}

interface RoomBedType {
  bed_type: {
    name: string;
  };
  count: number;
}

interface RoomTypeAmenity {
  amenity: {
    name: string;
    icon: string | null;
  };
}

type ResolvedPricing = {
  basePrice: number;
  effectivePrice: number;
  discount: null | { ruleId: number; name: string; type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; amount: number };
};

interface RoomTypeVariant {
  id: number;
  room_size: string | null;
  max_occupancy: number | null;
  bed_types: RoomBedType[];
  pricing: ResolvedPricing;
}

export interface RoomTypeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomType: {
    id: number;
    name: string;
    description: string | null;
    type_images: RoomTypeImage[];
    room_type_amenities: RoomTypeAmenity[];
    available_rooms_count: number;
    room_variants: RoomTypeVariant[];
  } | null;
}

const getIconForAmenity = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ac') || lower.includes('air')) return <Wind className="h-5 w-5" />;
  if (lower.includes('tv') || lower.includes('television')) return <Tv className="h-5 w-5" />;
  if (lower.includes('coffee') || lower.includes('tea')) return <Coffee className="h-5 w-5" />;
  if (lower.includes('bath') || lower.includes('shower')) return <Bath className="h-5 w-5" />;
  return <CheckCircle2 className="h-5 w-5 text-primary" />;
};

const RoomTypeDetailModal = ({ isOpen, onClose, roomType }: RoomTypeDetailModalProps) => {
  const [activeImage, setActiveImage] = useState(0);

useEffect(() => {
  if (!isOpen) return;

  const lenis = getLenis();
  if (lenis) lenis.stop();

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  return () => {
    document.body.style.overflow = previousOverflow || "unset";
    const activeLenis = getLenis();
    if (activeLenis) activeLenis.start();
  };
}, [isOpen]);

  if (!isOpen || !roomType) return null;

  const cheapestVariant = roomType.room_variants.reduce<RoomTypeVariant | null>((min, v) =>
    !min || v.pricing.effectivePrice < min.pricing.effectivePrice ? v : min, null);
  const maxOccupancy = roomType.room_variants.reduce((max, v) => Math.max(max, v.max_occupancy ?? 0), 0);
  const roomSizes = [...new Set(roomType.room_variants.map((v) => v.room_size).filter(Boolean))];
  const allBedTypes = roomType.room_variants.flatMap((v) => v.bed_types);

  return (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-0 backdrop-blur-md sm:p-4 lg:p-6"
    onClick={onClose}
    role="dialog"
    aria-modal="true"
    aria-labelledby="room-detail-title"
  >
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-auto sm:max-h-[92vh] sm:max-w-6xl sm:rounded-[28px] lg:flex-row"
      onClick={(e) => e.stopPropagation()}
    >
      {/* =========================================================
          LEFT — IMAGE GALLERY
      ========================================================= */}
      <div className="relative flex min-h-[38vh] w-full shrink-0 flex-col bg-black lg:h-auto lg:min-h-0 lg:w-1/2">
        {roomType.type_images && roomType.type_images.length > 0 ? (
          <>
            {/* Main Image */}
            <div className="relative min-h-0 flex-1">
              <Image
                src={roomType.type_images[activeImage].image_url}
                alt={`${roomType.name} - image ${activeImage + 1}`}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Image Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Room Type Badge */}
              <div className="absolute left-5 top-5">
                <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                  Room Type
                </span>
              </div>

              {/* Image Counter */}
              {roomType.type_images.length > 1 && (
                <div className="absolute bottom-5 right-5 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                  {activeImage + 1} / {roomType.type_images.length}
                </div>
              )}

              {/* Previous */}
              {roomType.type_images.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage((current) =>
                      current === 0
                        ? roomType.type_images.length - 1
                        : current - 1
                    )
                  }
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}

              {/* Next */}
              {roomType.type_images.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveImage((current) =>
                      current === roomType.type_images.length - 1
                        ? 0
                        : current + 1
                    )
                  }
                  aria-label="Next image"
                  className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-black/55 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}

              {/* Room Name on Image */}
              <div className="absolute bottom-5 left-5 max-w-[70%] text-white">
                <h2
                  id="room-detail-title"
                  className="text-2xl font-semibold tracking-tight drop-shadow-lg sm:text-3xl"
                >
                  {roomType.name}
                </h2>
              </div>
            </div>

            {/* Thumbnails */}
            {roomType.type_images.length > 1 && (
              <div className="shrink-0 border-t border-white/10 bg-black px-4 py-3">
                <div className="flex gap-2.5 overflow-x-auto pb-1 hide-scrollbar">
                  {roomType.type_images.map((img, idx) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImage(idx)}
                      aria-label={`View image ${idx + 1}`}
                      aria-current={activeImage === idx}
                      className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary ${
                        activeImage === idx
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-black"
                          : "opacity-50 hover:opacity-100"
                      }`}
                    >
                      <Image
                        src={img.image_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-background">
                <Maximize2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No room images available
              </p>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          RIGHT — ROOM DETAILS
      ========================================================= */}
      <div className="flex min-h-0 flex-1 flex-col bg-background lg:w-1/2">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Room details
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything you need to know
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close room details"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted/40 transition-all hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Details */}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          <div className="space-y-7 p-5 sm:p-7">
            {/* Room Summary */}
            <div>
              <h3 className="text-xl font-semibold tracking-tight">
                {roomType.name}
              </h3>

              {roomType.description && (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {roomType.description}
                </p>
              )}
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-muted/30 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>

                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Occupancy
                </p>

                <p className="mt-1 text-sm font-semibold">
                  Up to {maxOccupancy} Adults
                </p>
              </div>

              {roomSizes.length > 0 && (
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Wind className="h-4 w-4" />
                  </div>

                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Room Size
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {roomSizes.join(" / ")} sq ft
                  </p>
                </div>
              )}

              <div className="col-span-2 flex items-center justify-between rounded-2xl border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Availability
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">
                      {roomType.available_rooms_count}{" "}
                      {roomType.available_rooms_count === 1
                        ? "Room"
                        : "Rooms"}{" "}
                      Available
                    </p>
                  </div>
                </div>

                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              </div>
            </div>

            {/* Bed Configuration */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h3 className="text-base font-semibold">
                  Bed configuration
                </h3>
              </div>

              <div className="space-y-2">
                {allBedTypes.map((bed, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Bed className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        {bed.bed_type.name}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Quantity: {bed.count}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Amenities */}
            <section>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-5 w-1 rounded-full bg-primary" />
                <h3 className="text-base font-semibold">
                  Room amenities
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {roomType.room_type_amenities?.map((prop, idx) => {
                  const Icon = getAmenityIcon(prop.amenity.icon);

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>

                      <span className="text-sm">
                        {prop.amenity.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>

        {/* Pricing Footer */}
        <div className="shrink-0 border-t border-border bg-background px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Starting from
              </p>

              <div className="mt-1 flex items-baseline gap-2">
                {cheapestVariant?.pricing.discount && (
                  <span className="text-sm text-muted-foreground line-through">
                    TK{" "}
                    {Number(
                      cheapestVariant.pricing.basePrice
                    ).toLocaleString()}
                  </span>
                )}

                <span className="text-2xl font-bold tracking-tight">
                  TK{" "}
                  {Number(
                    cheapestVariant?.pricing.effectivePrice ?? 0
                  ).toLocaleString()}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-muted-foreground">
                per night
              </p>
            </div>

            <Button
              onClick={onClose}
              size="lg"
              className="min-h-11 rounded-xl px-6 font-semibold"
            >
              Done
            </Button>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }

            .hide-scrollbar {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }

            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }

            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: hsl(var(--border));
              border-radius: 999px;
            }

            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: hsl(var(--muted-foreground) / 0.3);
            }

            @media (prefers-reduced-motion: reduce) {
              *,
              *::before,
              *::after {
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                transition-duration: 0.01ms !important;
              }
            }
          `,
        }}
      />
    </div>
  </div>
);

};

export default RoomTypeDetailModal;
