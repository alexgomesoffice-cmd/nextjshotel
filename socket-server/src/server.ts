import http from "http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { verifySocketAuth } from "./middleware/auth.js";
import { initSocketHandlers } from "./socket.js";

// ── HTTP server ───────────────────────────────────────────────────────────────
// We use Node's http module directly. The same server handles both WebSocket
// upgrades (via Socket.IO) AND the internal /broadcast POST endpoint.

const httpServer = http.createServer((req, res) => {
  // ── Internal broadcast endpoint ───────────────────────────────────────────
  // POST /broadcast
  // Called by the Next.js API routes (server-side only) after a DB commit.
  // Protected by a shared SOCKET_SECRET so it is not publicly accessible.
  //
  // Body: { room: string, event: string, payload: unknown }
  // Header: Authorization: Bearer <SOCKET_SECRET>

  if (req.method === "POST" && req.url === "/broadcast") {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${env.SOCKET_SECRET}`) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const { room, event, payload } = JSON.parse(body) as {
          room: string;
          event: string;
          payload: unknown;
        };

        if (!room || !event) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing room or event" }));
          return;
        }

        io.to(room).emit(event, payload);
        console.log(`[broadcast] room="${room}" event="${event}"`);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
      }
    });
    return;
  }

  // Health-check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", port: env.PORT }));
    return;
  }

  res.writeHead(404);
  res.end();
});

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: env.ALLOWED_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Verify JWT during the Socket.IO connection lifecycle and stash the user
// on socket.data so the handlers can access it reliably.
io.use(verifySocketAuth);

io.on("connection", (socket) => {
  const user = (socket as any).data?.user ?? {
    actor_id: null,
    actor_type: "GUEST",
    hotel_id: null,
  };
  const { actor_id, actor_type, hotel_id } = user;

  console.log(`[socket-server] client connected socket=${socket.id} actor_id=${actor_id} type=${actor_type} hotel_id=${hotel_id ?? '—'}`);

  // ── Auto-join role-based rooms ────────────────────────────────────────────
  // Personal channel — everyone gets one (used for staff:blocked, session:revoked, etc.)
  socket.join(`user:${actor_id}`);

  if (actor_type === "SYSTEM_ADMIN") {
    socket.join("system-admin:global");
  }

  if (actor_type === "HOTEL_ADMIN" || actor_type === "HOTEL_SUB_ADMIN") {
    socket.join("hotel-admin:all");
    if (hotel_id) {
      socket.join(`hotel-admin:${hotel_id}`);
    }
  }

  // Register client-driven event handlers (join:hotel, join:booking, etc.)
  initSocketHandlers(io, socket);
});

// ── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(env.PORT, () => {
  console.log(`[socket-server] Listening on port ${env.PORT}`);
  console.log(`[socket-server] CORS origin: ${env.ALLOWED_ORIGIN}`);
});
