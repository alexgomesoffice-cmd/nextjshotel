import { Server, Socket } from "socket.io";

// Initialize all event handlers for a connected socket
export function initSocketHandlers(io: Server, socket: Socket) {
  // Example: join a room for a particular hotel
  socket.on("hotel:join", (hotelId: string) => {
    socket.join(`hotel-${hotelId}`);
    console.log(`User ${socket.user.name} joined hotel-${hotelId}`);
  });

  // Example: handle a booking request from client
  socket.on("booking:create", async (data: { roomId: number }) => {
    console.log(`Create booking from user ${socket.user.userId} for room ${data.roomId}`);
    // TODO: validate input, update DB, etc.
    const bookingId = Math.floor(Math.random()*100000); // placeholder
    // Emit success back to this user
    socket.emit("booking:success", { bookingId, roomId: data.roomId });
    // Broadcast room availability update to all in this hotel's room
    io.to(`hotel-${data.roomId}`).emit("room-updated", { roomId: data.roomId, status: "booked" });
  });

  // More handlers (e.g. chat, notifications) go here.
}
