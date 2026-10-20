import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Shared singleton socket for the whole browser tab. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io", withCredentials: true });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
