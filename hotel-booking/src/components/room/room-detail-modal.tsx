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
        bg-black/65 backdrop-blur-md
        p-3 sm:p-5 lg:p-8
        animate-in fade-in duration-300
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
          max-w-6xl
          xl:max-w-7xl
          max-h-[96vh]
          overflow-hidden
          rounded-[28px]
          border border-border/60
          bg-background
          shadow-[0_30px_100px_rgba(0,0,0,0.30)]
          animate-in
          zoom-in-95
          duration-300
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* =========================================================
            CLOSE BUTTON
        ========================================================== */}
        <button
          onClick={onClose}
          aria-label="Close room details"
          className="
            absolute
            right-4
            top-4
            z-50
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-full
            border
            border-white/20
            bg-black/45
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
          <X className="h-5 w-5" />
        </button>

        <div className="grid w-full min-h-0 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
          {/* =========================================================
              LEFT — IMAGE GALLERY
          ========================================================== */}
          <div className="relative flex min-h-[420px] flex-col bg-muted/20 lg:min-h-[700px]">
            {images.length > 0 ? (
              <>
                {/* Main Image */}
                <div className="relative min-h-0 flex-1 overflow-hidden">
                  <Image
                    src={images[activeImage].image_url}
                    alt={`Room ${room.room_number}`}
                    fill
                    priority
                    className="
                      object-cover
                      transition-transform
                      duration-500
                    "
                  />

                  {/* Image gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/10" />

                  {/* Image counter */}
                  {hasMultipleImages && (
                    <div
                      className="
                        absolute
                        right-5
                        top-5
                        rounded-full
                        border border-white/20
                        bg-black/45
                        px-3
                        py-1.5
                        text-xs
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
                        left-5
                        top-1/2
                        flex
                        h-11
                        w-11
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
                        right-5
                        top-1/2
                        flex
                        h-11
                        w-11
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
                  <div className="absolute bottom-6 left-6 right-6">
                    {room.room_type_name && (
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                        {room.room_type_name}
                      </p>
                    )}

                    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      Room {room.room_number}
                    </h2>
                  </div>
                </div>

                {/* Thumbnail strip */}
                {hasMultipleImages && (
                  <div className="shrink-0 border-t border-border/40 bg-background p-4">
                    <div
                      className="flex gap-3 overflow-x-auto pb-1"
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
                            h-16
                            w-24
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
              <div className="flex min-h-[420px] flex-1 items-center justify-center bg-muted/40">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-background text-muted-foreground shadow-sm">
                    <Maximize2 className="h-6 w-6" />
                  </div>

                  <p className="text-sm font-semibold">
                    No images available
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    There are no photos available for this room.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================
              RIGHT — DETAILS
          ========================================================== */}
          <div className="flex min-h-0 flex-col bg-background">
            {/* Header */}
            <div className="shrink-0 border-b border-border/50 px-6 py-6 sm:px-8">
              <div className="pr-12">
                {room.room_type_name && (
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {room.room_type_name}
                  </p>
                )}

                <h2
                  id="room-detail-title"
                  className="text-3xl font-bold tracking-tight"
                >
                  Room {room.room_number}
                </h2>

                {room.floor != null && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Layers className="h-4 w-4 text-primary" />
                    Floor {room.floor}
                  </div>
                )}
              </div>
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
              <div className="space-y-7 p-6 sm:p-8">
                {/* =====================================================
                    ROOM OVERVIEW
                ====================================================== */}
                <section>
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Overview
                    </p>

                    <h3 className="mt-1 text-lg font-semibold">
                      Room information
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Size */}
                    {room.room_size && (
                      <div
                        className="
                          group
                          rounded-2xl
                          border
                          border-border/60
                          bg-secondary/30
                          p-4
                          transition-colors
                          hover:border-primary/30
                          hover:bg-primary/5
                        "
                      >
                        <div
                          className="
                            mb-3
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            bg-primary/10
                            text-primary
                          "
                        >
                          <Maximize2 className="h-5 w-5" />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Room size
                        </p>

                        <p className="mt-1 font-semibold">
                          {room.room_size}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            sq ft
                          </span>
                        </p>
                      </div>
                    )}

                    {/* Floor */}
                    {room.floor != null && (
                      <div
                        className="
                          group
                          rounded-2xl
                          border
                          border-border/60
                          bg-secondary/30
                          p-4
                          transition-colors
                          hover:border-primary/30
                          hover:bg-primary/5
                        "
                      >
                        <div
                          className="
                            mb-3
                            flex
                            h-10
                            w-10
                            items-center
                            justify-center
                            rounded-xl
                            bg-primary/10
                            text-primary
                          "
                        >
                          <Layers className="h-5 w-5" />
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Location
                        </p>

                        <p className="mt-1 font-semibold">
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
                      {room.pricing.discount.name}
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
