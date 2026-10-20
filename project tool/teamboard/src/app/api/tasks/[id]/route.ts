import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { badRequest, forbidden, notFound, readJson, unauthorized } from "@/lib/api";
import { taskInclude } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";
import { notify } from "@/lib/notify";
import { serializeTask } from "@/lib/task-serializer";

const patchSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  position: z.number().finite().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  subtasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    completed: z.boolean(),
  })).nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const task = await prisma.task.findUnique({ where: { id: params.id }, include: taskInclude });
  if (!task) return notFound("Task");
  if (!(await getMembership(task.projectId, user.id))) return forbidden();
  return NextResponse.json({ task: serializeTask(task) });
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

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: {
      title: d.title,
      description: d.description,
      status: d.status,
      priority: d.priority,
      position: d.position,
      assigneeId: d.assigneeId,
      dueDate,
      ...(d.tags !== undefined ? { tags: d.tags ? JSON.stringify(d.tags) : null } : {}),
      ...(d.subtasks !== undefined ? { subtasks: d.subtasks ? JSON.stringify(d.subtasks) : null } : {}),
    },
    include: taskInclude,
  });

  const task = serializeTask(updated);

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
