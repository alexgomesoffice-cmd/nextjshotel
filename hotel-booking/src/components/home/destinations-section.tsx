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
            // For demo, we just take the first 6 cities to fit nicely in a grid
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
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded-md w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-72 bg-muted rounded-3xl"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (cities.length === 0) return null;

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Explore Popular <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Destinations</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Discover handpicked locations offering the best stays, stunning views, and unforgettable experiences.
            </p>
          </div>
          <Button variant="ghost" className="group hidden md:flex items-center gap-2 hover:bg-primary/5">
            View All Destinations
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 text-primary" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city, index) => (
            <Link 
              key={city.id} 
              href={`/search?location=${encodeURIComponent(city.name)}`}
              className="group relative h-72 sm:h-80 rounded-3xl overflow-hidden block shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-muted">
                {city.image_url ? (
                  <Image
                    src={city.image_url}
                    alt={city.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                    <MapPin className="h-12 w-12 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              
              {/* Gradient overlay for text readability */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent transition-opacity duration-500 group-hover:from-black/90" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 w-full p-6 transform transition-transform duration-500">
                <div className="flex items-center gap-2 mb-2 opacity-0 -translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                  <span className="text-primary-foreground/90 text-xs font-medium uppercase tracking-wider bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full">
                    Top Rated
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-primary-foreground transition-colors">
                  {city.name}
                </h3>
                <p className="text-white/70 text-sm flex items-center gap-1.5 group-hover:text-white/90 transition-colors">
                  <MapPin className="h-3.5 w-3.5" />
                  Explore hotels in {city.name}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-8 md:hidden group">
          View All Destinations
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </section>
  );
};

export default DestinationsSection;
