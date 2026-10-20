import type { Server } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: Server | undefined;
}

/** Broadcast an event to everyone viewing a project board. */
export function emitToProject(projectId: string, event: string, payload: unknown) {
  globalThis.io?.to(`project:${projectId}`).emit(event, payload);
}

/** Send an event to a single user (all of their open tabs). */
export function emitToUser(userId: string, event: string, payload: unknown) {
  globalThis.io?.to(`user:${userId}`).emit(event, payload);
}
