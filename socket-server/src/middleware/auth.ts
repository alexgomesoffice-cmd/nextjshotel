import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

// Middleware on engine (handshake) to verify JWT from cookie header
export function verifySocketAuth(req: any, res: any, next: (err?: any) => void) {
  const token = getCookie(req.headers.cookie, env.COOKIE_NAME);
  if (!token) {
    return next(new Error("Authentication error: No token"));
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as any;
    req.user = payload.user;   // assume payload has { userId, name, ... }
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
}

// Helper to parse a specific cookie by name
function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return match && match[1] ? match[1] : null;
}
