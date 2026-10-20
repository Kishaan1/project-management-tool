import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { badRequest, forbidden, readJson, unauthorized } from "@/lib/api";
import { taskInclude } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";
import { notify } from "@/lib/notify";
import { serializeTask } from "@/lib/task-serializer";

const schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
  })).optional(),
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

  const created = await prisma.task.create({
    data: {
      title: d.title,
      description: d.description ?? null,
      status: d.status,
      priority: d.priority,
      position: (last?.position ?? 0) + 1000,
      dueDate,
      tags: d.tags ? JSON.stringify(d.tags) : null,
      subtasks: d.subtasks ? JSON.stringify(d.subtasks) : null,
      projectId: params.id,
      assigneeId: d.assigneeId ?? null,
      creatorId: user.id,
    },
    include: taskInclude,
  });

  const task = serializeTask(created);

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
