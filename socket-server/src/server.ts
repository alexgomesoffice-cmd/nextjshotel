import http from "http";
import { Server } from "socket.io";
import { verifySocketAuth } from "./middleware/auth.js";
import { env } from "./config/env.js";
import { initSocketHandlers } from "./socket.js";

// Create HTTP server (no Express needed here, or use one if combining REST APIs)
const httpServer = http.createServer();

// Initialize Socket.IO with CORS settings
const io = new Server(httpServer, {
  cors: {
    origin: env.ALLOWED_ORIGIN,    // e.g. "http://localhost:3000" in dev, or list in prod
    methods: ["GET", "POST"],
    credentials: true,            // allow cookies
  },
});

// Apply middleware before connection (handshake)
io.engine.use(verifySocketAuth);   // custom function checks JWT on handshake

// On successful connection, register event handlers
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.user.name} (ID: ${socket.user.userId})`);
  initSocketHandlers(io, socket);  // attach event listeners (booking, etc.)

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.user.name}, reason: ${reason}`);
    // Cleanup if needed
  });
});

// Start the server
httpServer.listen(env.PORT, () => {
  console.log(`Socket server listening on port ${env.PORT}`);
});
