import http from "http";
import { Server } from "socket.io";


const httpServer = http.createServer();
const io = new Server(httpServer);

httpServer.listen(4001);

io.on("connection", (socket) => {
  console.log("A user connected");
});