import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Seeding QA Baseline Data ---");
  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Ensure Admin User
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { name: "Alex Rivera (Admin)" },
    create: {
      email: "admin@example.com",
      name: "Alex Rivera (Admin)",
      passwordHash,
    },
  });
  console.log(`Admin User: ${admin.id} (${admin.email})`);

  // 2. Ensure Team Member User
  const member = await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: { name: "Sarah Chen (Engineer)" },
    create: {
      email: "member@example.com",
      name: "Sarah Chen (Engineer)",
      passwordHash,
    },
  });
  console.log(`Member User: ${member.id} (${member.email})`);

  // 3. Ensure Project
  let project = await prisma.project.findFirst({
    where: { name: "TeamBoard Platform v2.0" },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "TeamBoard Platform v2.0",
        description: "Next-generation collaborative workspace with real-time sync, dark mode, and multiple views.",
        ownerId: admin.id,
      },
    });
  }
  console.log(`Project: ${project.id} (${project.name})`);

  // Ensure memberships
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: admin.id,
      },
    },
    update: { role: "ADMIN" },
    create: {
      projectId: project.id,
      userId: admin.id,
      role: "ADMIN",
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: member.id,
      },
    },
    update: { role: "MEMBER" },
    create: {
      projectId: project.id,
      userId: member.id,
      role: "MEMBER",
    },
  });

  // 4. Ensure enriched tasks across all stages
  const existingTasks = await prisma.task.findMany({ where: { projectId: project.id } });
  if (existingTasks.length < 4) {
    // Delete and recreate rich tasks
    await prisma.task.deleteMany({ where: { projectId: project.id } });

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const task1 = await prisma.task.create({
      data: {
        title: "Design Modern Glassmorphism UI Tokens",
        description: "### Design Specifications\n- Establish dark zinc palette (`#09090b` to `#27272a`)\n- Glassmorphic card surfaces with subtle border glows\n- Implement smooth micro-transitions and interactive hover states",
        status: "TODO",
        priority: "HIGH",
        position: 1000,
        dueDate: tomorrow,
        tags: JSON.stringify(["design", "ui", "glassmorphism"]),
        subtasks: JSON.stringify([
          { id: "st-1", title: "Select Google Outfit/Inter typography", completed: true },
          { id: "st-2", title: "Generate vibrant accent gradients", completed: true },
          { id: "st-3", title: "Test contrast ratios across dark/light themes", completed: false },
        ]),
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: member.id,
      },
    });

    const task2 = await prisma.task.create({
      data: {
        title: "Implement Real-time WebSocket Multi-Presence",
        description: "### Real-time Architecture\nConnect Next.js 14 server with custom Socket.io rooms. Broadcast card movements, typing indicators, and user avatars.",
        status: "IN_PROGRESS",
        priority: "URGENT",
        position: 1000,
        dueDate: nextWeek,
        tags: JSON.stringify(["websocket", "realtime", "backend"]),
        subtasks: JSON.stringify([
          { id: "st-4", title: "Configure room join/leave handlers", completed: true },
          { id: "st-5", title: "Broadcast active collaborator avatars", completed: true },
          { id: "st-6", title: "Optimistic drag-and-drop state sync", completed: false },
        ]),
        projectId: project.id,
        creatorId: member.id,
        assigneeId: admin.id,
      },
    });

    const task3 = await prisma.task.create({
      data: {
        title: "Refactor Slide-over Task Drawer & Interactive Checklists",
        description: "### Drawer Requirements\n- Smooth sliding drawer transition\n- Interactive subtask checkboxes with real-time progress bar\n- Live Markdown preview and comment activity feed",
        status: "IN_REVIEW",
        priority: "MEDIUM",
        position: 1000,
        dueDate: tomorrow,
        tags: JSON.stringify(["frontend", "drawer", "interactive"]),
        subtasks: JSON.stringify([
          { id: "st-7", title: "Subtask completion percentage calculation", completed: true },
          { id: "st-8", title: "Real-time comment timeline", completed: true },
        ]),
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: member.id,
      },
    });

    const task4 = await prisma.task.create({
      data: {
        title: "Setup Production Next.js 14 App Architecture",
        description: "Prisma ORM, SQLite engine, unified server runtime, and TypeScript strict mode verified with zero errors.",
        status: "DONE",
        priority: "LOW",
        position: 1000,
        dueDate: now,
        tags: JSON.stringify(["infrastructure", "core"]),
        subtasks: JSON.stringify([
          { id: "st-9", title: "Setup App Router routes", completed: true },
          { id: "st-10", title: "Configure Tailwind CSS tokens", completed: true },
        ]),
        projectId: project.id,
        creatorId: admin.id,
        assigneeId: admin.id,
      },
    });

    // Add sample comments to task1
    await prisma.comment.createMany({
      data: [
        {
          content: "The initial glassmorphism preview looks incredible! Let's ensure contrast on low-light monitors.",
          taskId: task1.id,
          authorId: member.id,
        },
        {
          content: "Agreed. Added the WCAG AA compliance verification item to the checklist.",
          taskId: task1.id,
          authorId: admin.id,
        },
      ],
    });

    console.log("Created 4 enriched tasks and initial comments.");
  } else {
    console.log(`Found ${existingTasks.length} existing tasks in project.`);
  }

  console.log("--- QA Baseline Ready ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
