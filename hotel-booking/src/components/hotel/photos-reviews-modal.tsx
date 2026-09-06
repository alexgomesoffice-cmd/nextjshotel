"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";

const transitionDuration = 400;
const transitionEasing = "cubic-bezier(0.22, 1, 0.36, 1)";

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"closed" | "opening" | "open" | "expanding" | "contracting" | "closing">("closed");
  const modalRef = useRef<HTMLDivElement | null>(null);
  const animationTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  useEffect(() => {
    if (!isOpen) {
      setIsFullscreen(false);
      setAnimationPhase("closed");
      return;
    }

    const syncFullscreenState = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    syncFullscreenState();
    document.addEventListener("fullscreenchange", syncFullscreenState);

    setAnimationPhase("opening");
    animationTimerRef.current = window.setTimeout(() => {
      setAnimationPhase("open");
    }, 16);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreenState);
      if (animationTimerRef.current !== null) {
        window.clearTimeout(animationTimerRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => undefined);
      }
    }
  }, [isOpen]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;

    await new Promise<void>((resolve) => {
      const handleFullscreenChange = () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        resolve();
      };

      document.addEventListener("fullscreenchange", handleFullscreenChange);
      void document.exitFullscreen().catch(() => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        resolve();
      });
    });
  }, []);

  const handleClose = useCallback(async () => {
    if (animationPhase === "closing") return;

    try {
      await exitFullscreen();
    } catch (error) {
      console.error("Fullscreen exit error:", error);
    }

    setAnimationPhase("closing");
    animationTimerRef.current = window.setTimeout(() => {
      onClose();
    }, transitionDuration);
  }, [animationPhase, exitFullscreen, onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (document.fullscreenElement) {
        void exitFullscreen();
      } else {
        void handleClose();
      }
      return;
    }
    if (e.key === "ArrowRight") handleNext();
    if (e.key === "ArrowLeft") handlePrev();
  }, [isOpen, exitFullscreen, handleClose, handleNext, handlePrev]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const toggleFullscreen = useCallback(async () => {
    if (!modalRef.current) return;

    if (animationPhase === "closing" || animationPhase === "expanding" || animationPhase === "contracting") return;

    const enteringFullscreen = !document.fullscreenElement;
    setAnimationPhase(enteringFullscreen ? "expanding" : "contracting");

    try {
      if (enteringFullscreen) {
        await modalRef.current.requestFullscreen();
      } else {
        await exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen toggle error:", error);
    }
    animationTimerRef.current = window.setTimeout(() => {
      setAnimationPhase(enteringFullscreen ? "open" : "open");
    }, transitionDuration);
  }, [animationPhase, exitFullscreen]);

  const isClosing = animationPhase === "closing";
  const isOpening = animationPhase === "opening";
  const isFullscreenTransition = animationPhase === "expanding" || animationPhase === "contracting";
  const modalOpacity = isOpening || isClosing ? 0 : 1;
  const viewerTransform = isClosing
    ? "translate3d(0, 10px, 0) scale(0.96)"
    : isOpening
      ? "translate3d(0, 8px, 0) scale(0.96)"
      : isFullscreenTransition
        ? "translate3d(0, -4px, 0) scale(1.015)"
        : "translate3d(0, 0, 0) scale(1)";
  const backdropOpacity = isClosing ? 0 : isFullscreen ? 0.96 : 0.88;
  const controlTransform = isClosing || isOpening ? "translate3d(0, 8px, 0)" : "translate3d(0, 0, 0)";
  const transitionStyle = {
    transitionDuration: `${transitionDuration}ms`,
    transitionTimingFunction: transitionEasing,
  };

  if (!isOpen || !images || images.length === 0 || animationPhase === "closed") return null;

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-100 flex items-center justify-center bg-transparent backdrop-blur-xl"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black transition-opacity pointer-events-none"
        style={{ ...transitionStyle, opacity: backdropOpacity }}
      />
      <div
        className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-10 bg-linear-to-b from-black/80 to-transparent transition-[opacity,transform]"
        style={{ ...transitionStyle, opacity: modalOpacity, transform: controlTransform }}
      >
        <div className="text-white/80 font-medium tracking-wider text-sm bg-black/50 px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg shadow-black/25">
          {currentIndex + 1} / {images.length}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { void toggleFullscreen(); }}
            className="relative text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <span className="relative block h-5 w-5">
              <Maximize2 className={`absolute inset-0 h-5 w-5 transition-[opacity,transform] ${isFullscreen ? "scale-75 rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100"}`} style={transitionStyle} />
              <Minimize2 className={`absolute inset-0 h-5 w-5 transition-[opacity,transform] ${isFullscreen ? "scale-100 rotate-0 opacity-100" : "scale-75 -rotate-90 opacity-0"}`} style={transitionStyle} />
            </span>
          </button>
          <button onClick={() => { void handleClose(); }} className="text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10" aria-label="Close gallery">
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="relative w-full h-full max-h-screen flex items-center justify-center p-4 md:p-12">
        <div
          className="relative w-full h-full max-w-6xl max-h-[85vh] flex items-center justify-center will-change-transform transition-[opacity,transform]"
          style={{ ...transitionStyle, opacity: 1, transform: viewerTransform }}
        >
          <Image
            key={images[currentIndex].id}
            src={images[currentIndex].image_url}
            alt={`Hotel photo ${currentIndex + 1}`}
            fill
            className="object-contain opacity-100 animate-gallery-image-enter"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {images.length > 1 && (
        <>
          <button onClick={handlePrev} className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/10" style={{ opacity: modalOpacity, transform: controlTransform, ...transitionStyle }}>
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button onClick={handleNext} className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors border border-white/10" style={{ opacity: modalOpacity, transform: controlTransform, ...transitionStyle }}>
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-linear-to-t from-black/80 to-transparent transition-[opacity,transform]" style={{ opacity: modalOpacity, transform: controlTransform, ...transitionStyle }}>
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
