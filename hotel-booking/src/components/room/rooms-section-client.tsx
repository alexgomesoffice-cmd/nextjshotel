"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoomTypeCard from "@/components/room/room-type-card";
import RoomDetailModal from "@/components/room/room-detail-modal";

interface RoomTypeImage {
  id: number;
  image_url: string;
}

interface RoomBedType {
  bed_type: { name: string };
  count: number;
}

interface RoomProperty {
  amenity: { name: string; icon: string | null };
}

interface RoomType {
  id: number;
  name: string;
  description: string | null;
  base_price: number;
  max_occupancy: number;
  room_size: string | null;
  type_images: RoomTypeImage[];
  room_bed_types: RoomBedType[];
  room_properties: RoomProperty[];
  available_rooms_count: number;
}

interface RoomsSectionClientProps {
  roomTypes: RoomType[];
  hotelSlug: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export default function RoomsSectionClient({
  roomTypes,
  hotelSlug,
  checkIn,
  checkOut,
  guests,
}: RoomsSectionClientProps) {
  const router = useRouter();
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleViewDetails = (room: RoomType) => {
    setSelectedRoomType(room);
    setModalOpen(true);
  };

  const handleReserve = (room: RoomType, quantity: number) => {
    const params = new URLSearchParams();
    params.set("hotel", hotelSlug);
    params.set("room_type", room.id.toString());
    params.set("quantity", quantity.toString());
    if (checkIn) params.set("check_in", checkIn);
    if (checkOut) params.set("check_out", checkOut);
    if (guests) params.set("guests", guests.toString());
    router.push(`/bookings/new?${params.toString()}`);
  };

  // Convert RoomType to modal's expected shape
  const modalRoomType = selectedRoomType
    ? {
        id: selectedRoomType.id,
        name: selectedRoomType.name,
        description: selectedRoomType.description,
        base_price: selectedRoomType.base_price,
        occupancy_adults: selectedRoomType.max_occupancy,
        room_size: selectedRoomType.room_size,
        type_images: selectedRoomType.type_images,
        room_bed_types: selectedRoomType.room_bed_types,
        room_properties: selectedRoomType.room_properties,
        available_rooms_count: selectedRoomType.available_rooms_count,
      }
    : null;

  return (
    <>
      <div className="space-y-4">
        {roomTypes.map((room) => (
          <RoomTypeCard
            key={room.id}
            id={room.id}
            name={room.name}
            description={room.description}
            base_price={room.base_price}
            occupancy_adults={room.max_occupancy}
            room_size={room.room_size}
            type_images={room.type_images}
            room_bed_types={room.room_bed_types}
            room_properties={room.room_properties}
            available_rooms_count={room.available_rooms_count}
            onViewDetails={() => handleViewDetails(room)}
            onReserve={(quantity) => handleReserve(room, quantity)}
          />
        ))}
      </div>

      <RoomDetailModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        roomType={modalRoomType}
      />
    </>
  );
}
