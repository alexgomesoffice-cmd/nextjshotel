import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket;
}

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: SocketProviderProps) {
  const socket = useMemo(() => {
    const url =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001";

    return io(url, {
      withCredentials: true,
    });
  }, []);

  useEffect(() => {
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }

  return context.socket;
}