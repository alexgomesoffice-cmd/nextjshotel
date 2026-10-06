"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  Check,
  Layers,
  Maximize2,
  Tag,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLenis } from "@/components/ui/SmoothScroll";
import { formatDiscountLabel } from "@/lib/utils";

interface RoomImage {
  id: number;
  image_url: string;
}

type ResolvedPricing = {
  basePrice: number;
  effectivePrice: number;
  discount: null | {
    ruleId: number;
    name: string;
    type: "PERCENTAGE" | "FIXED_AMOUNT";
    value: number;
    amount: number;
  };
};

export interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: {
    id: number;
    room_number?: string;
    floor?: number | null;
    pricing: ResolvedPricing;
    room_size: string | null;
    facilities: { name: string }[];
    variant_images: RoomImage[];
    type_images?: RoomImage[];
    room_type_name?: string;
  } | null;
}

function formatRoomSize(roomSize: string) {
  const size = roomSize.trim().replace(/\s*(?:sq\s*ft|sqft)\b/i, "");
  return `${size} sq ft`;
}

const RoomDetailModal = ({
  isOpen,
  onClose,
  room,
}: RoomDetailModalProps) => {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const lenis = getLenis();
    if (lenis) lenis.stop();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    setActiveImage(0);

    return () => {
      document.body.style.overflow = previousOverflow || "unset";

      const activeLenis = getLenis();
      if (activeLenis) activeLenis.start();
    };
  }, [isOpen]);

  if (!isOpen || !room) return null;

  const images =
    room.variant_images.length > 0
      ? room.variant_images
      : room.type_images ?? [];

  const hasMultipleImages = images.length > 1;

  const goToPreviousImage = () => {
    setActiveImage((current) =>
      current === 0 ? images.length - 1 : current - 1
    );
  };

  const goToNextImage = () => {
    setActiveImage((current) =>
      current === images.length - 1 ? 0 : current + 1
    );
  };

  return (
    <div
      className="
        fixed inset-0 z-[110]
        flex items-center justify-center
        bg-black/70 backdrop-blur-md
        p-0 sm:p-4 lg:p-6
      "
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-detail-title"
        className="
          relative
          flex
          w-full
          h-full
          flex-col
          overflow-hidden
          bg-background
          shadow-2xl
          sm:h-auto
          sm:max-h-[92vh]
          sm:max-w-6xl
          sm:rounded-[28px]
          lg:flex-row
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* =========================================================
              LEFT — IMAGE GALLERY
          ========================================================== */}
          <div className="relative flex h-[30vh] min-h-[180px] max-h-[240px] w-full shrink-0 flex-col bg-black sm:h-[32vh] sm:min-h-[220px] sm:max-h-[280px] lg:h-auto lg:min-h-0 lg:max-h-none lg:w-1/2">
            {images.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <Image
                    src={images[activeImage].image_url}
                    alt={`Room ${room.room_number}`}
                    fill
                    priority
                    className="object-cover"
                  />

                  {/* Image gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/10" />

                  {/* Image counter */}
                  {hasMultipleImages && (
                    <div
                      className="
                        absolute
                        right-4
                        top-4
                        rounded-full
                        border border-white/20
                        bg-black/45
                        px-2.5
                        py-1
                        text-[11px]
                        font-medium
                        text-white
                        backdrop-blur-md
                      "
                    >
                      {activeImage + 1} / {images.length}
                    </div>
                  )}

                  {/* Previous arrow */}
                  {hasMultipleImages && (
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      aria-label="Previous image"
                      className="
                        absolute
                        left-3
                        top-1/2
                        flex
                        h-10
                        w-10
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/20
                        bg-black/40
                        text-white
                        backdrop-blur-md
                        transition-all
                        hover:scale-105
                        hover:bg-black/65
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-white
                      "
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}

                  {/* Next arrow */}
                  {hasMultipleImages && (
                    <button
                      type="button"
                      onClick={goToNextImage}
                      aria-label="Next image"
                      className="
                        absolute
                        right-3
                        top-1/2
                        flex
                        h-10
                        w-10
                        -translate-y-1/2
                        items-center
                        justify-center
                        rounded-full
                        border
                        border-white/20
                        bg-black/40
                        text-white
                        backdrop-blur-md
                        transition-all
                        hover:scale-105
                        hover:bg-black/65
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-white
                      "
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}

                  {/* Image title */}
                  <div className="absolute bottom-4 left-5 right-5 sm:bottom-5 sm:left-6 sm:right-6">
                    {room.room_type_name && (
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/75 sm:text-xs">
                        {room.room_type_name}
                      </p>
                    )}

                    <h2 className="text-xl font-semibold leading-tight tracking-tight text-white drop-shadow-lg sm:text-2xl">
                      Room {room.room_number}
                    </h2>
                  </div>
                </div>

                {/* Thumbnail strip */}
                {hasMultipleImages && (
                  <div className="shrink-0 border-t border-white/10 bg-black px-4 py-3">
                    <div
                      className="flex gap-2.5 overflow-x-auto pb-1"
                      style={{
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                      }}
                    >
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          type="button"
                          onClick={() => setActiveImage(idx)}
                          aria-label={`View room image ${idx + 1}`}
                          aria-current={activeImage === idx}
                          className={`
                            relative
                            h-14
                            w-20
                            shrink-0
                            overflow-hidden
                            rounded-xl
                            border-2
                            transition-all
                            duration-200
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-primary
                            focus-visible:ring-offset-2
                            ${
                              activeImage === idx
                                ? "border-primary opacity-100"
                                : "border-transparent opacity-55 hover:opacity-100"
                            }
                          `}
                        >
                          <Image
                            src={img.image_url}
                            alt={`Room thumbnail ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/40">
                <div className="px-5 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm">
                    <Maximize2 className="h-5 w-5" />
                  </div>

                  <p className="text-sm font-semibold">
                    No images available
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    There are no photos available for this room.
                  </p>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Room {room.room_number}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================
              RIGHT — DETAILS
          ========================================================== */}
          <div className="flex min-h-0 flex-1 flex-col bg-background lg:w-1/2">
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-7">
              <div className="min-w-0">
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
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-muted/40 transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable content */}
            <div
              className="
                min-h-0
                flex-1
                overflow-y-auto
                overscroll-contain
                custom-scrollbar
              "
              data-lenis-prevent
              data-lenis-prevent-wheel
              data-lenis-prevent-touch
            >
              <div className="space-y-5 p-5 sm:space-y-6 sm:p-7">
                {/* =====================================================
                    ROOM OVERVIEW
                ====================================================== */}
                <section>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-5 w-1 rounded-full bg-primary" />
                    <h3 className="text-base font-semibold">Room information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    {/* Size */}
                    {room.room_size && (
                      <div
                        className="group rounded-xl border border-border/60 bg-muted/30 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div
                          className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </div>

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Room size
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {formatRoomSize(room.room_size)}
                        </p>
                      </div>
                    )}

                    {/* Floor */}
                    {room.floor != null && (
                      <div
                        className="group rounded-xl border border-border/60 bg-muted/30 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                      >
                        <div
                          className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"
                        >
                          <Layers className="h-4 w-4" />
                        </div>

                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Location
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          Floor {room.floor}
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* =====================================================
                    FACILITIES
                ====================================================== */}
                {room.facilities.length > 0 && (
                  <section>
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Included
                      </p>

                      <h3 className="mt-1 text-lg font-semibold">
                        Room facilities
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {room.facilities.map((facility) => (
                        <div
                          key={facility.name}
                          className="
                            flex
                            min-h-12
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-border/50
                            bg-secondary/20
                            px-3.5
                            py-3
                            transition-all
                            hover:border-primary/30
                            hover:bg-primary/5
                          "
                        >
                          <div
                            className="
                              flex
                              h-8
                              w-8
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              bg-primary/10
                              text-primary
                            "
                          >
                            <Check className="h-4 w-4" />
                          </div>

                          <span className="text-sm font-medium leading-tight">
                            {facility.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* =====================================================
                    ROOM NOTE
                ====================================================== */}
                <div
                  className="
                    rounded-2xl
                    border
                    border-primary/20
                    bg-primary/[0.045]
                    p-4
                  "
                >
                  <div className="flex gap-3">
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-primary/10
                        text-primary
                      "
                    >
                      <Check className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold">
                        Comfortable stay
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        This room includes the facilities listed above and is
                        part of the selected room type.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* =========================================================
                PRICE FOOTER
            ========================================================== */}
            <div
              className="
                shrink-0
                border-t
                border-border/60
                bg-secondary/[0.08]
                px-6
                py-3
                sm:px-8
              "
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Price per night
                  </p>

                  <div className="mt-1">
                    {room.pricing.discount && (
                      <p className="text-sm text-muted-foreground line-through">
                        TK{" "}
                        {Number(
                          room.pricing.basePrice
                        ).toLocaleString()}
                      </p>
                    )}

                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-bold tracking-tight">
                        TK{" "}
                        {Number(
                          room.pricing.effectivePrice
                        ).toLocaleString()}
                      </span>

                      <span className="text-xs text-muted-foreground">
                        / night
                      </span>
                    </div>
                  </div>

                  {room.pricing.discount && (
                    <div
                      className="
                        mt-2
                        inline-flex
                        items-center
                        gap-1.5
                        rounded-full
                        bg-primary/10
                        px-2.5
                        py-1
                        text-[11px]
                        font-semibold
                        text-primary
                      "
                    >
                      <Tag className="h-3 w-3" />
                      {formatDiscountLabel(room.pricing.discount)}
                    </div>
                  )}
                </div>

                <Button
                  onClick={onClose}
                  size="lg"
                  className="
                    min-h-11
                    rounded-xl
                    px-7
                    shadow-sm
                    transition-all
                    hover:-translate-y-0.5
                    hover:shadow-md
                  "
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
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
              background: hsl(var(--muted-foreground) / 0.35);
            }

            @media (max-width: 1023px) {
              .custom-scrollbar::-webkit-scrollbar {
                width: 4px;
              }
            }
          `,
        }}
      />
    </div>
  );
};

export default RoomDetailModal;
