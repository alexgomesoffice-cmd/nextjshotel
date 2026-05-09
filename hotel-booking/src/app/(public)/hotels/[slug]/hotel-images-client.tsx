"use client";

import { useState } from "react";
import HotelImagesGallery from "@/components/hotel/hotel-images-gallery";
import PhotosReviewsModal from "@/components/hotel/photos-reviews-modal";

interface HotelImage {
  id: number;
  image_url: string;
  is_cover: boolean;
  sort_order: number | null;
}

interface HotelImagesGalleryClientProps {
  images: HotelImage[];
}

export default function HotelImagesGalleryClient({ images }: HotelImagesGalleryClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <HotelImagesGallery 
        images={images} 
        onShowAllPhotos={() => setIsModalOpen(true)} 
      />
      <PhotosReviewsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        images={images} 
      />
    </>
  );
}
