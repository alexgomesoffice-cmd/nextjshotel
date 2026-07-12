import { useEffect } from "react";
import { useSocket } from "./useSocket";

export function useHotelAdminFeed(hotelId?: number, onNewBooking?: () => void, onStatusChange?: () => void) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const joinAdminRoom = () => {
      if (hotelId) {
        socket.emit("join:hotel-admin", hotelId);
      } else {
        socket.emit("join:hotel-admin", "all");
      }
    };

    joinAdminRoom();

    const onConnect = () => {
      joinAdminRoom();
    };

    // Room join is handled automatically on connection via JWT token claims,
    // but we add listeners here for the events broadcast to that room.
    const onBookingCreated = (e: { hotel_id: number; reference: string }) => {
      if ((!hotelId || e.hotel_id === hotelId) && onNewBooking) {
        onNewBooking();
      }
    };

    const onBookingStatusChanged = (e: { hotel_id: number; reference: string; status: string }) => {
      if ((!hotelId || e.hotel_id === hotelId) && onStatusChange) {
        onStatusChange();
      }
    };

    socket.on("connect", onConnect);
    socket.on("booking:created", onBookingCreated);
    socket.on("booking:status_changed", onBookingStatusChanged);

    return () => {
      socket.off("connect", onConnect);
      socket.off("booking:created", onBookingCreated);
      socket.off("booking:status_changed", onBookingStatusChanged);
    };
  }, [socket, hotelId, onNewBooking, onStatusChange]);
}
