"use client";

import { useEffect, useState, useMemo } from "react";
import { Sparkles } from "lucide-react";
import HotelCard, { type HotelCardProps } from "@/components/hotel/hotel-card";

import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

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
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded-md w-1/3"></div>
            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="min-w-[320px] h-[450px] bg-muted rounded-3xl shrink-0"
                />
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

            <h2 className="text-3xl md:text-5xl font-bold">
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