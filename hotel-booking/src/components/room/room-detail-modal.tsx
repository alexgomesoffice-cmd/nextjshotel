"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Cigarette, PawPrint, Check, Wind, Hash, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLenis } from "@/components/ui/SmoothScroll";

interface RoomImage {
  id: number;
  image_url: string;
}

export interface RoomDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: {
    id: number;
    room_number: string;
    floor: number | null;
    price: number;
    room_size: string | null;
    ac: boolean;
    smoking_allowed: boolean;
    pet_allowed: boolean;
    notes: string | null;
    room_images: RoomImage[];
    // Fallback type-level images if room has no own images
    type_images?: RoomImage[];
    // Room type name for context
    room_type_name?: string;
  } | null;
}

const RoomDetailModal = ({ isOpen, onClose, room }: RoomDetailModalProps) => {
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

  if (!isOpen || !room) return null;

  const images = room.room_images.length > 0 ? room.room_images : (room.type_images ?? []);

  const features = [
    { icon: <Wind className="h-4 w-4" />, label: "Air Conditioning", value: room.ac },
    { icon: <Cigarette className="h-4 w-4" />, label: "Smoking Allowed", value: room.smoking_allowed },
    { icon: <PawPrint className="h-4 w-4" />, label: "Pet Friendly", value: room.pet_allowed },
  ];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="bg-background w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50 bg-background/95 backdrop-blur-sm z-10 shrink-0">
          <div>
            {room.room_type_name && (
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">{room.room_type_name}</p>
            )}
            <h2 className="text-2xl font-bold tracking-tight">Room {room.room_number}</h2>
            {room.floor != null && (
              <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> Floor {room.floor}
              </p>
            )}
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
          {images.length > 0 ? (
            <div className="p-6 pb-2">
              <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-4 bg-muted">
                <Image
                  src={images[activeImage].image_url}
                  alt={`Room ${room.room_number}`}
                  fill
                  className="object-cover"
                />
                {images.length > 1 && (
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-sm">
                    {activeImage + 1} / {images.length}
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                  {images.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => setActiveImage(idx)}
                      className={`relative h-16 w-24 shrink-0 rounded-xl overflow-hidden transition-all ${
                        activeImage === idx ? "ring-2 ring-primary ring-offset-2 scale-105" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <Image src={img.image_url} alt="Thumbnail" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mx-6 mt-6 h-48 rounded-2xl bg-muted/50 border border-border/30 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No images available for this room</p>
            </div>
          )}

          <div className="p-6 pt-4 space-y-6">
            {/* Room size */}
            {room.room_size && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs bg-secondary/60 border border-border/40 rounded-full px-3 py-1 text-muted-foreground">
                  {room.room_size} sq ft
                </span>
              </div>
            )}

            {/* Features */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Room Features</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {features.map((f, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl border ${
                      f.value
                        ? "border-primary/30 bg-primary/5 text-primary"
                        : "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {f.icon}
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight">{f.label}</p>
                      <p className="text-xs opacity-70">{f.value ? "Yes" : "No"}</p>
                    </div>
                    {f.value ? (
                      <Check className="h-3.5 w-3.5 ml-auto shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 ml-auto shrink-0 opacity-70" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {room.notes && (
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-1">Important Note</p>
                <p className="text-sm text-foreground">{room.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border/50 bg-secondary/10 flex items-center justify-between shrink-0">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Price per night</p>
            <p className="text-2xl font-bold text-foreground">TK {Number(room.price).toLocaleString()}</p>
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

export default RoomDetailModal;