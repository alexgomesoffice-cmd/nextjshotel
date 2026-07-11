import { Socket as _Socket } from "socket.io";

export interface UserPayload {
  userId: number;
  name: string;
  // any other fields (e.g. role)
}

// Augment the Socket type to include a typed `user` object
declare module "socket.io" {
  interface Socket {
    user: UserPayload;
  }
}
