import { NextResponse } from "next/server";
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
