"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

interface HotelImage {
  id: number;
  image_url: string;
  is_cover: boolean;
}

interface PhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: HotelImage[];
  initialIndex?: number;
}

const PhotosReviewsModal = ({ isOpen, onClose, images, initialIndex = 0 }: PhotosModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "ArrowLeft") handlePrev();
  }, [isOpen, onClose, handleNext, handlePrev]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Fullscreen error: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (!isOpen || !images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-10 bg-linear-to-b from-black/80 to-transparent">
        <div className="text-white/80 font-medium tracking-wider text-sm bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
            <Maximize2 className="h-5 w-5" />
          </button>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-full max-h-screen flex items-center justify-center p-4 md:p-12">
        <div className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center">
          <Image
            src={images[currentIndex].image_url}
            alt={`Hotel photo ${currentIndex + 1}`}
            fill
            className="object-contain animate-in zoom-in-95 duration-300"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button onClick={handlePrev} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-110 border border-white/10">
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button onClick={handleNext} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-110 border border-white/10">
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-3 overflow-x-auto py-2 px-4 max-w-4xl mx-auto [&::-webkit-scrollbar]:hidden">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-16 w-24 shrink-0 rounded-lg overflow-hidden transition-all duration-300 ${
                  currentIndex === idx ? "ring-2 ring-primary ring-offset-2 ring-offset-black scale-110 z-10" : "opacity-50 hover:opacity-100"
                }`}
              >
                <Image src={img.image_url} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" sizes="100px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotosReviewsModal;
