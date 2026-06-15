"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface City {
  id: number;
  name: string;
  image_url: string | null;
  hotelsCount?: number;
}

const DestinationsSection = () => {
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch("/api/public/cities");

        if (res.ok) {
          const data = await res.json();

          if (data.success && Array.isArray(data.data)) {
            setCities(data.data.slice(0, 6));
          }
        }
      } catch (error) {
        console.error("Failed to fetch destinations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCities();
  }, []);

  if (isLoading) {
    return (
      <section className="pt-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 w-1/3 rounded-md bg-muted" />

            <div className="grid auto-rows-[200px] grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[260px] md:gap-5 lg:grid-cols-4">
              <div className="rounded-3xl bg-muted lg:row-span-2" />
              <div className="rounded-3xl bg-muted" />
              <div className="rounded-3xl bg-muted" />
              <div className="rounded-3xl bg-muted" />
              <div className="rounded-3xl bg-muted" />
              <div className="rounded-3xl bg-muted lg:row-span-2" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (cities.length === 0) return null;

  const orderedCities =
  cities.length >= 6
    ? [
        cities[0], // Tall Left
        cities[1], // Top Middle
        cities[2], // Top Middle
        cities[5], // Tall Right
        cities[3], // Bottom Middle
        cities[4], // Bottom Middle
      ]
    : cities.slice(0, 6);

  return (
    <section className="relative overflow-hidden bg-background py-24">
      {/* Decorative Blurs */}
      <div className="pointer-events-none absolute top-0 right-0 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent/5 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-8">
        {/* Header */}
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-5xl">
              Explore Popular{" "}
              <span className="bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                Destinations
              </span>
            </h2>

            <p className="text-lg text-muted-foreground">
              Discover handpicked locations offering the best stays,
              stunning views, and unforgettable experiences.
            </p>
          </div>

          <Button
            asChild
            variant="ghost"
            className="group hidden items-center gap-2 hover:bg-primary/5 md:flex"
          >
            <Link href="/destinations">
              View All Destinations
              <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>

        {/* Destination Grid */}
        <div className="grid auto-rows-[200px] grid-cols-1 gap-4 sm:grid-cols-2 md:auto-rows-[260px] md:gap-5 lg:grid-cols-4">
          {orderedCities.map((city, index) => {
            const isTall = index === 0 || index === 3;

            return (
              <Link
                key={city.id}
                href={`/search?location=${encodeURIComponent(city.name)}`}
                className={`group relative overflow-hidden rounded-3xl shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
                  isTall ? "lg:row-span-2" : ""
                }`}
              >
                {/* Image */}
                <div className="absolute inset-0">
                  {city.image_url ? (
                    <Image
                      src={city.image_url}
                      alt={city.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width:768px) 100vw,
                             (max-width:1024px) 50vw,
                             25vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary">
                      <MapPin className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                {/* Content */}
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="mb-1 text-2xl font-bold text-white">
                    {city.name}
                  </h3>

                  <p className="flex items-center gap-1.5 text-sm text-white/80">
                    <MapPin className="h-3.5 w-3.5" />
                    Explore hotels in {city.name}
                  </p>
                </div>

                {/* Floating Arrow */}
                
              </Link>
            );
          })}
        </div>

        {/* Mobile CTA */}
        <Button asChild variant="outline" className="group mt-8 w-full md:hidden">
          <Link
            href="/destinations"
            className="flex w-full items-center justify-center gap-2"
          >
            View All Destinations
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default DestinationsSection;