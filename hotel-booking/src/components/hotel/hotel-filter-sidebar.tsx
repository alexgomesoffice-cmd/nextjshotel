"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Filter, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterOption {
  id: string | number;
  label: string;
}

export type HotelSearchFilters = {
  priceMin?: number;
  priceMax?: number;
  starRatings: number[];
  hotelTypes: string[];
  amenities: string[];
  roomTypes: string[];
  bedTypes: string[];
};

type FilterCheckboxCategory = 'starRatings' | 'hotelTypes' | 'amenities' | 'roomTypes' | 'bedTypes';
type FilterCheckboxValue = number | string;

interface HotelTypeApiItem {
  name: string;
}

interface AmenityApiItem {
  id: string | number;
  name: string;
  context: string;
}

const HotelFilterSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filter state
  const [filters, setFilters] = useState<HotelSearchFilters>({
    starRatings: [],
    hotelTypes: [],
    amenities: [],
    roomTypes: [],
    bedTypes: [],
  });

  // Options state
  const [hotelTypeOptions, setHotelTypeOptions] = useState<FilterOption[]>([]);
  const [amenityOptions, setAmenityOptions] = useState<FilterOption[]>([]);
  
  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    price: true,
    star: true,
    hotelType: true,
    amenities: false,
    roomType: false,
    bedType: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Load Initial Params
  useEffect(() => {
    const starRatings = searchParams.get("stars")?.split(",").map(Number).filter(Boolean) || [];
    const hotelTypes = searchParams.get("hotel_types")?.split(",").filter(Boolean) || [];
    const amenities = searchParams.get("amenities")?.split(",").filter(Boolean) || [];
    const roomTypes = searchParams.get("room_types")?.split(",").filter(Boolean) || [];
    const bedTypes = searchParams.get("bed_types")?.split(",").filter(Boolean) || [];
    const priceMin = searchParams.get("min_price") ? Number(searchParams.get("min_price")) : undefined;
    const priceMax = searchParams.get("max_price") ? Number(searchParams.get("max_price")) : undefined;

    const nextFilters: HotelSearchFilters = {
      starRatings,
      hotelTypes,
      amenities,
      roomTypes,
      bedTypes,
      priceMin,
      priceMax,
    };

    Promise.resolve().then(() => {
      setFilters(nextFilters);
    });
  }, [searchParams]);

  // Fetch dynamic options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [htRes, amRes] = await Promise.all([
          fetch("/api/public/hotel-types"),
          fetch("/api/public/amenities?flat=1")
        ]);

        if (htRes.ok) {
          const htData = await htRes.json();
          if (htData.success) {
            setHotelTypeOptions(htData.data.map((ht: HotelTypeApiItem) => ({ id: ht.name, label: ht.name })));
          }
        }
        
        if (amRes.ok) {
          const amData = await amRes.json();
          if (amData.success) {
            // Filter to only HOTEL context amenities for this sidebar
            const hotelAmenities = amData.data.filter((a: AmenityApiItem) => a.context === 'HOTEL');
            setAmenityOptions(hotelAmenities.map((a: AmenityApiItem) => ({ id: a.id.toString(), label: a.name })));
          }
        }
      } catch (e) {
        console.error("Failed to load filter metadata:", e);
      }
    };
    fetchOptions();
  }, []);

  // Update URL
  const applyFilters = useCallback((newFilters: HotelSearchFilters) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newFilters.starRatings.length > 0) params.set("stars", newFilters.starRatings.join(","));
    else params.delete("stars");

    if (newFilters.hotelTypes.length > 0) params.set("hotel_types", newFilters.hotelTypes.join(","));
    else params.delete("hotel_types");

    if (newFilters.amenities.length > 0) params.set("amenities", newFilters.amenities.join(","));
    else params.delete("amenities");

    if (newFilters.roomTypes.length > 0) params.set("room_types", newFilters.roomTypes.join(","));
    else params.delete("room_types");

    if (newFilters.bedTypes.length > 0) params.set("bed_types", newFilters.bedTypes.join(","));
    else params.delete("bed_types");

    if (newFilters.priceMin) params.set("min_price", newFilters.priceMin.toString());
    else params.delete("min_price");

    if (newFilters.priceMax) params.set("max_price", newFilters.priceMax.toString());
    else params.delete("max_price");

    // Reset to page 1 when filtering
    params.delete("page");

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const handleCheckboxChange = (category: FilterCheckboxCategory, value: FilterCheckboxValue, checked: boolean) => {
    const currentArray = (filters[category] as Array<string | number>) || [];
    const newArray = checked 
      ? [...currentArray, value] 
      : currentArray.filter(item => item !== value);
    
    const newFilters = { ...filters, [category]: newArray };
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handlePriceChange = (min?: number, max?: number) => {
    const newFilters = { ...filters, priceMin: min, priceMax: max };
    setFilters(newFilters);
    // Usually debounce this or apply on blur/button click
  };

  const handleApplyPrice = () => {
    applyFilters(filters);
  }

  const clearFilters = () => {
    const emptyFilters = {
      starRatings: [],
      hotelTypes: [],
      amenities: [],
      roomTypes: [],
      bedTypes: [],
      priceMin: undefined,
      priceMax: undefined,
    };
    setFilters(emptyFilters);
    applyFilters(emptyFilters);
  };

  const hasActiveFilters = 
    filters.starRatings.length > 0 || 
    filters.hotelTypes.length > 0 || 
    filters.amenities.length > 0 || 
    filters.roomTypes.length > 0 || 
    filters.bedTypes.length > 0 || 
    filters.priceMin || 
    filters.priceMax;

  return (
    <div className="w-full bg-card border border-border/50 rounded-2xl p-5 shadow-sm top-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-primary font-bold text-lg">
          <Filter className="h-5 w-5" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <button 
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-primary transition-colors font-medium underline-offset-4 hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-6 divide-y divide-border/50">
        
        {/* Price Range */}
        <div className="pt-4 first:pt-0">
          <button 
            className="flex items-center justify-between w-full font-semibold text-sm mb-3"
            onClick={() => toggleSection('price')}
          >
            Price Range
            {openSections.price ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {openSections.price && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">TK </span>
                  <input 
                    type="number" 
                    placeholder=" Min"
                    className="w-full h-9 pl-7 pr-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    value={filters.priceMin || ''}
                    onChange={(e) => handlePriceChange(e.target.value ? Number(e.target.value) : undefined, filters.priceMax)}
                  />
                </div>
                <span className="text-muted-foreground">-</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">TK </span>
                  <input 
                    type="number" 
                    placeholder=" Max"
                    className="w-full h-9 pl-7 pr-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                    value={filters.priceMax || ''}
                    onChange={(e) => handlePriceChange(filters.priceMin, e.target.value ? Number(e.target.value) : undefined)}
                  />
                </div>
              </div>
              <Button onClick={handleApplyPrice} variant="secondary" size="sm" className="w-full h-8 text-xs">
                Apply Price
              </Button>
            </div>
          )}
        </div>

        {/* Star Rating */}
        <div className="pt-4">
          <button 
            className="flex items-center justify-between w-full font-semibold text-sm mb-3"
            onClick={() => toggleSection('star')}
          >
            Star Rating
            {openSections.star ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {openSections.star && (
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => (
                <label key={star} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    className="rounded border-border/50 text-primary focus:ring-primary/20 cursor-pointer"
                    checked={filters.starRatings.includes(star)}
                    onChange={(e) => handleCheckboxChange('starRatings', star, e.target.checked)}
                  />
                  <span className="flex items-center text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {[...Array(star)].map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 mr-0.5" />
                    ))}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Hotel Types */}
        {hotelTypeOptions.length > 0 && (
          <div className="pt-4">
            <button 
              className="flex items-center justify-between w-full font-semibold text-sm mb-3"
              onClick={() => toggleSection('hotelType')}
            >
              Property Type
              {openSections.hotelType ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {openSections.hotelType && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
                {hotelTypeOptions.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="rounded border-border/50 text-primary focus:ring-primary/20 cursor-pointer"
                      checked={filters.hotelTypes.includes(option.id as string)}
                      onChange={(e) => handleCheckboxChange('hotelTypes', option.id, e.target.checked)}
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Amenities */}
        {amenityOptions.length > 0 && (
          <div className="pt-4">
            <button 
              className="flex items-center justify-between w-full font-semibold text-sm mb-3"
              onClick={() => toggleSection('amenities')}
            >
              Amenities
              {openSections.amenities ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {openSections.amenities && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar" data-lenis-prevent data-lenis-prevent-wheel data-lenis-prevent-touch>
                {amenityOptions.map((option) => (
                  <label key={option.id} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="rounded border-border/50 text-primary focus:ring-primary/20 cursor-pointer"
                      checked={filters.amenities.includes(option.id as string)}
                      onChange={(e) => handleCheckboxChange('amenities', option.id, e.target.checked)}
                    />
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default HotelFilterSidebar;
