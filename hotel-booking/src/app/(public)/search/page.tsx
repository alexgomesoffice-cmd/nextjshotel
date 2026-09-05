"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, SlidersHorizontal, ArrowUpDown, Building2, Users, AlertCircle } from "lucide-react";
import HotelFilterSidebar from "@/components/hotel/hotel-filter-sidebar";
import HotelCard, { HotelCardProps, AccommodationContext } from "@/components/hotel/hotel-card";
import SearchBar from "@/components/search/search-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { validateBookingDateRange } from "@/lib/date-policy";

const SORT_OPTIONS = [
  { label: "Price", value: "price" },
  { label: "Newest", value: "newest" },
];

// ─── HotelCardProps extended with accommodation from API ─────────────────────
type HotelCardData = HotelCardProps & { accommodation?: AccommodationContext | null };

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

// ─── Section divider between result tiers ────────────────────────────────────
function SectionDivider({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="col-span-full flex items-center gap-4 py-2">
      <div className="flex-1 h-px bg-border/60" />
      <div className="text-center shrink-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sublabel}</p>
        )}
      </div>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

// ─── Card renderer (passes accommodation + search params) ─────────────────────
function HotelCardItem({
  hotel,
  searchParams,
}: {
  hotel: HotelCardData;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  return (
    <HotelCard
      {...hotel}
      accommodation={hotel.accommodation ?? null}
      checkIn={searchParams.get("check_in") || undefined}
      checkOut={searchParams.get("check_out") || undefined}
      guests={searchParams.get("guests") ? parseInt(searchParams.get("guests")!) : undefined}
      minPrice={searchParams.get("min_price") ? parseInt(searchParams.get("min_price")!) : undefined}
      maxPrice={searchParams.get("max_price") ? parseInt(searchParams.get("max_price")!) : undefined}
    />
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hotels, setHotels] = useState<HotelCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState("newest");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.get("page") || "1");
  const location    = searchParams.get("location");
  const checkIn     = searchParams.get("check_in");
  const checkOut    = searchParams.get("check_out");

  // Are capacity params active?
  const hasGuestsParam = !!searchParams.get("guests");

  // Validate dates from URL parameters
  useEffect(() => {
    if (checkIn && checkOut) {
      const validation = validateBookingDateRange(checkIn, checkOut);
      setDateValidationError(validation.isValid ? null : validation.message);
    } else {
      setDateValidationError(null);
    }
  }, [checkIn, checkOut]);

  useEffect(() => {
    const fetchHotels = async () => {
      if ((checkIn && !checkOut) || (!checkIn && checkOut)) {
        setHotels([]);
        setTotalResults(0);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      if (checkIn && checkOut && !validateBookingDateRange(checkIn, checkOut).isValid) {
        setHotels([]);
        setTotalResults(0);
        setTotalPages(1);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
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

  const pageTitle = location ? `Hotels in "${location}"` : "Search Results";

  const SIDEBAR_OFFSET = 104;

  // ─── Split hotels into accommodation tiers (only when guests param present) ─
  const primaryHotels     = hasGuestsParam ? hotels.filter(h => h.accommodation?.matchType === 'PRIMARY')     : [];
  const suggestedHotels   = hasGuestsParam ? hotels.filter(h => h.accommodation?.matchType === 'SUGGESTED')   : [];
  const alternativeHotels = hasGuestsParam ? hotels.filter(h => h.accommodation?.matchType === 'ALTERNATIVE') : [];
  // Hotels with no accommodation context (e.g. include_rooms was false) — treat as flat list
  const noContextHotels   = hasGuestsParam ? hotels.filter(h => !h.accommodation) : [];

  // Guest/room context summary for the result header
  const guestsVal = searchParams.get("guests");
  const roomsVal  = searchParams.get("rooms");

  return (
    <div className="min-h-screen bg-background">

      {/* ── Search bar section ── */}
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

            {/* ── Sidebar — desktop sticky ── */}
            <aside className="hidden lg:block w-72 shrink-0">
              <div className="" style={{ top: SIDEBAR_OFFSET }}>
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
              {/* Date validation error */}
              {dateValidationError && (
                <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-200 text-sm">Invalid Date Range</h3>
                    <p className="text-amber-800 dark:text-amber-300 text-sm mt-1">{dateValidationError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => router.push("/search")}
                    >
                      Clear Dates & Search Again
                    </Button>
                  </div>
                </div>
              )}

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
                  {/* Capacity context pill */}
                  {hasGuestsParam && !isLoading && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] bg-primary/8 text-primary border border-primary/20 rounded-full px-3 py-1">
                        <Users className="size-3" />
                        {guestsVal} guest{Number(guestsVal) !== 1 ? 's' : ''}
                        {roomsVal ? ` · up to ${roomsVal} room${Number(roomsVal) !== 1 ? 's' : ''}` : ''}
                      </span>
                    </div>
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

              {/* Results */}
              {isLoading ? (
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <HotelCardSkeleton key={i} />
                  ))}
                </div>
              ) : hotels.length > 0 ? (
                <>
                  {/* ── Tiered layout when guests param is present ── */}
                  {hasGuestsParam ? (
                    <div className="grid grid-cols-1 gap-6 items-start xl:grid-cols-2">

                      {/* PRIMARY tier */}
                      {primaryHotels.map((hotel) => (
                        <div key={hotel.id}>
                          <HotelCardItem hotel={hotel} searchParams={searchParams} />
                        </div>
                      ))}

                      {/* SUGGESTED tier divider */}
                      {suggestedHotels.length > 0 && (
                        <SectionDivider
                          label="Can accommodate your group"
                          sublabel="Requires more rooms than requested"
                        />
                      )}
                      {suggestedHotels.map((hotel) => (
                        <div key={hotel.id}>
                          <HotelCardItem hotel={hotel} searchParams={searchParams} />
                        </div>
                      ))}

                      {/* ALTERNATIVE tier divider */}
                      {alternativeHotels.length > 0 && (
                        <SectionDivider
                          label="Other available hotels"
                          sublabel="Cannot fully accommodate the requested group size"
                        />
                      )}
                      {alternativeHotels.map((hotel) => (
                        <div key={hotel.id}>
                          <HotelCardItem hotel={hotel} searchParams={searchParams} />
                        </div>
                      ))}

                      {/* Fallback: hotels without accommodation context */}
                      {noContextHotels.map((hotel) => (
                        <div key={hotel.id}>
                          <HotelCardItem hotel={hotel} searchParams={searchParams} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* ── Flat layout (no guests param) — existing behavior ── */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 items-start">
                      {hotels.map((hotel) => (
                        <div key={hotel.id}>
                          <HotelCardItem hotel={hotel} searchParams={searchParams} />
                        </div>
                      ))}
                    </div>
                  )}

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
