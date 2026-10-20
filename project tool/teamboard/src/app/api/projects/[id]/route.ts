import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { forbidden, notFound, unauthorized } from "@/lib/api";
import { taskInclude, userSelect } from "@/lib/queries";
import { emitToProject } from "@/lib/realtime";

import { serializeTasks } from "@/lib/task-serializer";

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

  return NextResponse.json({
    project: {
      ...project,
      tasks: serializeTasks(project.tasks),
    },
  });
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
