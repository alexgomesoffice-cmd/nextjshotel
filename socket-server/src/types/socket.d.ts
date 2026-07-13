import type { Server, Socket as _Socket } from "socket.io";

export type ActorType = "SYSTEM_ADMIN" | "HOTEL_ADMIN" | "HOTEL_SUB_ADMIN" | "END_USER" | "GUEST";

export interface AuthenticatedUser {
  userId: number;
  actor_id: number;
  actor_type: ActorType;
  hotel_id?: number;
  iat: number;
  exp: number;
}

export interface JwtPayload extends AuthenticatedUser {}

// Augment the Socket type to include a typed `user` object from our JWT
declare module "socket.io" {
  interface Socket {
    data: SocketData;
  }
}

interface SocketData {
  user?: AuthenticatedUser;
}
