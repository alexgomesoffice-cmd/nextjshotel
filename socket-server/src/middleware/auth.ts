import { verifyToken } from "../lib/jwt.js";
import type { AuthenticatedUser } from "../types/socket.js";

/**
 * Socket.IO middleware — runs during the connection lifecycle.
 * Reads the JWT from the same cookie the Next.js app sets and only allows
 * the connection if the token is present and valid.
 */
export async function verifySocketAuth(
  socket: any,
  next: (err?: Error) => void
) {
  try {
    const req = socket.request as any;
    const cookie = req.headers.cookie ?? "";
    const token = parseCookie(cookie, "token_user")
      ?? parseCookie(cookie, "token_hotel_admin")
      ?? parseCookie(cookie, "token_system_admin")
      ?? parseCookie(cookie, "token");

    if (!token) {
      return next(new Error("Authentication error: No token"));
    }

    const payload = (await verifyToken(token)) as AuthenticatedUser;
    socket.data.user = {
      ...payload,
      userId: payload.actor_id,
    };
    return next();
  } catch (err: any) {
    return next(new Error("Authentication error: Invalid or expired token"));
  }
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}

