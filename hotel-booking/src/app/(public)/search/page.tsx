"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal, ArrowUpDown, Building2 } from "lucide-react";
import HotelFilterSidebar from "@/components/hotel/hotel-filter-sidebar";
import HotelCard, { HotelCardProps } from "@/components/hotel/hotel-card";
import SearchBar from "@/components/search/search-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const SORT_OPTIONS = [
  { label: "Price", value: "price" },
  { label: "Newest", value: "newest" },
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

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hotels, setHotels] = useState<HotelCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("newest");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const currentPage = parseInt(searchParams.get("page") || "1");
  const location = searchParams.get("location");

  useEffect(() => {
    const fetchHotels = async () => {
      setIsLoading(true);
      try {
        // Forward all URL params to the API + add sort
        const params = new URLSearchParams(searchParams.toString());
        const sortValue = sort === "price" ? `price_${sortDirection}` : sort;
        params.set("sort", sortValue);
        params.set("limit", "12");
        params.set("include_rooms", "true");

        const res = await fetch(`/api/public/hotels?${params.toString()}`);
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
  }, [searchParams, sort, sortDirection]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/search?${params.toString()}`);
  };

  const pageTitle = location
    ? `Hotels in "${location}"`
    : "Search Results";

  // Navbar is fixed h-20 (80px). 
  // Sidebar should stick right below the navbar with a small gap.
  const SIDEBAR_OFFSET = 104; // 80px (navbar) + 24px (gap)

  return (
    <div className="min-h-screen bg-background">

      {/* ── Search bar section (Scrolls naturally) ── */}
      <div className="w-full bg-secondary/10 border-b border-border/50 shadow-sm py-8 px-4 pt-28">
        <div className="container mx-auto max-w-7xl flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Search <span className="text-primary">Hotels</span></h1>
          <p className="text-muted-foreground mb-8">Find your perfect stay</p>
          <SearchBar showFilters={false} />
        </div>
      </div>

      {/* ── Content wrapper ── */}
      <div>
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ── Sidebar — desktop: sticky, NO overflow on sticky container ── */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div
                className=""
                style={{ top: SIDEBAR_OFFSET }}
              >
                <HotelFilterSidebar />
              </div>
            </aside>

            {/* ── Mobile sidebar toggle ── */}
            <div className="lg:hidden mb-4">
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

            {/* ── Main content ── */}
            <main className="flex-1 min-w-0">
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{pageTitle}</h1>
                  {!isLoading && (
                    <p className="text-muted-foreground text-sm mt-1">
                      {totalResults === 0
                        ? "No properties found"
                        : `Total ${totalResults} propert${totalResults === 1 ? "y" : "ies"}`}
                    </p>
                  )}
                </div>

                {/* Sort dropdown */}
                <div className="flex items-center gap-2 shrink-0">
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
                    onChange={(e) => setSort(e.target.value)}
                    className="h-9 rounded-lg border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <HotelCardSkeleton key={i} />
                  ))}
                </div>
              ) : hotels.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 items-start">
                    {hotels.map((hotel) => (
                      <div key={hotel.id}>
                        <HotelCard
                          {...hotel}
                          checkIn={searchParams.get("check_in") || undefined}
                          checkOut={searchParams.get("check_out") || undefined}
                          guests={searchParams.get("guests") ? parseInt(searchParams.get("guests")!) : undefined}
                          minPrice={searchParams.get("min_price") ? parseInt(searchParams.get("min_price")!) : undefined}
                          maxPrice={searchParams.get("max_price") ? parseInt(searchParams.get("max_price")!) : undefined}
                        />
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
                        onClick={() => handlePageChange(currentPage - 1)}
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
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-card rounded-3xl border border-border/50">
                  <Building2 className="h-16 w-16 text-muted-foreground/20 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No properties found</h3>
                  <p className="text-muted-foreground max-w-sm">
                    Try adjusting your search criteria or removing some filters to see more results.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => router.push("/search")}
                  >
                    Clear all filters
                  </Button>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
