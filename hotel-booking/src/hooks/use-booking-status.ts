import { useEffect, useState } from "react";
import { useSocket } from "./useSocket";

export function useBookingStatus(reference: string, initialStatus: string) {
  const socket = useSocket();
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (!socket || !reference) return;

    socket.emit("join:booking", reference);

    const onStatusChanged = (e: { reference: string; status: string }) => {
      if (e.reference === reference) {
        setStatus(e.status);
      }
    };

    socket.on("booking:status_changed", onStatusChanged);

    return () => {
      socket.off("booking:status_changed", onStatusChanged);
    };
  }, [socket, reference]);

  return status;
}
