"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Users,
  Bed,
  Check,
  Info,
  Wind,
  Tv,
  Coffee,
  Bath,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RoomTypeImage {
  id: number;
  image_url: string;
}

interface RoomBedType {
  bed_type: {
    name: string;
  };
  count: number;
}

interface RoomProperty {
  amenity: {
    name: string;
    icon: string | null;
  };
}

export interface RoomTypeCardProps {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  occupancy_adults: number;
  room_size: string | null;
  type_images: RoomTypeImage[];
  room_bed_types: RoomBedType[];
  room_properties: RoomProperty[];
  available_rooms_count: number;
  onViewDetails?: () => void;
  onReserve?: (quantity: number) => void;
}

const getIconForAmenity = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("ac") || lower.includes("air")) return <Wind className="h-4 w-4" />;
  if (lower.includes("tv") || lower.includes("television")) return <Tv className="h-4 w-4" />;
  if (lower.includes("coffee") || lower.includes("tea")) return <Coffee className="h-4 w-4" />;
  if (lower.includes("bath") || lower.includes("shower")) return <Bath className="h-4 w-4" />;
  return <Check className="h-4 w-4 text-primary" />;
};

const RoomTypeCard = ({
  name,
  description,
  base_price,
  occupancy_adults,
  room_size,
  type_images,
  room_bed_types,
  room_properties,
  available_rooms_count,
  onViewDetails,
  onReserve,
}: RoomTypeCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const coverImage = type_images?.[0]?.image_url || null;

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? type_images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === type_images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">

      {/* ── Collapsed header row (always visible) ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-secondary/20 transition-colors"
      >
        {/* Small thumbnail */}
        <div
          className="relative w-24 h-20 rounded-xl overflow-hidden shrink-0 bg-muted"
          onClick={(e) => {
            if (onViewDetails) {
              e.stopPropagation();
              onViewDetails();
            }
          }}
        >
          {coverImage ? (
            <Image
              src={coverImage}
              alt={name}
              fill
              className="object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Bed className="h-8 w-8 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Name + quick info */}
        <div className="flex-1 min-w-0">
          <h3
            className="font-bold text-lg hover:text-primary transition-colors cursor-pointer truncate"
            onClick={(e) => {
              if (onViewDetails) {
                e.stopPropagation();
                onViewDetails();
              }
            }}
          >
            {name}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-primary" />
              Up to {occupancy_adults} guests
            </span>
            {room_size && (
              <span className="hidden sm:flex items-center gap-1">
                <span className="text-border">·</span>
                {room_size}
              </span>
            )}
          </div>
          {available_rooms_count <= 3 && available_rooms_count > 0 && (
            <span className="text-xs text-destructive font-medium mt-0.5 block">
              Only {available_rooms_count} left!
            </span>
          )}
        </div>

        {/* Price + expand icon */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">From</p>
            <p className="font-bold text-lg">৳{Number(base_price).toLocaleString()}</p>
          </div>
          <ChevronDown
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </div>

      {/* ── Mobile price (visible only on small screens) ── */}
      <div className="sm:hidden px-4 pb-2 flex items-center justify-between border-t border-border/30 pt-2">
        <span className="text-xs text-muted-foreground">From</span>
        <span className="font-bold">৳{Number(base_price).toLocaleString()}</span>
      </div>

      {/* ── Expanded content ── */}
      {isExpanded && (
        <div className="border-t border-border/50 animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col md:flex-row gap-0">

            {/* Image carousel */}
            <div className="relative w-full md:w-2/5 h-56 md:h-auto min-h-[220px] bg-muted shrink-0 group/img">
              {type_images && type_images.length > 0 ? (
                <>
                  <Image
                    src={type_images[currentImageIndex].image_url}
                    alt={name}
                    fill
                    className="object-cover cursor-pointer"
                    onClick={onViewDetails}
                  />

                  {type_images.length > 1 && (
                    <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <button
                        onClick={handlePrevImage}
                        className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleNextImage}
                        className="h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}

                  {type_images.length > 1 && (
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                      {type_images.map((_, idx) => (
                        <div
                          key={idx}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === currentImageIndex
                              ? "w-4 bg-white"
                              : "w-1.5 bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Bed className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col flex-1 p-5 md:p-6">

              {/* Description */}
              {description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                  {description}
                </p>
              )}

              {/* Beds & top amenities */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-6">
                {room_bed_types?.map((bed, idx) => (
                  <div key={`bed-${idx}`} className="flex items-center gap-2 text-sm">
                    <Bed className="h-4 w-4 text-primary shrink-0" />
                    <span>
                      {bed.count}x {bed.bed_type.name}
                    </span>
                  </div>
                ))}
                {room_properties?.slice(0, 4).map((prop, idx) => (
                  <div key={`amenity-${idx}`} className="flex items-center gap-2 text-sm">
                    <span className="text-primary shrink-0">
                      {getIconForAmenity(prop.amenity.name)}
                    </span>
                    <span className="truncate">{prop.amenity.name}</span>
                  </div>
                ))}
                {room_properties && room_properties.length > 4 && (
                  <button
                    onClick={onViewDetails}
                    className="text-sm text-primary font-medium hover:underline text-left flex items-center gap-1 mt-1"
                  >
                    +{room_properties.length - 4} more amenities
                  </button>
                )}
              </div>

              {/* Footer — price & reserve */}
              <div className="mt-auto flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border/50 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Price per night
                  </span>
                  <p className="text-2xl font-bold">৳{Number(base_price).toLocaleString()}</p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {onViewDetails && (
                    <Button variant="outline" className="flex-1 sm:flex-none" onClick={onViewDetails}>
                      <Info className="h-4 w-4 mr-2" />
                      Details
                    </Button>
                  )}

                  {available_rooms_count > 0 ? (
                    <div className="flex items-center gap-2 flex-1 sm:flex-none">
                      <select
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {[...Array(Math.min(10, available_rooms_count))].map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                      <Button
                        className="flex-1 sm:flex-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReserve && onReserve(selectedQuantity);
                        }}
                      >
                        Reserve
                      </Button>
                    </div>
                  ) : (
                    <Button disabled variant="secondary" className="flex-1 sm:flex-none w-full sm:w-[140px]">
                      Sold Out
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomTypeCard;
