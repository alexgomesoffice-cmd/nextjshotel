"use client";

import { useEffect, useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import HotelCard, { type HotelCardProps } from "@/components/hotel/hotel-card";
import { Skeleton } from "@/components/ui/skeleton";

import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

function FeaturedHotelCardSkeleton() {
  return (
    <div className="min-w-[320px] w-[320px] shrink-0 sm:min-w-[480px] sm:w-[480px] lg:min-w-[540px] lg:w-[540px]">
      <div className="relative flex h-[610px] flex-col overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
        <Skeleton className="h-[280px] w-full rounded-none" />

        <div className="flex flex-1 flex-col border-t border-border/60 bg-card">
          <div className="flex items-center justify-between px-5 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>

          <div className="space-y-4 border-t border-border/60 px-3 py-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex gap-3">
                <Skeleton className="h-[90px] w-[140px] rounded-lg" />

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-5 w-16" />
                  </div>

                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-12" />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-12 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const FeaturedHotels = () => {
  const [hotels, setHotels] = useState<HotelCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const autoplay = useMemo(
    () =>
      Autoplay({
        delay: 3500, // slow smooth movement
        stopOnInteraction: false,
        stopOnMouseEnter: true, // IMPORTANT: hover stops automatically
        playOnInit: true
      }),
    []
  );

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await fetch("/api/public/hotels?include_rooms=true");
        if (res.ok) {
          const data = await res.json();

          if (data.success && Array.isArray(data.data)) {
            const sorted = data.data.sort(
              (a: any, b: any) =>
                (b.star_rating || 0) - (a.star_rating || 0)
            );

            setHotels(sorted.slice(0, 8));
          }
        }
      } catch (error) {
        console.error("Failed to fetch featured hotels:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, []);

  if (isLoading) {
    return (
      <section className="py-24 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="space-y-8">
            <Skeleton className="h-10 w-1/3 rounded-md" />

            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <FeaturedHotelCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (hotels.length === 0) return null;

  return (
    <section className="pt-24 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest text-primary">
                Featured Stays
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold">
              Handpicked{" "}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">
                Hotels
              </span>
            </h2>

            <p className="text-muted-foreground text-lg">
              Experience smooth infinite hotel browsing.
            </p>
          </div>
        </div>

        {/* CAROUSEL */}
        <Carousel
          plugins={[autoplay]}
          opts={{
            loop: true,
            dragFree: true,
            skipSnaps: true,
            duration: 100,
            align: "start",
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4 py-4">
            {hotels.map((hotel) => (
              <CarouselItem
                key={hotel.id}
                className="pl-4 basis-[90%] sm:basis-[360px] md:basis-1/2"
              >
                <HotelCard {...hotel} roomListMaxHeight="h-[240px]" />
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
};

export default FeaturedHotels;