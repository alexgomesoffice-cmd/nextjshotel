"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Loader2 } from "lucide-react";

interface City {
  id: number;
  name: string;
  image_url: string | null;
  is_active: boolean;
}

function CityCardSkeleton() {
  return (
    <div className="rounded-3xl overflow-hidden h-72 bg-muted animate-pulse" />
  );
}

function DestinationsContent() {
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/cities")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCities(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        {/* Page header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <MapPin className="h-3.5 w-3.5" />
            Explore Bangladesh
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            Explore{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Destinations
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find hotels across Bangladesh&apos;s most visited cities — from
            bustling Dhaka to serene Cox&apos;s Bazar.
          </p>
        </div>

        {/* Cities grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <CityCardSkeleton key={i} />
            ))}
          </div>
        ) : cities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cities.map((city) => (
              <Link
                key={city.id}
                href={`/search?location=${encodeURIComponent(city.name)}`}
                className="group relative block h-72 rounded-3xl overflow-hidden bg-muted shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
              >
                {/* Background image */}
                {city.image_url ? (
                  <Image
                    src={city.image_url}
                    alt={city.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/60 via-primary/40 to-primary/20" />
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 group-hover:from-black/90" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-white/80" />
                      <span className="text-white/70 text-sm font-medium">Bangladesh</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                      {city.name}
                    </h2>
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs text-white font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      Explore hotels →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <MapPin className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No destinations found</h3>
            <p className="text-muted-foreground">
              Destinations will appear here once cities are added.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DestinationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <DestinationsContent />
    </Suspense>
  );
}
