import { useEffect } from "react";
import { useSocket } from "./useSocket";

export function useHotelAdminFeed(hotelId?: number, onRefresh?: () => void, onStatusChange?: () => void) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const joinAdminRoom = () => {
      if (hotelId) {
        socket.emit("join:hotel-admin", hotelId);
        socket.emit("join:hotel", hotelId);
      } else {
        socket.emit("join:hotel-admin", "all");
      }
    };

    joinAdminRoom();

    const onConnect = () => {
      joinAdminRoom();
    };

    const onBookingCreated = (e: { hotel_id: number; reference: string }) => {
      if ((!hotelId || e.hotel_id === hotelId) && onRefresh) {
        onRefresh();
      }
    };

    const onBookingStatusChanged = (e: { hotel_id: number; reference: string; status: string }) => {
      if ((!hotelId || e.hotel_id === hotelId) && onStatusChange) {
        onStatusChange();
      }
      if ((!hotelId || e.hotel_id === hotelId) && onRefresh) {
        onRefresh();
      }
    };

    const onRoomUpdated = (e: { hotel_id: number }) => {
      if ((!hotelId || e.hotel_id === hotelId) && onRefresh) {
        onRefresh();
      }
    };

    const onAvailabilityChanged = (e: { hotel_id: number }) => {
      if ((!hotelId || e.hotel_id === hotelId) && onRefresh) {
        onRefresh();
      }
    };

    socket.on("connect", onConnect);
    socket.on("booking:created", onBookingCreated);
    socket.on("booking:status_changed", onBookingStatusChanged);
    socket.on("room:updated", onRoomUpdated);
    socket.on("room_type:updated", onRoomUpdated);
    socket.on("room:availability_changed", onAvailabilityChanged);

    return () => {
      socket.off("connect", onConnect);
      socket.off("booking:created", onBookingCreated);
      socket.off("booking:status_changed", onBookingStatusChanged);
      socket.off("room:updated", onRoomUpdated);
      socket.off("room_type:updated", onRoomUpdated);
      socket.off("room:availability_changed", onAvailabilityChanged);
    };
  }, [socket, hotelId, onRefresh, onStatusChange]);
}
