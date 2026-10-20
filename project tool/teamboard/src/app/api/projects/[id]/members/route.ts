import { NextResponse } from "next/server";
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
