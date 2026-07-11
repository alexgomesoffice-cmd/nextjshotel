"use client";
import { useEffect } from "react";
import {io} from "socket.io-client";

export default function SocketTest() {
  useEffect(() => {
    const socket = io("http://localhost:4001");

    socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id);

    socket.emit("hello", { message: "Hello from client!" });
  });
  return () => {
    socket.disconnect();
  };
  }, []);

  

  return (
    <div>
      <h1>Socket Test</h1>
    </div>
  );
}