"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import HotelCard, { type HotelCardProps } from "@/components/hotel/hotel-card";

const FeaturedHotels = () => {
  const [hotels, setHotels] = useState<HotelCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const res = await fetch("/api/public/hotels");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            // Sort by star rating or guest rating ideally, we'll just take the top 8
            const sorted = data.data.sort((a: any, b: any) => (b.star_rating || 0) - (a.star_rating || 0));
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

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { current } = scrollContainerRef;
      const scrollAmount = direction === "left" ? -400 : 400;
      current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <section className="py-24 bg-secondary/20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="animate-pulse space-y-8">
            <div className="h-10 bg-muted rounded-md w-1/3"></div>
            <div className="flex gap-6 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-[320px] h-[450px] bg-muted rounded-3xl shrink-0"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (hotels.length === 0) return null;

  return (
    <section className="pt-24 bg-secondary/20 relative">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="text-sm font-bold uppercase tracking-widest text-primary">Featured Stays</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Handpicked <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Hotels</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Experience unparalleled comfort and exceptional service at our most highly-rated properties across the country.
            </p>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-12 w-12 border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-sm"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-12 w-12 border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 shadow-sm"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto gap-6 pt-8 snap-x snap-mandatory hide-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {hotels.map((hotel) => (
            <div key={hotel.id} className="min-w-[85vw] sm:min-w-[340px] max-w-[380px] shrink-0 snap-start ">
              <HotelCard {...hotel} />
            </div>
          ))}
        </div>
        
        {/* Mobile controls */}
        <div className="flex md:hidden justify-center items-center gap-4 mt-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-12 w-12"
              onClick={() => scroll("left")}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full h-12 w-12"
              onClick={() => scroll("right")}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
        </div>

      </div>
      
      {/* Global style to hide scrollbar for webkit */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}} />
    </section>
  );
};

export default FeaturedHotels;
