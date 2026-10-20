# TeamBoard - Collaborative Project Management Platform

A modern, full-stack, real-time project management and Kanban platform inspired by Trello, Linear, and Asana. TeamBoard enables teams to organize projects, track workflows across visual Kanban stages, assign tasks, collaborate through live comment threads, and receive instant updates powered by WebSockets.

---

## Table of Contents
- [✨ Key Features](#-key-features)
  - [1. Visual Atmosphere & Design System](#1-visual-atmosphere--design-system)
  - [2. Multi-View Modes (Kanban, Table, Timeline)](#2-multi-view-modes-kanban-table-timeline)
  - [3. Interactive Kanban Physics & Drag-and-Drop](#3-interactive-kanban-physics--drag-and-drop)
  - [4. Global Command Palette (`Cmd + K` / `Ctrl + K`)](#4-global-command-palette-cmd--k--ctrl--k)
  - [5. Slide-Over Task Detail Drawer](#5-slide-over-task-detail-drawer)
  - [6. Multi-Criteria Filter & Sort Toolbar](#6-multi-criteria-filter--sort-toolbar)
  - [7. Labels, Tags & Priority Indicators](#7-labels-tags--priority-indicators)
  - [8. Due Date Indicators & Reminders](#8-due-date-indicators--reminders)
  - [9. Subtasks & Checklist Progress](#9-subtasks--checklist-progress)
  - [10. Live Presence & Active Card Viewing](#10-live-presence--active-card-viewing)
  - [11. Sound Effects, Micro-Toasts & Celebrations](#11-sound-effects-micro-toasts--celebrations)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Project Directory Structure](#project-directory-structure)
- [Database Schema (Prisma)](#database-schema-prisma)
- [Real-Time WebSocket Architecture](#real-time-websocket-architecture)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Configuration](#environment-configuration)
  - [Database Setup (SQLite & PostgreSQL)](#database-setup-sqlite--postgresql)
  - [Running the Application](#running-the-application)
- [Testing Real-Time Multi-User Collaboration](#testing-real-time-multi-user-collaboration)
- [Security & Authentication](#security--authentication)
- [Available Scripts](#available-scripts)

---

## ✨ Key Features

### 1. Visual Atmosphere & Design System
- **Zinc & Slate Neutrals**: Meticulously tuned light and dark palette with zero unauthenticated theme flash (`next-themes`).
- **Glassmorphism**: Subtle card borders (`border-border/40`), frosted glass backdrops (`backdrop-blur-md bg-background/80`), and depth shadows (`shadow-sm` up to `shadow-xl` on hover/drag).
- **Responsive & Accessible**: Native mobile layouts with fallback controls for touch devices.

### 2. Multi-View Modes (Kanban, Table, Timeline)
Seamless view switcher in the board header:
- **Kanban Board**: Drag-and-drop workflow columns (`To Do`, `In Progress`, `In Review`, `Done`).
- **Table / List View**: High-density tabular layout with sortable columns, inline status updates, tags, and subtask counters.
- **Timeline / Calendar View**: Chronological milestone grouping (`Overdue`, `Due Today`, `This Week`, `Upcoming Milestones`, `Unscheduled`).

### 3. Interactive Kanban Physics & Drag-and-Drop
- **Fractional Float Position Indexing**: Task reordering calculates fractional float positions (`(prev + next) / 2`), allowing instant single-row updates without re-indexing all cards in a column.
- **Glowing Drop Indicator**: Visual feedback showing exact drop destination during card movement.
- **Quick-Add**: Instant inline task creation directly from column headers without opening complex forms.

### 4. Global Command Palette (`Cmd + K` / `Ctrl + K`)
- Trigger anywhere via keyboard shortcut or header search bar.
- Instant fuzzy search across project tasks, descriptions, and tags.
- Run quick actions: Create task, switch views, toggle dark/light mode, invite team members, or navigate to dashboard.

### 5. Slide-Over Task Detail Drawer
- Replaces rigid center dialogs with a slide-over sheet preserving board context.
- **Markdown Support**: Preview and edit modes for rich task descriptions with checklists and code blocks.
- **Live Comment Thread**: Real-time comment stream with `date-fns` relative timestamps (`formatRelativeTime`).

### 6. Multi-Criteria Filter & Sort Toolbar
- Instant debounced search filtering.
- Filter by Status (`To Do`, `In Progress`, `In Review`, `Done`).
- Filter by Priority (`Low`, `Medium`, `High`, `Urgent`).
- Filter by Assignee (`Unassigned` or specific members).
- Filter by Tag (`Frontend`, `Backend`, `Design`, `Bug`, `Feature`, `DevOps`, `Marketing`).
- Sort tasks by: Board order, Priority, Due Date, Title (A-Z), or Newest created.

### 7. Labels, Tags & Priority Indicators
- Color-coded badge chips (`Frontend`, `Backend`, `Design`, `Bug`, `Feature`, `DevOps`, `Marketing`).
- Priority indicator strips and micro-pills with distinct semantic coloring.

### 8. Due Date Indicators & Reminders
- Dynamic urgency badges:
  - 🔴 **Overdue**: Rose badge with alert calculation (`Overdue 2d`).
  - 🟡 **Due Today**: Amber badge highlighting immediate deadlines.
  - 🔵 **Due Tomorrow**: Blue badge.
  - 🟠 **Due Soon**: Orange badge (`In 3d`).
  - ⚪ **Future**: Clean muted date stamp (`MMM d`).

### 9. Subtasks & Checklist Progress
- Inline checklist management within the task drawer.
- Miniature progress bar and completion fraction (`3/5 done`, `60%`) rendered directly on board task cards.

### 10. Live Presence & Active Card Viewing
- **Online Collaborators**: Live presence indicator in the board header showing stacked avatars with pulsing green rings for active viewers.
- **Active Card Viewing**: When a teammate opens a task drawer, other team members see a live badge on that task card: `"👤 Alex is viewing"`.

### 11. Sound Effects, Micro-Toasts & Celebrations
- **Web Audio Chimes**: Lightweight synthesizers using browser Web Audio API—generates a melodic two-tone completion chime on task completion and soft pop on notifications.
- **Confetti Bursts**: Full-screen celebration burst (`canvas-confetti`) when moving tasks into `DONE` or finishing all subtasks.
- **Micro-Toasts**: Non-intrusive feedback toasts via `sonner`.

---

## Architecture & Tech Stack

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

## API Reference

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

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Default `.env` configuration for local SQLite development:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-32-character-secret-key-goes-here"
PORT=3000
```

### 3. Initialize Database
```bash
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```

Visit **http://localhost:3000** in your browser.

- Default Test Account:
  - **Email**: `admin@example.com`
  - **Password**: `password123`

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts custom unified server (Next.js + Socket.io) |
| `npm run build` | Generates Prisma client and creates production build |
| `npm run start` | Runs production server |
| `npm run typecheck` | Validates TypeScript compilation (`tsc --noEmit`) |
| `npm run lint` | Runs ESLint |
| `npm run db:push` | Syncs Prisma schema with database |

---

## License
MIT License.
