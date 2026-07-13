"use client";

import {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useState,
} from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
}

interface SocketProviderProps {
  children: ReactNode;
}

const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ children }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    let active = true;
    let client: Socket | null = null;

    async function connectSocket() {
      try {
        const url = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4001";

        client = io(url, {
          withCredentials: true,
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        if (active && client) {
          setSocket(client);
        }
      } catch {
        // Ignore and leave socket disconnected
      }
    }

    void connectSocket();

    return () => {
      active = false;
      if (client) {
        client.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);

  return context.socket;
}