"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { MapPin, Loader2, Building2, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import HotelFilterSidebar from "@/components/hotel/hotel-filter-sidebar";
import HotelCard, { HotelCardProps } from "@/components/hotel/hotel-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price", value: "price" },
  { label: "Top Rated", value: "rating" },
];

function HotelCardSkeleton() {
  return (
    <div className="rounded-3xl border border-border/50 bg-card overflow-hidden">
      <Skeleton className="h-56 w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-10 w-full mt-2" />
      </div>
    </div>
  );
}

function CityHotelsContent() {
  const params = useParams();
  const router = useRouter();
  const cityName = decodeURIComponent(params.name as string);

  const [hotels, setHotels] = useState<HotelCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  useEffect(() => {
    const fetchHotels = async () => {
      setIsLoading(true);
      try {
        const query = new URLSearchParams({
          location: cityName,
          sort: sort === "price" ? `price_${sortDirection}` : sort,
          page: String(currentPage),
          limit: "12",
        });

        const res = await fetch(`/api/public/hotels?${query.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setHotels(Array.isArray(data.data) ? data.data : []);
            if (data.pagination) {
              setTotalResults(data.pagination.total);
              setTotalPages(data.pagination.totalPages);
            }
          } else {
            setHotels([]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch hotels:", error);
        setHotels([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, [cityName, sort, sortDirection, currentPage]);

  return (
    <div className="min-h-screen bg-background pt-28 pb-20">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        {/* Page header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-3">
            <button onClick={() => router.push("/destinations")} className="hover:text-primary transition-colors">
              Destinations
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">{cityName}</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mt-1">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                Hotels in{" "}
                <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {cityName}
                </span>
              </h1>
              {!isLoading && (
                <p className="text-muted-foreground mt-2">
                  {totalResults === 0
                    ? "No properties found in this city"
                    : `${totalResults} propert${totalResults === 1 ? "y" : "ies"} available`}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-28">
              <HotelFilterSidebar />
            </div>
          </aside>

          {/* Mobile sidebar toggle */}
          <div className="lg:hidden mb-4 w-full">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showMobileSidebar ? "Hide Filters" : "Show Filters"}
            </Button>
            {showMobileSidebar && (
              <div className="mt-4 p-4 bg-card rounded-2xl border border-border/50">
                <HotelFilterSidebar />
              </div>
            )}
          </div>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            {/* Sort row */}
            <div className="flex items-center justify-end gap-3 mb-6">
              <Button
  variant="outline"
  size="icon"
  onClick={() =>
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
  }
>
  <ArrowUpDown
    className={`h-4 w-4 transition-transform ${
      sortDirection === "desc" ? "rotate-180" : ""
    }`}
  />
</Button>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setCurrentPage(1); }}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <HotelCardSkeleton key={i} />
                ))}
              </div>
            ) : hotels.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {hotels.map((hotel) => (
                    <div key={hotel.id} className="h-[420px]">
                      <HotelCard {...hotel} />
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-10">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-3">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-card rounded-3xl border border-border/50">
                <Building2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No hotels found in {cityName}</h3>
                <p className="text-muted-foreground max-w-sm">
                  There are currently no published hotels in this city. Check back later or explore other destinations.
                </p>
                <Button
                  variant="outline"
                  className="mt-6"
                  onClick={() => router.push("/destinations")}
                >
                  Browse all destinations
                </Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function CityHotelsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <CityHotelsContent />
    </Suspense>
  );
}
