import { verifyToken } from "../lib/jwt.js";

/**
 * Socket.IO middleware — runs during the connection lifecycle.
 * Reads the JWT from the same cookie the Next.js app sets (`token` by default)
 * or from an Authorization header, and only allows the connection if the token
 * is present and valid.
 */
export async function verifySocketAuth(
  socket: any,
  next: (err?: Error) => void
) {
  try {
    const req = socket.request as any;
    const cookie = req.headers.cookie ?? "";
    let token = socket.handshake?.auth?.token ?? null;

    if (!token) {
      token = parseCookie(cookie, "token_user")
        ?? parseCookie(cookie, "token_hotel_admin")
        ?? parseCookie(cookie, "token_system_admin");
    }

    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7).trim();
      }
    }

    if (!token) {
      return next(new Error("Authentication error: No token"));
    }

    const payload = await verifyToken(token);
    socket.data.user = payload;
    console.log(`[socket-auth] token valid: actor_id=${payload.actor_id} actor_type=${payload.actor_type} hotel_id=${payload.hotel_id ?? '—'}`);
    return next();
  } catch (err: any) {
    console.log(`[socket-auth] token verification failed: ${err?.message ?? String(err)}`);
    return next(new Error("Authentication error: Invalid or expired token"));
  }
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}

