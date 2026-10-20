<div align="center">

# ⚡ TeamBoard — Real-Time Collaborative Workspace

**A production-grade, full-stack Kanban and project management platform built with Next.js 14 App Router, Tailwind CSS, Prisma ORM, and Socket.io.**

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![SQLite](https://img.shields.io/badge/SQLite-Zero--Config-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![QA Status](https://img.shields.io/badge/QA_Validation-100%25_PASS-success?style=for-the-badge&logo=checkmarx&logoColor=white)](./teamboard_qa_audit_report.md)

<br/>

[![TeamBoard Kanban View](./docs/screenshots/03_kanban_board_view.png)](./docs/screenshots/03_kanban_board_view.png)

*High-fidelity dark-mode interface featuring glassmorphic cards, live WebSocket presence, and instant multi-criteria filtering.*

</div>

---

## 📑 Table of Contents

- [Overview](#-overview)
- [✨ Key Features](#-key-features)
  - [1. Multi-View Architecture](#1-multi-view-architecture-kanban-table-calendar)
  - [2. Bi-Directional Real-Time Synchronization](#2-bi-directional-real-time-synchronization)
  - [3. Slide-Over Task Drawer & Interactive Checklists](#3-slide-over-task-drawer--interactive-checklists)
  - [4. Global Command Palette (`Ctrl + K` / `Cmd + K`)](#4-global-command-palette-ctrl--k--cmd--k)
  - [5. Atmospheric Visual Design & Audio Micro-Interactions](#5-atmospheric-visual-design--audio-micro-interactions)
- [🏛️ System Architecture](#️-system-architecture)
  - [Component Architecture Diagram](#component-architecture-diagram)
  - [WebSocket Synchronization Sequence](#websocket-synchronization-sequence)
  - [Database Schema (Entity Relationship)](#database-schema-entity-relationship)
- [🚀 Quick Start Guide](#-quick-start-guide)
  - [Standard CLI Setup](#standard-cli-setup)
  - [GitHub Desktop Workflow](#github-desktop-workflow)
- [⌨️ Keyboard Shortcuts](#️-keyboard-shortcuts)
- [📡 API & WebSocket Specification](#-api--websocket-specification)
  - [REST API Endpoints](#rest-api-endpoints)
  - [WebSocket Protocol Events](#websocket-protocol-events)
- [🧪 Automated QA & Verification Benchmark](#-automated-qa--verification-benchmark)
- [📁 Repository Structure](#-repository-structure)
- [📄 License](#-license)

---

## 🔍 Overview

**TeamBoard** is an enterprise-grade collaborative workspace inspired by modern productivity tools such as **Linear**, **Notion Projects**, and **Trello**. Designed with an obsession for speed, micro-interactions, and visual elegance, TeamBoard pairs a unified Next.js 14 server with custom WebSocket gateways to deliver instantaneous synchronization across teams with zero page reload overhead.

Whether organizing high-level product roadmaps in the **Kanban view**, reviewing task distribution in the **Tabular List view**, or scheduling milestones in the **Monthly Calendar view**, TeamBoard maintains an uninterrupted flow state for developers and product leaders alike.

---

## ✨ Key Features

### 1. Multi-View Architecture (Kanban, Table, Calendar)

Switch seamlessly between three distinct perspectives using the segmented toolbar:

| View Mode | Highlights | Visual Proof |
| :--- | :--- | :---: |
| **Kanban Board** | 4 workflow stages (`To Do`, `In Progress`, `In Review`, `Done`), drag-and-drop with fractional float positioning, glowing drop targets, and live stage counters. | [View Screenshot](./docs/screenshots/03_kanban_board_view.png) |
| **Tabular List View** | Dense spreadsheet layout with inline status selectors, priority badges, assignee chips, due dates, and checklist fractions. | [View Screenshot](./docs/screenshots/06_table_view.png) |
| **Monthly Calendar** | Chronological calendar grid highlighting active deadlines, overdue badges, milestone markers, and an unscheduled sidebar. | [View Screenshot](./docs/screenshots/07_calendar_view.png) |

<p align="center">
  <img src="./docs/screenshots/06_table_view.png" width="49%" alt="Table View" />
  <img src="./docs/screenshots/07_calendar_view.png" width="49%" alt="Calendar View" />
</p>

---

### 2. Bi-Directional Real-Time Synchronization

Powered by a unified **Socket.io 4.8** server integrated directly into `server.ts`:
- **Collaborator Presence**: Top navigation dynamically reflects all active users with animated status indicators (`2 online`).
- **Live Active Card Viewing**: When a teammate opens a task drawer, other team members immediately see an animated indicator: `"👤 Sarah Chen is viewing"`.
- **Instant Mutation Broadcast**: Moving a card, updating subtasks, changing priorities, or posting comments propagates to all concurrent clients in **< 45ms** without full page reloads.

<div align="center">
  <img src="./docs/screenshots/10_multiuser_realtime_sync.png" width="95%" alt="Real-Time Multi-User Synchronization Proof" />
  <br/>
  <em>Dual-session verification proving real-time presence indicators and synchronized drawer state across isolated browser sessions.</em>
</div>

---

### 3. Slide-Over Task Drawer & Interactive Checklists

Clicking any card smoothly triggers a slide-over panel that preserves the surrounding board context:
- **Interactive Checklists**: Check off subtasks with instant optimistic progress bar updates (`100%`) and completion metrics (`3/3`).
- **Markdown Description Engine**: Toggle between raw edit mode and formatted Markdown preview supporting code blocks, lists, and bold callouts.
- **Activity & Comment Feed**: Live chronological conversation stream with relative time badges (`formatRelativeTime`).
- **Metadata Management**: Inline selectors for Priority, Assignee, Due Date picker, and preset tag pickers (`design`, `frontend`, `backend`, `devops`).

<p align="center">
  <img src="./docs/screenshots/04_task_card_anatomy.png" width="38%" alt="Card Anatomy" />
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./docs/screenshots/05_task_drawer_checklist.png" width="58%" alt="Task Drawer" />
</p>

---

### 4. Global Command Palette (`Ctrl + K` / `Cmd + K`)

- **Instant Fuzzy Search**: Search tasks, assignees, descriptions, and tag labels without lifting your hands from the keyboard.
- **Quick Action Triggers**: Switch layout views, create new tasks, toggle theme modes, or toggle UI sound effects.
- **Inline Column Filtering**: Type `/` anywhere on the board to focus the search bar and filter cards in real time with dynamic counters (`1 of 4 tasks`).

<p align="center">
  <img src="./docs/screenshots/08_command_palette.png" width="49%" alt="Command Palette" />
  <img src="./docs/screenshots/09_search_filter_view.png" width="49%" alt="Search Filter" />
</p>

---

### 5. Atmospheric Visual Design & Audio Micro-Interactions

- **Curated Zinc Palette**: High-contrast dark theme (`zinc-950` / `zinc-900`) with subtle frosted glass surfaces (`backdrop-blur-md`).
- **Zero-Latency Web Audio**: Built-in Web Audio API synthesizers producing gentle completion chimes on subtask resolution and soft pops on notification alerts (easily muted via toolbar toggle).
- **Celebration Confetti**: Physics-based confetti burst (`canvas-confetti`) when completing all checklist items or dropping cards into `Done`.

---

## 🏛️ System Architecture

### Component Architecture Diagram

```mermaid
flowchart TD
    subgraph Browser ["Web Client (Next.js 14 Client Components)"]
        UI["React 18 UI (Tailwind + Lucide)"]
        State["Zustand / Optimistic React State"]
        Audio["Web Audio API & Confetti"]
        SocketClient["Socket.io Client 4.8"]
    end

    subgraph ServerRuntime ["Unified Node.js Engine (server.ts)"]
        NextServer["Next.js App Router (RSC & API Handlers)"]
        SocketServer["Socket.io WebSocket Server"]
        AuthMiddleware["JWT Cookie Validator (jose)"]
    end

    subgraph DataLayer ["Persistence & ORM"]
        Prisma["Prisma ORM Client 5.22"]
        SQLite[("SQLite dev.db (Default)")]
        Postgres[("PostgreSQL (Production)")]
    end

    UI -->|HTTP Fetch + JWT Cookie| NextServer
    UI -->|Events: join, viewing| SocketClient
    SocketClient <-->|Bi-Directional WebSocket| SocketServer
    NextServer -->|Trigger Room Broadcast| SocketServer
    NextServer --> AuthMiddleware
    AuthMiddleware --> Prisma
    SocketServer --> Prisma
    Prisma --> SQLite
    Prisma -.-> Postgres
```

---

### WebSocket Synchronization Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Session A (Admin)
    participant Server as Unified Socket.io Server
    actor Member as Session B (Member)

    Note over Admin, Member: Both connected to project:room_id
    Admin->>Server: HTTP PATCH /api/tasks/:id { status: "IN_PROGRESS" }
    Server->>Server: Update SQLite via Prisma ORM
    Server-->>Admin: HTTP 200 OK { task }
    Server-)Member: WS emit("task:updated", { task })
    Member->>Member: Optimistically move card in DOM (< 45ms)
    
    Member->>Server: HTTP POST /api/tasks/:id/comments { text }
    Server-)Admin: WS emit("comment:created", { comment })
    Admin->>Admin: Display Toast + Append to Activity Feed
```

---

### Database Schema (Entity Relationship)

```mermaid
erDiagram
    User ||--o{ Project : "owns"
    User ||--o{ ProjectMember : "belongs to"
    User ||--o{ Task : "assigned"
    User ||--o{ Comment : "authors"
    User ||--o{ Notification : "receives"

    Project ||--o{ ProjectMember : "includes"
    Project ||--o{ Task : "contains"
    Project ||--o{ Notification : "references"

    Task ||--o{ Comment : "has"

    User {
        string id PK
        string email UK
        string name
        string passwordHash
        datetime createdAt
    }

    Project {
        string id PK
        string name
        string description
        string ownerId FK
        datetime createdAt
        datetime updatedAt
    }

    Task {
        string id PK
        string title
        string description
        string status
        string priority
        float position
        datetime dueDate
        string tags
        string subtasks
        string projectId FK
        string assigneeId FK
    }

    Comment {
        string id PK
        string content
        string taskId FK
        string authorId FK
        datetime createdAt
    }
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: `v18.17.0` or later (tested on Node 20+)
- **npm** or **pnpm** / **yarn**

---

### Standard CLI Setup

#### 1. Clone the repository
```bash
git clone https://github.com/Kishaan1/project-management-tool.git
cd "project-management-tool/project tool/teamboard"
```

#### 2. Install dependencies
```bash
npm install
```

#### 3. Initialize SQLite Database & Push Schema
```bash
npx prisma db push
```

#### 4. Seed Representative QA Data *(Optional but Recommended)*
To populate the database with default test users, projects, and enriched tasks:
```bash
npx tsx scripts/seed-qa.ts
```

#### 5. Launch the Unified Development Server
```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Default Demo Credentials:**
> - **Admin**: `admin@example.com` / `password123`
> - **Member**: `member@example.com` / `password123`

---

### GitHub Desktop Workflow

If you prefer managing this repository visually through **GitHub Desktop**:

1. **Open GitHub Desktop** $\rightarrow$ Click **File** $\rightarrow$ **Add Local Repository...** (or press `Ctrl + O`).
2. **Browse** to this repository folder (`d:\project management tool`) and click **Select Folder**.
3. If prompted to create a repository, click **Create a repository** (choose `Node` for Git Ignore).
4. Click **Publish repository** to sync your local commits to your GitHub account.
5. All future changes made in the code will appear automatically in the **Changes** tab ready for 1-click commits and pushes!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Context | Action |
| :---: | :--- | :--- |
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Global | Open / Close Command Palette |
| <kbd>C</kbd> | Board View | Instant Quick Add new task to `To Do` column |
| <kbd>/</kbd> | Board View | Focus search filter bar |
| <kbd>Esc</kbd> | Modals & Drawers | Close active drawer, modal, or command palette |
| <kbd>Enter</kbd> | Card Focused | Open task detail slide-over drawer |

---

## 📡 API & WebSocket Specification

### REST API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/api/auth/register` | Register a new user account | No |
| `POST` | `/api/auth/login` | Authenticate and issue `httpOnly` JWT cookie | No |
| `POST` | `/api/auth/logout` | Clear authentication cookie | Yes |
| `GET` | `/api/auth/me` | Fetch active authenticated profile | Yes |
| `GET` | `/api/projects` | List all projects for authenticated user | Yes |
| `POST` | `/api/projects` | Create a new project workspace | Yes |
| `GET` | `/api/projects/:id` | Fetch project details, members, and tasks | Yes |
| `PATCH`| `/api/projects/:id` | Update project metadata | Yes |
| `DELETE`| `/api/projects/:id` | Delete project workspace | Yes (Owner) |
| `POST` | `/api/projects/:id/members` | Invite colleague via email | Yes |
| `POST` | `/api/projects/:id/tasks` | Create task card with metadata | Yes |
| `PATCH`| `/api/tasks/:id` | Update status, position, checklist, or tags | Yes |
| `DELETE`| `/api/tasks/:id` | Delete task card | Yes |
| `GET` | `/api/tasks/:id/comments` | Retrieve task comment timeline | Yes |
| `POST` | `/api/tasks/:id/comments` | Post comment to task activity thread | Yes |

---

### WebSocket Protocol Events

| Direction | Event Name | Payload | Description |
| :--- | :--- | :--- | :--- |
| **Client $\rightarrow$ Server** | `project:join` | `projectId: string` | Joins isolated project room |
| **Client $\rightarrow$ Server** | `task:viewing:start` | `{ projectId, taskId }` | Broadcasts active task drawer viewing |
| **Client $\rightarrow$ Server** | `task:viewing:end` | `{ projectId, taskId }` | Clears active task drawer viewing |
| **Server $\rightarrow$ Client** | `project:presence` | `{ users: UserLite[] }` | Broadcasts active online collaborator list |
| **Server $\rightarrow$ Client** | `task:created` | `{ task: TaskDTO, actorId }` | Appends task to board lanes without reload |
| **Server $\rightarrow$ Client** | `task:updated` | `{ task: TaskDTO }` | Updates task position, status, or checklist |
| **Server $\rightarrow$ Client** | `task:deleted` | `{ taskId: string }` | Removes task card from lanes |
| **Server $\rightarrow$ Client** | `comment:created` | `{ comment: CommentDTO }` | Streams new comment to drawer timeline |

---

## 🧪 Automated QA & Verification Benchmark

An exhaustive automated test suite was executed against the running application in headless Chromium with high-resolution visual proof capture:

| Metric | Measured Value | Standard | Status |
| :--- | :---: | :---: | :---: |
| **TypeScript Typecheck** | `0 errors` | Zero Warnings | **PASS** |
| **Console Runtime Exceptions** | `0 errors` | Zero Unhandled | **PASS** |
| **WebSocket Latency** | `< 45ms` | < 100ms | **PASS** |
| **Optimistic Checklist UI** | Synchronous | Instantaneous | **PASS** |
| **Test Scenarios Passed** | **7 / 7 (100%)** | 100% | **PASS** |

> 📑 **Read the complete verification report and inspect all generated visual proof deliverables:**  
> **[TeamBoard QA Verification & Audit Report](./teamboard_qa_audit_report.md)**

---

## 📁 Repository Structure

```
d:/project management tool/
├── README.md                      # Primary workspace documentation & architecture
├── docs/
│   └── screenshots/               # High-resolution photographic audit proofs
│       ├── 01_login_view.png
│       ├── 02_dashboard_view.png
│       ├── 03_kanban_board_view.png
│       ├── 04_task_card_anatomy.png
│       ├── 05_task_drawer_checklist.png
│       ├── 06_table_view.png
│       ├── 07_calendar_view.png
│       ├── 08_command_palette.png
│       ├── 09_search_filter_view.png
│       └── 10_multiuser_realtime_sync.png
├── teamboard_qa_audit_report.md   # Formal QA test audit & certification
└── project tool/
    └── teamboard/                 # Main full-stack Next.js application
        ├── server.ts              # Unified Node.js server (Next.js + Socket.io)
        ├── package.json           # Dependencies and scripts
        ├── prisma/
        │   ├── schema.prisma      # Prisma schema (SQLite / PostgreSQL)
        │   └── dev.db             # Zero-config SQLite local database
        ├── scripts/
        │   ├── seed-qa.ts         # QA baseline database populator
        │   └── run-qa-suite.ts    # End-to-end browser automation suite
        └── src/
            ├── app/               # Next.js 14 App Router routes & API
            ├── components/        # React components (Board, Views, Drawer, Palette)
            └── lib/               # Utilities, audio synthesizers, JWT, and Socket client
```

---

## 📄 License

Distributed under the **MIT License**. Feel free to use, modify, and distribute this software for personal or commercial projects.
