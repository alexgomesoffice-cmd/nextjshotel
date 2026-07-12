/**
 * src/lib/socket-emit.ts
 *
 * Server-side only utility. Called by API routes after a successful DB commit
 * to push a real-time event to connected browsers via the Socket.IO server.
 *
 * Uses a simple HTTP POST to the socket server's internal /broadcast endpoint.
 * A SOCKET_SECRET shared between both processes authenticates the request.
 *
 * IMPORTANT: Failures are caught and logged — they must NEVER propagate back
 * to the caller and cause a booking / status-change to fail.
 */

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL ?? "http://localhost:4001";
const SOCKET_SECRET = process.env.SOCKET_SECRET ?? "dev_socket_secret";

export async function emitToRoom(
  room: string,
  event: string,
  payload: unknown
): Promise<void> {
  try {
    await fetch(`${SOCKET_SERVER_URL}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SOCKET_SECRET}`,
      },
      body: JSON.stringify({ room, event, payload }),
    });
  } catch (err) {
    // Non-fatal — real-time is an enhancement, not the source of truth.
    console.warn("[socket-emit] Failed to emit:", event, "→", room, err);
  }
}
