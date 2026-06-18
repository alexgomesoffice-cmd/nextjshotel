"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HotelFilterSidebar from "@/components/hotel/hotel-filter-sidebar";
import HotelCard, { HotelCardProps } from "@/components/hotel/hotel-card";
import SearchBar from "@/components/search/search-bar";
import { Loader2 } from "lucide-react";

const HotelsContent = () => {
  const searchParams = useSearchParams();
  const [hotels, setHotels] = useState<HotelCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHotels = async () => {
      setIsLoading(true);
      try {
        const query = searchParams.toString();
        // If there are no search filters, request room data so cards show description/room hints
        const includeRooms = query === '' ? '?include_rooms=true' : (query ? `?${query}` : '');
        const res = await fetch(`/api/public/hotels${includeRooms}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            setHotels(data.data);
          } else {
            setHotels([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch hotels:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHotels();
  }, [searchParams]);

  return (
    <div className="flex flex-col min-h-screen bg-background pt-24 pb-12">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Top Search Bar */}
        <div className="mb-8">
          <SearchBar />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-80 shrink-0">
            <HotelFilterSidebar />
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {isLoading ? "Searching..." : `${hotels.length} Properties Found`}
              </h1>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : hotels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {hotels.map((hotel) => (
                  <div key={hotel.id} className="h-112.5">
                    <HotelCard
                      {...hotel}
                      checkIn={searchParams.get("check_in") || undefined}
                      checkOut={searchParams.get("check_out") || undefined}
                      guests={searchParams.get("guests") ? parseInt(searchParams.get("guests")!) : undefined}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center border border-border/50 rounded-3xl bg-card shadow-sm">
                <h3 className="text-xl font-semibold mb-2">No properties found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or searching a different location.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default function HotelsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center pt-24">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <HotelsContent />
    </Suspense>
  );
}
