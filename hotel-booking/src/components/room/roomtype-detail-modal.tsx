"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Users, Bed, CheckCircle2, Wind, Tv, Coffee, Bath } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLenis } from "@/components/ui/SmoothScroll";

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

export interface RoomTypeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomType: {
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
  } | null;
}

const getIconForAmenity = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('ac') || lower.includes('air')) return <Wind className="h-5 w-5" />;
  if (lower.includes('tv') || lower.includes('television')) return <Tv className="h-5 w-5" />;
  if (lower.includes('coffee') || lower.includes('tea')) return <Coffee className="h-5 w-5" />;
  if (lower.includes('bath') || lower.includes('shower')) return <Bath className="h-5 w-5" />;
  return <CheckCircle2 className="h-5 w-5 text-primary" />;
};

const RoomTypeDetailModal = ({ isOpen, onClose, roomType }: RoomTypeDetailModalProps) => {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const lenis = getLenis();
    if (lenis) lenis.stop();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setActiveImage(0);

    return () => {
      document.body.style.overflow = previousOverflow || "unset";
      const activeLenis = getLenis();
      if (activeLenis) activeLenis.start();
    };
  }, [isOpen]);

  if (!isOpen || !roomType) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-background/95 backdrop-blur-sm z-10 shrink-0">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Room Type</p>
            <h2 className="text-2xl font-bold tracking-tight">{roomType.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          className="overflow-y-auto overscroll-contain flex-1 min-h-0 custom-scrollbar"
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
        >
          {/* Image Gallery */}
          {roomType.type_images && roomType.type_images.length > 0 && (
            <div className="p-6 pb-2">
              <div className="relative w-full h-75 md:h-100 rounded-2xl overflow-hidden mb-4 bg-muted">
                <Image
                  src={roomType.type_images[activeImage].image_url}
                  alt={roomType.name}
                  fill
                  className="object-cover"
                />
                {/* Image counter badge */}
                {roomType.type_images.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {activeImage + 1} / {roomType.type_images.length}
                  </div>
                )}
              </div>

              {roomType.type_images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                  {roomType.type_images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(idx)}
                      className={`relative h-20 w-28 shrink-0 rounded-xl overflow-hidden transition-all ${
                        activeImage === idx ? "ring-2 ring-primary ring-offset-2 scale-105" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={img.image_url} alt="Thumbnail" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-6 pt-2 space-y-8">
            {/* Quick Info Bar */}
            <div className="flex flex-wrap items-center gap-6 py-4 border-y border-border/50">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Occupancy</p>
                  <p className="font-semibold text-sm">Up to {roomType.occupancy_adults} Adults</p>
                </div>
              </div>

              {roomType.room_size && (
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Wind className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Room Size</p>
                    <p className="font-semibold text-sm">{roomType.room_size} sq ft</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {roomType.description && (
              <div>
                <h3 className="text-lg font-semibold mb-3">About this room type</h3>
                <p className="text-muted-foreground leading-relaxed">{roomType.description}</p>
              </div>
            )}

            {/* Bed Configuration */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Bed Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roomType.room_bed_types?.map((bed, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl border border-border/50 bg-secondary/20">
                    <Bed className="h-6 w-6 text-primary" />
                    <div>
                      <p className="font-medium">{bed.bed_type.name}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {bed.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Room Amenities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                {roomType.room_properties?.map((prop, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="text-primary/70">
                      {getIconForAmenity(prop.amenity.name)}
                    </div>
                    <span className="text-sm">{prop.amenity.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-secondary/10 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Starting from</p>
            <p className="text-2xl font-bold text-foreground">TK {Number(roomType.base_price).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">per night</p>
          </div>
          <Button onClick={onClose} size="lg">
            Done
          </Button>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
};

export default RoomTypeDetailModal;