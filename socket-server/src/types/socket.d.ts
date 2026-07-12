import type { Server, Socket as _Socket } from "socket.io";

export type ActorType = "SYSTEM_ADMIN" | "HOTEL_ADMIN" | "HOTEL_SUB_ADMIN" | "END_USER" | "GUEST";

export interface JwtPayload {
  actor_id: number;
  actor_type: ActorType;
  hotel_id?: number;
  iat: number;
  exp: number;
}

// Augment the Socket type to include a typed `user` object from our JWT
declare module "socket.io" {
  interface Socket {
    user: JwtPayload;
  }
}
