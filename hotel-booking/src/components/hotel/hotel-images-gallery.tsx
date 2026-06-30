"use client";

import Image from "next/image";
import { Grid2X2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HotelImage {
  id: number;
  image_url: string;
  is_cover: boolean;
}

interface HotelImagesGalleryProps {
  images: HotelImage[];
  onShowAllPhotos: (index?: number) => void;
}

const HotelImagesGallery = ({ images, onShowAllPhotos }: HotelImagesGalleryProps) => {
  if (!images || images.length === 0) {
    return (
      <div className="w-full h-100 md:h-125 bg-muted rounded-3xl flex items-center justify-center">
        <p className="text-muted-foreground">No images available for this property.</p>
      </div>
    );
  }

  // Ensure cover image is first, or use the first available if no cover is marked
  const sortedImages = [...images].sort((a, b) => (a.is_cover === b.is_cover ? 0 : a.is_cover ? -1 : 1));

  // Render different layouts based on image count
  if (sortedImages.length === 1) {
    return (
      <div className="relative w-full h-100 md:h-125 rounded-3xl overflow-hidden group">
        <Image
          src={sortedImages[0].image_url}
          alt="Hotel property"
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
    );
  }

  if (sortedImages.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-2 h-100 md:h-125 rounded-3xl overflow-hidden">
        {sortedImages.map((img, i) => (
          <div key={img.id} className="relative w-full h-full group">
              <Image
                src={img.image_url}
                alt={`Hotel property ${i + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer"
                onClick={() => onShowAllPhotos(images.findIndex(orig => orig.id === img.id))}
              />
          </div>
        ))}
      </div>
    );
  }

  // Full Bento Box layout for 3+ images (up to 5 shown)
  const displayImages = sortedImages.slice(0, 5);
  const remainingCount = images.length - 5;

  return (
    <div className="relative h-100 md:h-125 rounded-xl overflow-hidden group">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full">
        {/* Left: Main large image */}
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src={displayImages[0].image_url}
            alt="Hotel main view"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover transition-transform duration-700 hover:scale-105 cursor-pointer"
            onClick={() => onShowAllPhotos(images.findIndex(orig => orig.id === displayImages[0].id))}
          />
        </div>

        {/* Right: Grid of smaller images (only visible on md+) */}
        <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-2 h-full">
          {displayImages.slice(1, 5).map((img, idx) => {
            const isLast = idx === 3;
            return (
              <div key={img.id} className="relative w-full h-full overflow-hidden">
                <Image
                  src={img.image_url}
                  alt={`Hotel detail ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 0vw, 25vw"
                  className={`object-cover transition-transform duration-700 hover:scale-105 cursor-pointer ${
                    isLast && remainingCount > 0 ? "opacity-80" : ""
                  }`}
                  onClick={() => onShowAllPhotos(images.findIndex(orig => orig.id === img.id))}
                />
                
                {/* Overlay for the last image if there are more */}
                {isLast && remainingCount > 0 && (
                  <div 
                    className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/50 transition-colors"
                    onClick={() => onShowAllPhotos(images.findIndex(orig => orig.id === img.id))}
                  >
                    <span className="text-white text-xl font-semibold tracking-wider">
                      +{remainingCount}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating 'Show All Photos' Button */}
      <Button
        variant="secondary"
        className="absolute bottom-6 right-6 shadow-xl bg-background/90 backdrop-blur-md hover:bg-background transition-all hover:scale-105 rounded-full px-6 gap-2 border border-border/50"
        onClick={onShowAllPhotos}
      >
        <Grid2X2 className="h-4 w-4 text-primary" />
        <span className="font-semibold text-foreground">Show all photos</span>
      </Button>
    </div>
  );
};

export default HotelImagesGallery;
