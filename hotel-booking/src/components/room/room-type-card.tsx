"use client";

import { useState } from "react";
import Image from "next/image";
import { Users, Bed, Check, Info, Maximize, ChevronLeft, ChevronRight, Wind, Tv, Coffee, Bath } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  if (lower.includes('ac') || lower.includes('air')) return <Wind className="h-4 w-4" />;
  if (lower.includes('tv') || lower.includes('television')) return <Tv className="h-4 w-4" />;
  if (lower.includes('coffee') || lower.includes('tea')) return <Coffee className="h-4 w-4" />;
  if (lower.includes('bath') || lower.includes('shower')) return <Bath className="h-4 w-4" />;
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
  onReserve
}: RoomTypeCardProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? type_images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === type_images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex flex-col md:flex-row gap-0 bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 group">
      
      {/* Image Gallery Side */}
      <div className="relative w-full md:w-2/5 h-64 md:h-auto min-h-[250px] bg-muted shrink-0">
        {type_images && type_images.length > 0 ? (
          <>
            <Image
              src={type_images[currentImageIndex].image_url}
              alt={name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
            
            {type_images.length > 1 && (
              <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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

            {/* Image Indicators */}
            {type_images.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                {type_images.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-secondary/50">
            <Bed className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content Side */}
      <div className="flex flex-col flex-1 p-5 md:p-6">
        
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-2">
          <div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-primary" />
                Up to {occupancy_adults} Adults
              </span>
              {room_size && (
                <span className="flex items-center gap-1.5">
                  <Maximize className="h-4 w-4 text-primary" />
                  {room_size} sq ft
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 mt-1">
            {description}
          </p>
        )}

        {/* Features (Beds & Amenities) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-6">
          {/* Beds */}
          {room_bed_types?.map((bed, idx) => (
            <div key={`bed-${idx}`} className="flex items-center gap-2 text-sm">
              <Bed className="h-4 w-4 text-primary shrink-0" />
              <span>{bed.count}x {bed.bed_type.name}</span>
            </div>
          ))}

          {/* Top Amenities (show max 4) */}
          {room_properties?.slice(0, 4).map((prop, idx) => (
            <div key={`amenity-${idx}`} className="flex items-center gap-2 text-sm">
              <span className="text-primary shrink-0">
                {getIconForAmenity(prop.amenity.name)}
              </span>
              <span className="truncate">{prop.amenity.name}</span>
            </div>
          ))}
          
          {room_properties && room_properties.length > 4 && (
             <button onClick={onViewDetails} className="text-sm text-primary font-medium hover:underline text-left flex items-center gap-1 mt-1">
               +{room_properties.length - 4} more amenities
             </button>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-auto flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-border/50 gap-4">
          
          <div className="flex flex-col w-full sm:w-auto">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Price for 1 night</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-foreground">
                ৳{Number(base_price).toLocaleString()}
              </span>
            </div>
            {available_rooms_count <= 3 && available_rooms_count > 0 && (
                <span className="text-xs text-destructive font-medium mt-1">Only {available_rooms_count} rooms left!</span>
            )}
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
                >
                  {[...Array(Math.min(10, available_rooms_count))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <Button 
                  className="flex-1 sm:flex-none animate-pulse-glow"
                  onClick={() => onReserve && onReserve(selectedQuantity)}
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
  );
};

export default RoomTypeCard;
