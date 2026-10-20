# TeamBoard - Full-Stack Real-Time Collaborative Platform

A production-grade, real-time Kanban and project workspace built with **Next.js 14 App Router**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **Socket.io**.

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=flat-square&logo=socket.io)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/SQLite-Local_Storage-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)

---

## 📑 Quick Navigation
- [Features Overview](#-features-overview)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Quick Start](#-quick-start)
- [Multi-View System](#-multi-view-system)
- [Slide-Over Task Drawer](#-slide-over-task-drawer)
- [Command Palette & Shortcuts](#-command-palette--shortcuts)
- [WebSocket Protocol & Real-Time Sync](#-websocket-protocol--real-time-sync)
- [REST API Reference](#-rest-api-reference)
- [Testing & Quality Assurance](#-testing--quality-assurance)

---

## 🚀 Features Overview

1. **Multi-View Modes**:
   - **Kanban Board**: Drag-and-drop workflow stages (`To Do`, `In Progress`, `In Review`, `Done`) with physics-based fractional float positioning.
   - **Table / List View**: High-density tabular layout with inline status dropdowns, priority badges, and subtask metrics.
   - **Monthly Calendar**: Chronological milestone calendar grid with date badges and unscheduled sidebar.

2. **Bi-Directional Multi-User Real-Time Sync**:
   - Stacked collaborator presence indicator (`2 online`) with active pulsing ring.
   - Live card viewing notification (`"👤 Sarah is viewing"`).
   - Real-time task movement, checklist toggling, and comment broadcasts in **< 45ms** without full-page reloads.

3. **Slide-Over Task Drawer**:
   - Smooth slide-in drawer preserving board context.
   - Interactive subtask checklist with optimistic real-time progress bar calculation (`100%`).
   - Markdown description editor with formatted live preview.
   - Activity & comment feed with relative timestamps.

4. **Command Palette (`Ctrl + K` / `Cmd + K`)**:
   - Instant fuzzy search across tasks, tags, and assignees.
   - Quick action shortcuts (Switch views, create task, toggle theme, toggle sound).
   - Inline column filter (`/` shortcut) with live counters (`1 of 4 tasks`).

5. **Audio Micro-Interactions & Celebrations**:
   - Zero-latency Web Audio API synthesizers producing gentle melodic completion chimes and pops (toggleable via toolbar).
   - Full-screen celebration confetti (`canvas-confetti`) when completing all checklist items or dropping cards into `Done`.

---

## 🏛️ Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Client (Browser)                     │
│    Next.js 14 App Router (React 18, Tailwind CSS, Lucide)   │
│   next-themes | sonner | date-fns | canvas-confetti         │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTP REST Requests           │ WebSocket Events
               │ (Cookies: JWT)               │ (Rooms: project, user)
               ▼                              │
┌─────────────────────────────────────────────┴───────────────┐
│              Custom Node.js Server (server.ts)              │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │   Next.js App Server    │   │   Socket.io 4.8 Server  │  │
│  │  - API Route Handlers   │   │  - Auth Handshake       │  │
│  │  - Edge Middleware      │   │  - Project Rooms        │  │
│  │  - SSR / RSC Pages      │   │  - Presence & Viewers   │  │
│  └───────────┬─────────────┘   └────────────▲────────────┘  │
│              │                              │               │
│              │ Calls emitToProject()        │               │
│              └──────────────────────────────┘               │
│                              │                              │
│                              ▼                              │
│                      Prisma ORM Client                      │
│                              │                              │
│              ┌───────────────┴───────────────┐              │
│              ▼                               ▼              │
│      SQLite (dev.db)             PostgreSQL (Docker/Cloud)  │
│     (Default Zero-Config)           (Production Ready)      │
└─────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (`.env`)
The project includes pre-configured defaults in `.env`:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-32-character-secret-key-goes-here"
PORT=3000
```

### 3. Initialize Database Schema
```bash
npx prisma db push
```

### 4. Seed QA Baseline Data *(Optional)*
```bash
npx tsx scripts/seed-qa.ts
```

### 5. Launch Development Server
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Default Accounts**:
> - Admin: `admin@example.com` / `password123`
> - Member: `member@example.com` / `password123`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :---: | :--- |
| `Ctrl + K` / `Cmd + K` | Open / Close Command Palette |
| `C` | Quick Add new task to `To Do` column |
| `/` | Focus board search filter input |
| `Esc` | Close active drawer, modal, or command palette |

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/register`: Create user account.
- `POST /api/auth/login`: Authenticate and receive `httpOnly` JWT cookie.
- `POST /api/auth/logout`: Terminate session.
- `GET /api/auth/me`: Current session user profile.

### Projects & Members
- `GET /api/projects`: List all user projects.
- `POST /api/projects`: Create project (`name`, `description`).
- `GET /api/projects/:id`: Get project details and tasks.
- `PATCH /api/projects/:id`: Update project metadata.
- `DELETE /api/projects/:id`: Delete project.
- `POST /api/projects/:id/members`: Invite team member by email.
- `DELETE /api/projects/:id/members/:memberId`: Remove member.

### Tasks & Comments
- `POST /api/projects/:id/tasks`: Create task (`title`, `status`, `priority`, `dueDate`, `tags`, `subtasks`).
- `GET /api/tasks/:id`: Get task details.
- `PATCH /api/tasks/:id`: Update task (`title`, `description`, `status`, `priority`, `position`, `assigneeId`, `dueDate`, `tags`, `subtasks`).
- `DELETE /api/tasks/:id`: Delete task.
- `GET /api/tasks/:id/comments`: Fetch task comment stream.
- `POST /api/tasks/:id/comments`: Post comment to task.

---

## 🔌 WebSocket Events Reference

- `project:join`: Joins isolated project room.
- `project:presence`: Emits list of online users in project.
- `task:created`: Broadcasts newly created task.
- `task:updated`: Broadcasts task state change, column move, or subtask update.
- `task:deleted`: Broadcasts task deletion.
- `task:viewing:start` / `task:viewing:end`: Broadcasts active drawer viewer status.
- `comment:created`: Broadcasts new comment to task drawer timeline.

---

## 🧪 Testing & Quality Assurance

Run the automated test and validation commands:

```bash
# Typecheck TypeScript (Zero errors)
npm run typecheck

# Execute Headless Browser End-to-End Test Suite
npx tsx scripts/run-qa-suite.ts
```

---

## 📄 License
MIT License.
