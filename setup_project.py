#!/usr/bin/env python3
"""
setup_project.py - generates the complete TeamBoard project and zips it.

Usage:   python3 setup_project.py
Result:  ./teamboard/   (full source tree)
         ./project.zip  (the same tree, ready to download/share)
"""
import os
import zipfile

PROJECT_DIR = "teamboard"
ZIP_NAME = "project.zip"

FILES = {
    '.env.example': r'''# PostgreSQL connection string (matches docker-compose.yml)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/teamboard?schema=public"

# Secret used to sign auth JWT cookies. Use a long random string (32+ chars).
# Generate one with: openssl rand -base64 48
JWT_SECRET="change-me-to-a-long-random-string-at-least-32-characters"

PORT=3000
''',

    '.gitignore': r'''node_modules
.next
.env
.env.local
*.tsbuildinfo
next-env.d.ts
''',

    'README.md': r'''# TeamBoard - Collaborative Project Management Tool

A Trello/Asana-style full-stack app: create group projects, assign tasks, move cards on a
Kanban board, comment inside tasks, and see everything update live via WebSockets.

## Stack
- Next.js 14 (App Router, TypeScript) with a custom Node server (`server.ts`)
- Tailwind CSS with shadcn-style design tokens (light/dark mode)
- Prisma + PostgreSQL
- Socket.io (live task moves, comments, notifications)
- JWT in an httpOnly cookie (jose + bcryptjs), checked by middleware, API routes and the socket handshake

## Quick start
```bash
# 1. Start PostgreSQL (or point DATABASE_URL at your own instance)
docker compose up -d

# 2. Configure environment
cp .env.example .env        # then set a strong JWT_SECRET

# 3. Install dependencies and create the tables
npm install
npx prisma db push          # or: npx prisma migrate dev --name init

# 4. Run (custom server: Next.js + Socket.io on one port)
npm run dev                 # http://localhost:3000
```

Production: `npm run build && npm start`.

> Always run through `npm run dev` / `npm start` (the custom server). Plain `next dev` has no WebSocket server.

## Try the real-time features
1. Register two users (use a normal window and a private window).
2. As user A, create a project and invite user B by email (B must have registered).
3. Open the project in both windows. Drag cards, add tasks, assign B, and comment - everything syncs instantly,
   and B gets a notification bell badge + toast when assigned or commented on.

## Structure
- `prisma/schema.prisma` - User, Project, ProjectMember, Task, Comment, Notification
- `server.ts` - HTTP + Socket.io server, JWT-authenticated sockets, per-project/user rooms
- `src/app/api/**` - REST API (auth, projects, members, tasks, comments, notifications)
- `src/components/board/**` - Kanban board, drag-and-drop columns/cards, task modal with live comments
- `src/lib/**` - JWT, auth cookies, Prisma client, realtime emit helpers, notifications

## Notes
- Card order uses fractional positions (`Float`), so a drag only updates one row.
- Drag-and-drop uses the native HTML5 API; on touch devices open a card and change its Status instead.
''',

    'docker-compose.yml': r'''services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: teamboard
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
''',

    'next.config.js': r'''/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
''',

    'package.json': r'''{
  "name": "teamboard",
  "version": "1.0.0",
  "private": true,
  "description": "Collaborative project management tool (Trello/Asana style) with real-time updates",
  "scripts": {
    "dev": "tsx server.ts",
    "build": "prisma generate && next build",
    "start": "NODE_ENV=production tsx server.ts",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "5.22.0",
    "bcryptjs": "2.4.3",
    "clsx": "2.1.1",
    "jose": "5.9.6",
    "lucide-react": "0.453.0",
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "socket.io": "4.8.0",
    "socket.io-client": "4.8.0",
    "tailwind-merge": "2.5.4",
    "tsx": "4.19.1",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/bcryptjs": "2.4.6",
    "@types/node": "20.16.11",
    "@types/react": "18.3.11",
    "@types/react-dom": "18.3.1",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.47",
    "prisma": "5.22.0",
    "tailwindcss": "3.4.14",
    "typescript": "5.6.3"
  }
}
''',

    'postcss.config.js': r'''module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
''',

    'prisma/schema.prisma': r'''generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  MEMBER
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum NotificationType {
  TASK_ASSIGNED
  COMMENT_ADDED
  PROJECT_INVITE
}

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  passwordHash  String
  createdAt     DateTime @default(now())

  ownedProjects Project[]       @relation("ProjectOwner")
  memberships   ProjectMember[]
  assignedTasks Task[]          @relation("TaskAssignee")
  createdTasks  Task[]          @relation("TaskCreator")
  comments      Comment[]
  notifications Notification[]
}

model Project {
  id          String   @id @default(cuid())
  name        String
  description String?
  ownerId     String
  owner       User     @relation("ProjectOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members       ProjectMember[]
  tasks         Task[]
  notifications Notification[]

  @@index([ownerId])
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId])
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  position    Float      @default(0)
  dueDate     DateTime?
  projectId   String
  assigneeId  String?
  creatorId   String
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?     @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  creator  User      @relation("TaskCreator", fields: [creatorId], references: [id], onDelete: Cascade)
  comments Comment[]

  @@index([projectId, status, position])
  @@index([assigneeId])
}

model Comment {
  id        String   @id @default(cuid())
  content   String
  taskId    String
  authorId  String
  createdAt DateTime @default(now())

  task   Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([taskId, createdAt])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  message   String
  read      Boolean          @default(false)
  projectId String?
  taskId    String?
  createdAt DateTime         @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([userId, read, createdAt])
}
''',

    'server.ts': r'''import { createServer } from "http";
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

  io.on("connection", (socket) => {
    const user = socket.data.user as SessionUser;
    // Personal room for notifications.
    socket.join(`user:${user.id}`);

    socket.on("project:join", async (projectId: unknown) => {
      if (typeof projectId !== "string") return;
      try {
        const membership = await prisma.projectMember.findUnique({
          where: { projectId_userId: { projectId, userId: user.id } },
        });
        if (!membership) return;
        socket.join(`project:${projectId}`);
        socket.emit("project:joined", { projectId });
      } catch (err) {
        console.error("project:join failed", err);
      }
    });

    socket.on("project:leave", (projectId: unknown) => {
      if (typeof projectId !== "string") return;
      socket.leave(`project:${projectId}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`> TeamBoard ready on http://localhost:${port} (${dev ? "development" : "production"})`);
  });
});
''',

    'src/app/api/auth/login/route.ts': r'''import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth";
import { readJson } from "@/lib/api";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.res;
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  const valid = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signToken({ id: user.id, email: user.email, name: user.name });
  setAuthCookie(token);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });
}
''',

    'src/app/api/auth/logout/route.ts': r'''import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  clearAuthCookie();
  return NextResponse.json({ ok: true });
}
''',

    'src/app/api/auth/me/route.ts': r'''import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  return NextResponse.json({ user });
}
''',

    'src/app/api/auth/register/route.ts': r'''import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/jwt";
import { setAuthCookie } from "@/lib/auth";
import { readJson } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export async function POST(req: Request) {
  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.res;
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12) },
  });

  const token = await signToken({ id: user.id, email: user.email, name: user.name });
  setAuthCookie(token);
  return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } }, { status: 201 });
}
''',

    'src/app/api/notifications/route.ts': r'''import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { readJson, unauthorized } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
});

/** Mark specific notifications (or all, when no ids given) as read. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const parsed = await readJson(req, patchSchema);
  if (!parsed.ok) return parsed.res;

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      read: false,
      ...(parsed.data.ids ? { id: { in: parsed.data.ids } } : {}),
    },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
''',

    'src/app/api/projects/[id]/members/route.ts': r'''import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { badRequest, forbidden, notFound, readJson, unauthorized } from "@/lib/api";
import { userSelect } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";
import { notify } from "@/lib/notify";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return notFound("Project");
  if (project.ownerId !== user.id) return forbidden();

  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.res;

  const invitee = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!invitee) return badRequest("No user with that email. They need to register first.");

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: project.id, userId: invitee.id } },
  });
  if (existing) return NextResponse.json({ error: "That user is already a member" }, { status: 409 });

  const member = await prisma.projectMember.create({
    data: { projectId: project.id, userId: invitee.id, role: "MEMBER" },
    include: { user: { select: userSelect } },
  });

  emitToProject(project.id, "member:added", { member });
  await notify({
    userId: invitee.id,
    type: "PROJECT_INVITE",
    message: `${user.name} added you to the project "${project.name}"`,
    projectId: project.id,
  });

  return NextResponse.json({ member }, { status: 201 });
}
''',

    'src/app/api/projects/[id]/route.ts': r'''import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { forbidden, notFound, unauthorized } from "@/lib/api";
import { taskInclude, userSelect } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!(await getMembership(params.id, user.id))) return forbidden();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: userSelect },
      members: { include: { user: { select: userSelect } }, orderBy: { createdAt: "asc" } },
      tasks: { include: taskInclude, orderBy: { position: "asc" } },
    },
  });
  if (!project) return notFound("Project");
  return NextResponse.json({ project });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return notFound("Project");
  if (project.ownerId !== user.id) return forbidden();

  await prisma.project.delete({ where: { id: params.id } });
  emitToProject(params.id, "project:deleted", { projectId: params.id });
  return NextResponse.json({ ok: true });
}
''',

    'src/app/api/projects/[id]/tasks/route.ts': r'''import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { badRequest, forbidden, readJson, unauthorized } from "@/lib/api";
import { taskInclude } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";
import { notify } from "@/lib/notify";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  if (!(await getMembership(params.id, user.id))) return forbidden();

  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.res;
  const d = parsed.data;

  if (d.assigneeId && !(await getMembership(params.id, d.assigneeId))) {
    return badRequest("Assignee must be a project member");
  }
  let dueDate: Date | null = null;
  if (d.dueDate) {
    dueDate = new Date(d.dueDate);
    if (Number.isNaN(dueDate.getTime())) return badRequest("Invalid due date");
  }

  const last = await prisma.task.findFirst({
    where: { projectId: params.id, status: d.status },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const task = await prisma.task.create({
    data: {
      title: d.title,
      description: d.description ?? null,
      status: d.status,
      priority: d.priority,
      position: (last?.position ?? 0) + 1000,
      dueDate,
      projectId: params.id,
      assigneeId: d.assigneeId ?? null,
      creatorId: user.id,
    },
    include: taskInclude,
  });

  emitToProject(params.id, "task:created", { task, actorId: user.id });

  if (task.assigneeId && task.assigneeId !== user.id) {
    await notify({
      userId: task.assigneeId,
      type: "TASK_ASSIGNED",
      message: `${user.name} assigned you "${task.title}"`,
      projectId: params.id,
      taskId: task.id,
    });
  }

  return NextResponse.json({ task }, { status: 201 });
}
''',

    'src/app/api/projects/route.ts': r'''import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { readJson, unauthorized } from "@/lib/api";
import { userSelect } from "@/lib/queries";

const createSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  description: z.string().trim().max(500).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: userSelect },
      _count: { select: { tasks: true, members: true } },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const parsed = await readJson(req, createSchema);
  if (!parsed.ok) return parsed.res;

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
    include: {
      owner: { select: userSelect },
      _count: { select: { tasks: true, members: true } },
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
''',

    'src/app/api/tasks/[id]/comments/route.ts': r'''import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { forbidden, notFound, readJson, unauthorized } from "@/lib/api";
import { userSelect } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";
import { notify } from "@/lib/notify";

const schema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(2000),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return notFound("Task");
  if (!(await getMembership(task.projectId, user.id))) return forbidden();

  const comments = await prisma.comment.findMany({
    where: { taskId: params.id },
    orderBy: { createdAt: "asc" },
    include: { author: { select: userSelect } },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) return notFound("Task");
  if (!(await getMembership(task.projectId, user.id))) return forbidden();

  const parsed = await readJson(req, schema);
  if (!parsed.ok) return parsed.res;

  const created = await prisma.comment.create({
    data: { content: parsed.data.content, taskId: task.id, authorId: user.id },
    include: { author: { select: userSelect } },
  });
  const comment = { ...created, projectId: task.projectId };

  emitToProject(task.projectId, "comment:created", { comment });

  // Notify the assignee and creator (except the commenter), once each.
  const recipients = new Set<string>();
  if (task.assigneeId) recipients.add(task.assigneeId);
  recipients.add(task.creatorId);
  recipients.delete(user.id);
  for (const userId of recipients) {
    await notify({
      userId,
      type: "COMMENT_ADDED",
      message: `${user.name} commented on "${task.title}"`,
      projectId: task.projectId,
      taskId: task.id,
    });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
''',

    'src/app/api/tasks/[id]/route.ts': r'''import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { badRequest, forbidden, notFound, readJson, unauthorized } from "@/lib/api";
import { taskInclude } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";
import { notify } from "@/lib/notify";

const patchSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  position: z.number().finite().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const task = await prisma.task.findUnique({ where: { id: params.id }, include: taskInclude });
  if (!task) return notFound("Task");
  if (!(await getMembership(task.projectId, user.id))) return forbidden();
  return NextResponse.json({ task });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Task");
  if (!(await getMembership(existing.projectId, user.id))) return forbidden();

  const parsed = await readJson(req, patchSchema);
  if (!parsed.ok) return parsed.res;
  const d = parsed.data;

  if (d.assigneeId && !(await getMembership(existing.projectId, d.assigneeId))) {
    return badRequest("Assignee must be a project member");
  }

  let dueDate: Date | null | undefined = undefined;
  if (d.dueDate === null) {
    dueDate = null;
  } else if (typeof d.dueDate === "string") {
    dueDate = d.dueDate === "" ? null : new Date(d.dueDate);
    if (dueDate && Number.isNaN(dueDate.getTime())) return badRequest("Invalid due date");
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data: {
      title: d.title,
      description: d.description,
      status: d.status,
      priority: d.priority,
      position: d.position,
      assigneeId: d.assigneeId,
      dueDate,
    },
    include: taskInclude,
  });

  emitToProject(task.projectId, "task:updated", { task, actorId: user.id });

  if (d.assigneeId && d.assigneeId !== existing.assigneeId && d.assigneeId !== user.id) {
    await notify({
      userId: d.assigneeId,
      type: "TASK_ASSIGNED",
      message: `${user.name} assigned you "${task.title}"`,
      projectId: task.projectId,
      taskId: task.id,
    });
  }

  return NextResponse.json({ task });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const existing = await prisma.task.findUnique({ where: { id: params.id } });
  if (!existing) return notFound("Task");
  if (!(await getMembership(existing.projectId, user.id))) return forbidden();

  await prisma.task.delete({ where: { id: params.id } });
  emitToProject(existing.projectId, "task:deleted", {
    taskId: existing.id,
    projectId: existing.projectId,
    actorId: user.id,
  });
  return NextResponse.json({ ok: true });
}
''',

    'src/app/dashboard/page.tsx': r'''import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { userSelect } from "@/lib/queries";
import { Header } from "@/components/layout/header";
import { DashboardClient } from "@/components/dashboard-client";
import type { ProjectSummaryDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: userSelect },
      _count: { select: { tasks: true, members: true } },
    },
  });

  const initialProjects = JSON.parse(JSON.stringify(projects)) as ProjectSummaryDTO[];

  return (
    <>
      <Header user={user} />
      <DashboardClient initialProjects={initialProjects} userName={user.name} />
    </>
  );
}
''',

    'src/app/globals.css': r'''@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --muted: 210 40% 96%;
    --muted-foreground: 215 16% 40%;
    --border: 214 32% 91%;
    --input: 214 32% 85%;
    --primary: 222 47% 11%;
    --primary-foreground: 210 40% 98%;
    --accent: 210 40% 94%;
    --destructive: 0 72% 51%;
    --ring: 222 47% 40%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222 47% 7%;
    --foreground: 210 40% 98%;
    --card: 222 47% 10%;
    --muted: 217 33% 15%;
    --muted-foreground: 215 20% 65%;
    --border: 217 33% 20%;
    --input: 217 33% 24%;
    --primary: 210 40% 98%;
    --primary-foreground: 222 47% 11%;
    --accent: 217 33% 18%;
    --destructive: 0 63% 50%;
    --ring: 212 27% 70%;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
  }
}
''',

    'src/app/layout.tsx': r'''import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TeamBoard - Collaborative Project Management",
  description: "Plan projects, assign tasks and collaborate in real time.",
};

const themeScript = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
''',

    'src/app/login/page.tsx': r'''import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
''',

    'src/app/page.tsx': r'''import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
''',

    'src/app/projects/[id]/page.tsx': r'''import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { taskInclude, userSelect } from "@/lib/queries";
import { Header } from "@/components/layout/header";
import { BoardClient } from "@/components/board/board-client";
import type { MemberDTO, TaskDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getMembership(params.id, user.id))) notFound();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: userSelect } }, orderBy: { createdAt: "asc" } },
      tasks: { include: taskInclude, orderBy: { position: "asc" } },
    },
  });
  if (!project) notFound();

  const tasks = JSON.parse(JSON.stringify(project.tasks)) as TaskDTO[];
  const members = JSON.parse(JSON.stringify(project.members)) as MemberDTO[];

  return (
    <>
      <Header user={user} />
      <BoardClient
        projectId={project.id}
        projectName={project.name}
        projectDescription={project.description}
        ownerId={project.ownerId}
        initialTasks={tasks}
        initialMembers={members}
        currentUser={user}
      />
    </>
  );
}
''',

    'src/app/register/page.tsx': r'''import { AuthForm } from "@/components/auth-form";

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
''',

    'src/components/auth-form.tsx': r'''"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KanbanSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <KanbanSquare className="h-8 w-8" />
          <h1 className="text-xl font-semibold">{isRegister ? "Create your account" : "Welcome back"}</h1>
          <p className="text-sm text-muted-foreground">
            {isRegister ? "Start collaborating with your team" : "Sign in to your TeamBoard workspace"}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 8 : 1}
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
            {isRegister && <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Please wait..." : isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "New to TeamBoard?"}{" "}
          <Link href={isRegister ? "/login" : "/register"} className="font-medium text-foreground underline">
            {isRegister ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}
''',

    'src/components/board/board-client.tsx': r'''"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Column } from "./column";
import { TaskModal } from "./task-modal";
import { getSocket } from "@/lib/socket-client";
import { cn } from "@/lib/utils";
import { STATUSES, type CommentDTO, type MemberDTO, type TaskDTO, type TaskStatus, type UserLite } from "@/lib/types";

interface BoardClientProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  ownerId: string;
  initialTasks: TaskDTO[];
  initialMembers: MemberDTO[];
  currentUser: UserLite;
}

export function BoardClient({
  projectId,
  projectName,
  projectDescription,
  ownerId,
  initialTasks,
  initialMembers,
  currentUser,
}: BoardClientProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskDTO[]>(initialTasks);
  const [members, setMembers] = useState<MemberDTO[]>(initialMembers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ status: TaskStatus; index: number } | null>(null);
  const [live, setLive] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteMsg, setInviteMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const isOwner = currentUser.id === ownerId;

  const upsertTask = useCallback((task: TaskDTO) => {
    setTasks((prev) => (prev.some((t) => t.id === task.id) ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]));
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return;
    const data = await res.json();
    setTasks(data.project.tasks);
    setMembers(data.project.members);
  }, [projectId]);

  // Real-time subscription for this project's board.
  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      socket.emit("project:join", projectId);
      setLive(true);
      // Re-sync after (re)connects so we never miss events.
      reload();
    };
    const onDisconnect = () => setLive(false);
    const onCreated = ({ task }: { task: TaskDTO }) => upsertTask(task);
    const onUpdated = ({ task }: { task: TaskDTO }) => upsertTask(task);
    const onDeleted = ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedId((cur) => (cur === taskId ? null : cur));
    };
    const onMember = ({ member }: { member: MemberDTO }) =>
      setMembers((prev) => (prev.some((m) => m.id === member.id) ? prev : [...prev, member]));
    const onComment = ({ comment }: { comment: CommentDTO }) =>
      setTasks((prev) =>
        prev.map((t) => (t.id === comment.taskId ? { ...t, _count: { comments: t._count.comments + 1 } } : t))
      );
    const onProjectDeleted = () => {
      router.push("/dashboard");
      router.refresh();
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);
    socket.on("task:deleted", onDeleted);
    socket.on("member:added", onMember);
    socket.on("comment:created", onComment);
    socket.on("project:deleted", onProjectDeleted);

    return () => {
      socket.emit("project:leave", projectId);
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("task:created", onCreated);
      socket.off("task:updated", onUpdated);
      socket.off("task:deleted", onDeleted);
      socket.off("member:added", onMember);
      socket.off("comment:created", onComment);
      socket.off("project:deleted", onProjectDeleted);
    };
  }, [projectId, reload, router, upsertTask]);

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, TaskDTO[]> = { TODO: [], IN_PROGRESS: [], IN_REVIEW: [], DONE: [] };
    for (const t of tasks) grouped[t.status].push(t);
    for (const key of Object.keys(grouped) as TaskStatus[]) grouped[key].sort((a, b) => a.position - b.position);
    return grouped;
  }, [tasks]);

  const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null;

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setBoardError(data.error ?? "Could not update task");
      await reload();
      return;
    }
    setBoardError(null);
    const data = await res.json();
    upsertTask(data.task);
  }

  async function deleteTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      setBoardError("Could not delete task");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedId(null);
  }

  async function quickAdd(status: TaskStatus, title: string) {
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBoardError(data.error ?? "Could not create task");
      throw new Error("create failed");
    }
    setBoardError(null);
    upsertTask(data.task);
  }

  function handleDrop(status: TaskStatus) {
    const id = dragId;
    const target = drop;
    setDragId(null);
    setDrop(null);
    if (!id || !target || target.status !== status) return;
    const dragged = tasks.find((t) => t.id === id);
    if (!dragged) return;

    const original = columns[status];
    const originalIndex = original.findIndex((t) => t.id === id);
    const list = original.filter((t) => t.id !== id);
    let index = target.index;
    if (originalIndex !== -1 && originalIndex < index) index -= 1;
    index = Math.max(0, Math.min(index, list.length));

    const prev = list[index - 1];
    const next = list[index];
    let position: number;
    if (!prev && !next) position = 1000;
    else if (!prev) position = next.position / 2;
    else if (!next) position = prev.position + 1000;
    else position = (prev.position + next.position) / 2;

    if (dragged.status === status && dragged.position === position) return;

    // Optimistic update, then persist (server broadcasts to everyone else).
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, status, position } : t)));
    patchTask(id, { status, position });
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviteMsg(null);
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setInviteMsg({ type: "error", text: data.error ?? "Could not add member" });
      return;
    }
    setMembers((prev) => (prev.some((m) => m.id === data.member.id) ? prev : [...prev, data.member]));
    setInviteEmail("");
    setInviteMsg({ type: "ok", text: `${data.member.user.name} was added to the project` });
  }

  async function deleteProject() {
    if (!window.confirm(`Delete "${projectName}" and all of its tasks?`)) return;
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setBoardError("Could not delete project");
    }
  }

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold">{projectName}</h1>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs",
                live ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-green-500" : "bg-muted-foreground")} />
              {live ? "Live" : "Offline"}
            </span>
          </div>
          {projectDescription && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{projectDescription}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2">
            {members.map((m) => (
              <Avatar key={m.id} name={m.user.name} className="h-8 w-8 border-2 border-background" />
            ))}
          </div>
          {isOwner && (
            <>
              <form onSubmit={invite} className="flex items-center gap-2">
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite by email"
                  className="h-9 w-48"
                />
                <Button type="submit" size="sm" variant="secondary">
                  <UserPlus className="h-4 w-4" /> Add
                </Button>
              </form>
              <Button size="sm" variant="outline" onClick={deleteProject}>
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {inviteMsg && (
        <p className={cn("mb-3 text-sm", inviteMsg.type === "ok" ? "text-green-600 dark:text-green-400" : "text-destructive")}>
          {inviteMsg.text}
        </p>
      )}
      {boardError && <p className="mb-3 text-sm text-destructive">{boardError}</p>}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((s) => (
          <Column
            key={s.id}
            status={s.id}
            label={s.label}
            tasks={columns[s.id]}
            dragId={dragId}
            dropIndex={drop && drop.status === s.id ? drop.index : null}
            onDragStart={setDragId}
            onDragEnd={() => {
              setDragId(null);
              setDrop(null);
            }}
            onOverIndex={(status, index) => {
              setDrop((cur) => (cur && cur.status === status && cur.index === index ? cur : { status, index }));
            }}
            onDrop={handleDrop}
            onOpen={setSelectedId}
            onQuickAdd={quickAdd}
          />
        ))}
      </div>

      {selectedTask && (
        <TaskModal
          key={selectedTask.id}
          task={selectedTask}
          members={members}
          currentUser={currentUser}
          onClose={() => setSelectedId(null)}
          onPatch={patchTask}
          onDelete={deleteTask}
        />
      )}
    </main>
  );
}
''',

    'src/components/board/column.tsx': r'''"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskCard } from "./task-card";
import { cn } from "@/lib/utils";
import type { TaskDTO, TaskStatus } from "@/lib/types";

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: TaskDTO[];
  dragId: string | null;
  dropIndex: number | null;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onOverIndex: (status: TaskStatus, index: number) => void;
  onDrop: (status: TaskStatus) => void;
  onOpen: (taskId: string) => void;
  onQuickAdd: (status: TaskStatus, title: string) => Promise<void>;
}

function DropLine() {
  return <div className="h-0.5 rounded bg-ring" />;
}

export function Column({
  status,
  label,
  tasks,
  dragId,
  dropIndex,
  onDragStart,
  onDragEnd,
  onOverIndex,
  onDrop,
  onOpen,
  onQuickAdd,
}: ColumnProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const isActive = dragId !== null && dropIndex !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onQuickAdd(status, title.trim());
      setTitle("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label={label}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/50 transition-colors",
        isActive && "border-ring/60"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onOverIndex(status, tasks.length);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(status);
      }}
    >
      <header className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-sm font-semibold">{label}</h3>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{tasks.length}</span>
      </header>

      <div className="flex min-h-[60px] flex-1 flex-col gap-2 px-2 pb-2">
        {tasks.map((task, i) => (
          <div key={task.id} className="flex flex-col gap-2">
            {isActive && dropIndex === i && <DropLine />}
            <TaskCard
              task={task}
              index={i}
              isDragging={dragId === task.id}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onOverIndex={(idx) => onOverIndex(status, idx)}
              onOpen={onOpen}
            />
          </div>
        ))}
        {isActive && dropIndex === tasks.length && <DropLine />}
      </div>

      <div className="border-t border-border p-2">
        {adding ? (
          <form onSubmit={submit} className="space-y-2">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              maxLength={200}
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                Add task
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add a task
          </Button>
        )}
      </div>
    </section>
  );
}
''',

    'src/components/board/priority-badge.tsx': r'''import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/types";

const styles: Record<Priority, string> = {
  LOW: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  MEDIUM: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  HIGH: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  URGENT: "bg-red-500/15 text-red-700 dark:text-red-300",
};

const labels: Record<Priority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" };

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide", styles[priority])}>
      {labels[priority]}
    </span>
  );
}
''',

    'src/components/board/task-card.tsx': r'''"use client";

import { CalendarDays, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "./priority-badge";
import { cn, formatDate } from "@/lib/utils";
import type { TaskDTO } from "@/lib/types";

interface TaskCardProps {
  task: TaskDTO;
  index: number;
  isDragging: boolean;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onOverIndex: (index: number) => void;
  onOpen: (taskId: string) => void;
}

export function TaskCard({ task, index, isDragging, onDragStart, onDragEnd, onOverIndex, onOpen }: TaskCardProps) {
  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen(task.id);
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        onOverIndex(index + (after ? 1 : 0));
      }}
      className={cn(
        "cursor-grab select-none rounded-md border border-border bg-card p-3 text-left shadow-sm transition-opacity",
        "hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {task.assignee && <Avatar name={task.assignee.name} />}
      </div>
      <p className="text-sm font-medium leading-snug">{task.title}</p>
      {(task.dueDate || task._count.comments > 0) && (
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {task.dueDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task._count.comments > 0 && (
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {task._count.comments}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
''',

    'src/components/board/task-modal.tsx': r'''"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { getSocket } from "@/lib/socket-client";
import { timeAgo } from "@/lib/utils";
import {
  PRIORITIES,
  STATUSES,
  type CommentDTO,
  type MemberDTO,
  type Priority,
  type TaskDTO,
  type TaskStatus,
  type UserLite,
} from "@/lib/types";

interface TaskModalProps {
  task: TaskDTO;
  members: MemberDTO[];
  currentUser: UserLite;
  onClose: () => void;
  onPatch: (taskId: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function TaskModal({ task, members, currentUser, onClose, onPatch, onDelete }: TaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Reset local drafts only when a different task is opened.
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const addComment = useCallback((comment: CommentDTO) => {
    setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
  }, []);

  // Load existing comments and subscribe to live ones.
  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    fetch(`/api/tasks/${task.id}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((data) => {
        if (!cancelled) setComments(data.comments);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    const socket = getSocket();
    const onCreated = ({ comment }: { comment: CommentDTO }) => {
      if (comment.taskId === task.id) addComment(comment);
    };
    socket.on("comment:created", onCreated);
    return () => {
      cancelled = true;
      socket.off("comment:created", onCreated);
    };
  }, [task.id, addComment]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [comments.length]);

  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) await onPatch(task.id, { title: trimmed });
  }

  async function saveDescription() {
    if (description !== (task.description ?? "")) await onPatch(task.id, { description: description || null });
  }

  async function postComment(e?: React.FormEvent) {
    e?.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not post comment");
        return;
      }
      addComment(data.comment);
      setNewComment("");
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    await onDelete(task.id);
  }

  return (
    <Modal open onClose={onClose}>
      <div className="grid gap-6 md:grid-cols-[1fr_220px]">
        <div className="min-w-0 space-y-5">
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              className="text-base font-semibold"
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Add more detail about this task..."
              rows={4}
              maxLength={5000}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Comments ({comments.length})</h3>
            <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border bg-background p-3">
              {loadingComments && <p className="text-sm text-muted-foreground">Loading comments...</p>}
              {!loadingComments && comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
              )}
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar name={c.author.name} />
                  <div className="min-w-0">
                    <p className="text-xs">
                      <span className="font-semibold">{c.author.id === currentUser.id ? "You" : c.author.name}</span>{" "}
                      <span className="text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
              <div ref={listEndRef} />
            </div>

            <form onSubmit={postComment} className="mt-3 flex items-end gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment... (Ctrl+Enter to send)"
                rows={2}
                maxLength={2000}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    postComment();
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={posting || !newComment.trim()} aria-label="Send comment">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          </div>
        </div>

        <aside className="space-y-4">
          <div>
            <Label htmlFor="task-status">Status</Label>
            <Select id="task-status" value={task.status} onChange={(e) => onPatch(task.id, { status: e.target.value as TaskStatus })}>
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-priority">Priority</Label>
            <Select id="task-priority" value={task.priority} onChange={(e) => onPatch(task.id, { priority: e.target.value as Priority })}>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-assignee">Assignee</Label>
            <Select
              id="task-assignee"
              value={task.assigneeId ?? ""}
              onChange={(e) => onPatch(task.id, { assigneeId: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user.id} value={m.user.id}>
                  {m.user.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="task-due">Due date</Label>
            <Input
              id="task-due"
              type="date"
              className="h-9"
              value={task.dueDate ? task.dueDate.slice(0, 10) : ""}
              onChange={(e) =>
                onPatch(task.id, { dueDate: e.target.value ? new Date(`${e.target.value}T12:00:00.000Z`).toISOString() : null })
              }
            />
          </div>
          <Button variant="destructive" size="sm" className="w-full" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Delete task
          </Button>
        </aside>
      </div>
    </Modal>
  );
}
''',

    'src/components/dashboard-client.tsx': r'''"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, Users, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { ProjectSummaryDTO } from "@/lib/types";

export function DashboardClient({
  initialProjects,
  userName,
}: {
  initialProjects: ProjectSummaryDTO[];
  userName: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not create project");
        return;
      }
      setProjects((p) => [data.project, ...p]);
      setName("");
      setDescription("");
      router.push(`/projects/${data.project.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Hi {userName.split(" ")[0]}, here are your projects</h1>
      <p className="mt-1 text-sm text-muted-foreground">Create a group project, invite teammates and start moving tasks.</p>

      <form onSubmit={createProject} className="mt-6 grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="project-name">Project name</Label>
          <Input id="project-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Website redesign" required maxLength={100} />
        </div>
        <div>
          <Label htmlFor="project-desc">Description (optional)</Label>
          <Textarea
            id="project-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-10 min-h-0 py-2"
            maxLength={500}
            placeholder="What is this project about?"
          />
        </div>
        <Button type="submit" disabled={loading}>
          <Plus className="h-4 w-4" />
          {loading ? "Creating..." : "Create project"}
        </Button>
        {error && <p className="text-sm text-destructive sm:col-span-3">{error}</p>}
      </form>

      {projects.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          <FolderKanban className="h-8 w-8" />
          <p>No projects yet. Create your first one above.</p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block h-full rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
              >
                <h2 className="font-semibold">{p.name}</h2>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
                  {p.description || "No description"}
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ListChecks className="h-3.5 w-3.5" /> {p._count.tasks} tasks
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {p._count.members} members
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Owner: {p.owner.name}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
''',

    'src/components/layout/header.tsx': r'''"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KanbanSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { disconnectSocket } from "@/lib/socket-client";
import type { UserLite } from "@/lib/types";

export function Header({ user }: { user: Pick<UserLite, "name" | "email"> }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    disconnectSocket();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <KanbanSquare className="h-5 w-5" />
          TeamBoard
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <ThemeToggle />
          <div className="mx-2 hidden items-center gap-2 sm:flex">
            <Avatar name={user.name} />
            <span className="text-sm">{user.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
''',

    'src/components/layout/notification-bell.tsx': r'''"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket-client";
import { timeAgo } from "@/lib/utils";
import type { NotificationDTO } from "@/lib/types";

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications);
    setUnread(data.unreadCount);
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    const onNew = (n: NotificationDTO) => {
      setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)]);
      setUnread((u) => u + 1);
      setToast(n.message);
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(ids?: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : {}),
    });
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((u) => (ids ? Math.max(0, u - ids.length) : 0));
  }

  async function openNotification(n: NotificationDTO) {
    if (!n.read) await markRead([n.id]);
    setOpen(false);
    if (n.projectId) router.push(`/projects/${n.projectId}`);
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Notifications" className="relative">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button className="text-xs text-muted-foreground hover:underline" onClick={() => markRead()}>
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">You are all caught up.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => openNotification(n)}
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-accent"
                >
                  <span className={n.read ? "text-sm text-muted-foreground" : "text-sm font-medium"}>{n.message}</span>
                  <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-lg border border-border bg-card px-4 py-3 text-sm shadow-lg">
          <div className="flex items-start gap-2">
            <Bell className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
''',

    'src/components/layout/theme-toggle.tsx': r'''"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
''',

    'src/components/ui/avatar.tsx': r'''import { cn, initials } from "@/lib/utils";

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground",
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
''',

    'src/components/ui/button.tsx': r'''import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-muted text-foreground hover:bg-accent",
  outline: "border border-input bg-transparent hover:bg-accent",
  ghost: "bg-transparent hover:bg-accent",
  destructive: "bg-destructive text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
''',

    'src/components/ui/input.tsx': r'''import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(field, "h-10", className)} {...props} />
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(field, "min-h-[80px] py-2", className)} {...props} />
  )
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(field, "h-9", className)} {...props} />
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-xs font-medium text-muted-foreground", className)} {...props} />;
}
''',

    'src/components/ui/modal.tsx': r'''"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn("relative w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-xl", className)}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
''',

    'src/lib/access.ts': r'''import { prisma } from "./prisma";

export function getMembership(projectId: string, userId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}
''',

    'src/lib/api.ts': r'''import { NextResponse } from "next/server";
import type { z } from "zod";

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
export const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });
export const notFound = (what = "Resource") => NextResponse.json({ error: `${what} not found` }, { status: 404 });
export const badRequest = (message: string) => NextResponse.json({ error: message }, { status: 400 });

export async function readJson<T>(
  req: Request,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): Promise<{ ok: true; data: T } | { ok: false; res: NextResponse }> {
  const raw = await req.json().catch(() => null);
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, res: badRequest(result.error.issues[0]?.message ?? "Invalid input") };
  }
  return { ok: true, data: result.data };
}
''',

    'src/lib/auth.ts': r'''import { cookies } from "next/headers";
import { COOKIE_NAME, TOKEN_MAX_AGE, verifyToken, type SessionUser } from "./jwt";

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function setAuthCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TOKEN_MAX_AGE,
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
''',

    'src/lib/jwt.ts': r'''import { SignJWT, jwtVerify } from "jose";

export const COOKIE_NAME = "token";
export const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set (16+ characters). See .env.example");
  }
  return new TextEncoder().encode(secret);
}

export async function signToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") {
      return null;
    }
    return { id: payload.sub, email: payload.email, name: payload.name };
  } catch {
    return null;
  }
}
''',

    'src/lib/notify.ts': r'''import { prisma } from "./prisma";
import { emitToUser } from "./realtime";

type NotificationType = "TASK_ASSIGNED" | "COMMENT_ADDED" | "PROJECT_INVITE";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  message: string;
  projectId?: string;
  taskId?: string;
}

/** Persist a notification and push it to the user in real time. */
export async function notify(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      projectId: input.projectId,
      taskId: input.taskId,
    },
  });
  emitToUser(input.userId, "notification:new", notification);
  return notification;
}
''',

    'src/lib/prisma.ts': r'''import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

globalForPrisma.prisma = prisma;
''',

    'src/lib/queries.ts': r'''export const userSelect = { id: true, name: true, email: true } as const;

export const taskInclude = {
  assignee: { select: userSelect },
  _count: { select: { comments: true } },
} as const;
''',

    'src/lib/realtime.ts': r'''import type { Server } from "socket.io";

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
''',

    'src/lib/socket-client.ts': r'''import { io, type Socket } from "socket.io-client";

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
''',

    'src/lib/types.ts': r'''export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "IN_REVIEW", label: "In Review" },
  { id: "DONE", label: "Done" },
];

export const PRIORITIES: { id: Priority; label: string }[] = [
  { id: "LOW", label: "Low" },
  { id: "MEDIUM", label: "Medium" },
  { id: "HIGH", label: "High" },
  { id: "URGENT", label: "Urgent" },
];

export interface UserLite {
  id: string;
  name: string;
  email: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  position: number;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  assignee: UserLite | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number };
}

export interface CommentDTO {
  id: string;
  content: string;
  taskId: string;
  projectId?: string;
  authorId: string;
  author: UserLite;
  createdAt: string;
}

export interface MemberDTO {
  id: string;
  role: "OWNER" | "MEMBER";
  user: UserLite;
}

export interface ProjectSummaryDTO {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: UserLite;
  createdAt: string;
  _count: { tasks: number; members: number };
}

export interface NotificationDTO {
  id: string;
  type: "TASK_ASSIGNED" | "COMMENT_ADDED" | "PROJECT_INVITE";
  message: string;
  read: boolean;
  projectId: string | null;
  taskId: string | null;
  createdAt: string;
}
''',

    'src/lib/utils.ts': r'''import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

/** Deterministic date formatting (avoids server/client hydration mismatches). */
export function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}
''',

    'src/middleware.ts': r'''import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifyToken } from "@/lib/jwt";

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifyToken(token) : null;
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (!user && !isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (user && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/login", "/register"],
};
''',

    'tailwind.config.ts': r'''import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: "hsl(var(--accent))",
        destructive: "hsl(var(--destructive))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
''',

    'tsconfig.json': r'''{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
''',

}


def main():
    for rel_path, content in FILES.items():
        full_path = os.path.join(PROJECT_DIR, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(content)
        print("created", full_path)

    with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as zf:
        for folder, _dirs, names in os.walk(PROJECT_DIR):
            for name in sorted(names):
                path = os.path.join(folder, name)
                zf.write(path, os.path.relpath(path, os.path.dirname(PROJECT_DIR) or "."))
    print(f"\nDone: {len(FILES)} files written, archive created at {ZIP_NAME}")


if __name__ == "__main__":
    main()
