import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { prisma } from "./src/lib/prisma";
import { verifyToken, COOKIE_NAME, type SessionUser } from "./src/lib/jwt";

const dev = process.env.NODE_ENV !== "production";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname: "localhost", port });
const handle = app.getRequestHandler();

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/socket.io",
    // Same-origin by default; the auth cookie is sent automatically.
    cors: { origin: true, credentials: true },
  });

  // Expose the instance so Next.js API routes can emit events.
  globalThis.io = io;

  // Authenticate every socket using the same JWT cookie as the HTTP API.
  io.use(async (socket, nextFn) => {
    try {
      const cookies = parseCookies(socket.handshake.headers.cookie);
      const token = cookies[COOKIE_NAME];
      if (!token) return nextFn(new Error("unauthorized"));
      const user = await verifyToken(token);
      if (!user) return nextFn(new Error("unauthorized"));
      socket.data.user = user;
      nextFn();
    } catch {
      nextFn(new Error("unauthorized"));
    }
  });

  // In-memory presence map: projectId -> Map<socketId, SessionUser>
  const projectPresence = new Map<string, Map<string, SessionUser>>();
  // In-memory active task viewers: projectId -> Map<taskId, Map<userId, string (userName)>>
  const taskViewers = new Map<string, Map<string, Map<string, string>>>();

  function getActiveUsers(projectId: string): SessionUser[] {
    const sockets = projectPresence.get(projectId);
    if (!sockets) return [];
    const unique = new Map<string, SessionUser>();
    for (const u of sockets.values()) {
      unique.set(u.id, u);
    }
    return Array.from(unique.values());
  }

  io.on("connection", (socket) => {
    const user = socket.data.user as SessionUser;
    // Personal room for notifications.
    socket.join(`user:${user.id}`);

    let currentProjectId: string | null = null;
    let viewingTaskId: string | null = null;

    socket.on("project:join", async (projectId: unknown) => {
      if (typeof projectId !== "string") return;
      try {
        const membership = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: user.id } },
        });
        if (!membership) return;
        
        currentProjectId = projectId;
        socket.join(`project:${projectId}`);
        socket.emit("project:joined", { projectId });

        // Add to presence
        if (!projectPresence.has(projectId)) {
          projectPresence.set(projectId, new Map());
        }
        projectPresence.get(projectId)!.set(socket.id, user);

        // Broadcast updated presence to the project room
        io.to(`project:${projectId}`).emit("project:presence", {
          projectId,
          users: getActiveUsers(projectId),
        });
      } catch (err) {
        console.error("project:join failed", err);
      }
    });

    socket.on("project:leave", (projectId: unknown) => {
      if (typeof projectId !== "string") return;
      socket.leave(`project:${projectId}`);
      if (projectPresence.has(projectId)) {
        projectPresence.get(projectId)!.delete(socket.id);
        io.to(`project:${projectId}`).emit("project:presence", {
          projectId,
          users: getActiveUsers(projectId),
        });
      }
      currentProjectId = null;
    });

    socket.on("task:viewing:start", ({ projectId, taskId }: { projectId: string; taskId: string }) => {
      if (!projectId || !taskId) return;
      viewingTaskId = taskId;
      if (!taskViewers.has(projectId)) {
        taskViewers.set(projectId, new Map());
      }
      const projectTasks = taskViewers.get(projectId)!;
      if (!projectTasks.has(taskId)) {
        projectTasks.set(taskId, new Map());
      }
      projectTasks.get(taskId)!.set(user.id, user.name);

      socket.to(`project:${projectId}`).emit("task:viewing", {
        projectId,
        taskId,
        user: { id: user.id, name: user.name },
      });
    });

    socket.on("task:viewing:end", ({ projectId, taskId }: { projectId: string; taskId: string }) => {
      if (!projectId || !taskId) return;
      viewingTaskId = null;
      const projectTasks = taskViewers.get(projectId);
      if (projectTasks && projectTasks.has(taskId)) {
        projectTasks.get(taskId)!.delete(user.id);
      }
      socket.to(`project:${projectId}`).emit("task:viewing:ended", {
        projectId,
        taskId,
        userId: user.id,
      });
    });

    socket.on("disconnect", () => {
      if (currentProjectId) {
        if (projectPresence.has(currentProjectId)) {
          projectPresence.get(currentProjectId)!.delete(socket.id);
          io.to(`project:${currentProjectId}`).emit("project:presence", {
            projectId: currentProjectId,
            users: getActiveUsers(currentProjectId),
          });
        }
        if (viewingTaskId && taskViewers.has(currentProjectId)) {
          const projectTasks = taskViewers.get(currentProjectId);
          if (projectTasks && projectTasks.has(viewingTaskId)) {
            projectTasks.get(viewingTaskId)!.delete(user.id);
            socket.to(`project:${currentProjectId}`).emit("task:viewing:ended", {
              projectId: currentProjectId,
              taskId: viewingTaskId,
              userId: user.id,
            });
          }
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> TeamBoard ready on http://localhost:${port} (${dev ? "development" : "production"})`);
  });
});
