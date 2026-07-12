import { useEffect, useState } from "react";
import { useSocket } from "./useSocket";
import type { RoomType } from "@/components/room/rooms-section-client";

export function useHotelAvailability(hotelId: number, initialRoomTypes: RoomType[], onRefreshNeeded: () => void) {
  const socket = useSocket();
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(initialRoomTypes);

  useEffect(() => {
    setRoomTypes(initialRoomTypes);
  }, [initialRoomTypes]);

  useEffect(() => {
    if (!socket || !hotelId) return;

    socket.emit("join:hotel", hotelId);

    // Fine-grained availability update (e.g. someone booked a specific variant)
    const onAvailabilityChanged = (e: { hotel_id: number }) => {
      // For now, since room grouping logic is complex and done on the server,
      // the safest/easiest reaction is just to refetch the availability data.
      if (e.hotel_id === hotelId) {
        onRefreshNeeded();
      }
    };

    // Generic structural update (hotel admin changed prices, added rooms, etc)
    const onRoomUpdated = (e: { hotel_id: number }) => {
      if (e.hotel_id === hotelId) {
        onRefreshNeeded();
      }
    };

    socket.on("room:availability_changed", onAvailabilityChanged);
    socket.on("room:updated", onRoomUpdated);
    socket.on("room_type:updated", onRoomUpdated);

    return () => {
      socket.off("room:availability_changed", onAvailabilityChanged);
      socket.off("room:updated", onRoomUpdated);
      socket.off("room_type:updated", onRoomUpdated);
    };
  }, [socket, hotelId, onRefreshNeeded]);

  return roomTypes;
}
