"use client";

// filepath: src/components/room/rooms-section-client.tsx
// Manages quantities (variantId → qty) across all room type cards.
// Derives selectedVariants list for the booking sidebar.
// Renders: room type cards (left) + modal.

import { useState } from "react";
import RoomTypeCard, { type RoomVariant } from "@/components/room/room-type-card";
import RoomDetailModal from "@/components/room/room-detail-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoomTypeImage { id: number; image_url: string; }
interface RoomBedType { bed_type: { name: string }; count: number; }
interface RoomProperty { amenity: { name: string; icon: string | null }; }

export interface RoomType {
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
  room_variants: RoomVariant[];
}

interface RoomsSectionClientProps {
  roomTypes: RoomType[];
  quantities: Record<number, number>;
  onQuantityChange: (variantId: number, qty: number) => void;
  guests?: number;
  highlightedRoomTypeId?: number;
  onClearHighlight?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RoomsSectionClient({
  roomTypes,
  quantities,
  onQuantityChange,
  guests = 1,
  highlightedRoomTypeId,
  onClearHighlight,
}: RoomsSectionClientProps) {
  const [modalRoom, setModalRoom] = useState<RoomType | null>(null);

  const modalData = modalRoom
    ? {
        id: modalRoom.id,
        name: modalRoom.name,
        description: modalRoom.description,
        base_price: modalRoom.base_price,
        occupancy_adults: modalRoom.max_occupancy,
        room_size: modalRoom.room_size,
        type_images: modalRoom.type_images,
        room_bed_types: modalRoom.room_bed_types,
        room_properties: modalRoom.room_properties,
        available_rooms_count: modalRoom.available_rooms_count,
      }
    : null;

  // Build per-room-type quantity map (only variants belonging to this room type)
  const getQuantitiesForRoomType = (roomType: RoomType): Record<number, number> => {
    const result: Record<number, number> = {};
    for (const variant of roomType.room_variants) {
      result[variant.id] = quantities[variant.id] ?? 0;
    }
    return result;
  };

  return (
    <>
      <div className="space-y-6">
        {roomTypes.map((roomType) => {
          const isGuestMismatch = guests > 1 && roomType.max_occupancy < guests;
          const guestMismatchReason = isGuestMismatch
            ? `This room fits up to ${roomType.max_occupancy} guest${roomType.max_occupancy !== 1 ? 's' : ''}. Your search needs ${guests}.`
            : undefined;

          return (
            <RoomTypeCard
              key={roomType.id}
              id={roomType.id}
              name={roomType.name}
              description={roomType.description}
              base_price={roomType.base_price}
              occupancy_adults={roomType.max_occupancy}
              room_size={roomType.room_size}
              type_images={roomType.type_images}
              room_bed_types={roomType.room_bed_types}
              room_properties={roomType.room_properties}
              available_rooms_count={roomType.available_rooms_count}
              room_variants={roomType.room_variants}
              onViewDetails={() => setModalRoom(roomType)}
              selectedQuantities={getQuantitiesForRoomType(roomType)}
              onQuantityChange={onQuantityChange}
              isGuestMismatch={isGuestMismatch}
              guestMismatchReason={guestMismatchReason}
              forceExpanded={roomType.id === highlightedRoomTypeId}
              isHighlighted={roomType.id === highlightedRoomTypeId}
              onClearHighlight={onClearHighlight}
            />
          );
        })}
      </div>
        
      <RoomDetailModal
        isOpen={!!modalRoom}
        onClose={() => setModalRoom(null)}
        roomType={modalData}
      />
    </>
  );
}
