# Project Management Tool Workspace

Welcome to the **Project Management Tool Workspace**. This repository contains the source code, setup automation, and documentation for **TeamBoard**, an open-source collaborative project management tool featuring real-time Kanban boards, task assignment, instant commenting, and notification dispatching.

---

## Workspace Structure

```
d:/project management tool/
├── README.md                      # Root workspace overview & documentation
├── setup_project.py               # Standalone Python generator & packager for TeamBoard
└── project tool/
    └── teamboard/                 # Main TeamBoard full-stack application
        ├── README.md              # Exhaustive TeamBoard architecture & API documentation
        ├── server.ts              # Unified Node.js server (Next.js 14 + Socket.io 4.8)
        ├── package.json           # Dependencies and scripts
        ├── .env.example           # Environment template
        ├── prisma/
        │   └── schema.prisma      # Prisma schema (SQLite / PostgreSQL)
        └── src/                   # Next.js App Router source code
```

---

## Applications in this Repository

### 🎯 TeamBoard (`project tool/teamboard`)
A real-time Kanban application built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, **Prisma ORM**, and **Socket.io**.

- **Live Drag-and-Drop Kanban**: 4 workflow stages (`To Do`, `In Progress`, `In Review`, `Done`) with fractional float position indexing.
- **Bi-Directional Real-Time Synchronization**: Instant task updates, column moves, comments, and notifications across clients using WebSockets.
- **JWT Cookie Authentication**: Secure session handling using `jose` and `bcryptjs`.
- **Flexible Database Engine**: Configured by default with **SQLite** for instant zero-dependency local development, with full support for **PostgreSQL** and Docker.

📖 **For detailed architecture, schema diagram, REST API reference, and WebSocket event specs, see [TeamBoard Detailed README](file:///d:/project%20management%20tool/project%20tool/teamboard/README.md).**

---

## Quick Start Guide

### 1. Navigate to the project directory
```bash
cd "project tool/teamboard"
```

### 2. Configure Environment
A `.env` file is located at `project tool/teamboard/.env`. If setting up afresh, copy from `.env.example`:
```bash
cp .env.example .env
```
Default SQLite configuration:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-32-character-secret-key-goes-here"
PORT=3000
```

### 3. Install Dependencies & Push Database
```bash
npm install
npx prisma db push
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> **Note**: Always run the application with `npm run dev` (or `npm start` for production). Plain `next dev` does not launch the unified Socket.io WebSocket server.

---

## Repository Scripts & Utilities

- **`setup_project.py`**: A standalone script that generates the entire source tree of TeamBoard from embedded templates and creates a portable `project.zip` archive.
  ```bash
  python setup_project.py
  ```

---

## Technical Stack Summary

| Technology | Purpose |
|---|---|
| **Next.js 14 (App Router)** | Full-stack React framework (Server & Client components) |
| **Socket.io 4.8** | Real-time WebSocket event dispatching |
| **Prisma 5.22** | Type-safe ORM & database schema migrations |
| **SQLite / PostgreSQL** | Storage layer (zero-config SQLite for dev, PostgreSQL for production) |
| **Tailwind CSS** | Design system tokens and responsive styling |
| **Lucide React** | Modern icons |
| **jose & bcryptjs** | Authentication, JWT signing, password hashing |
| **Zod** | Runtime schema validation |

---

## License
MIT License.
