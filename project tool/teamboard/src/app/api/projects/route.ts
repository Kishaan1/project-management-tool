import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { readJson, unauthorized } from "@/lib/api";
import { userSelect } from "@/lib/queries";

const createSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(100),
  description: z.string().trim().max(500).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: userSelect },
      _count: { select: { tasks: true, members: true } },
    },
  });
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const parsed = await readJson(req, createSchema);
  if (!parsed.ok) return parsed.res;

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
    },
    include: {
      owner: { select: userSelect },
      _count: { select: { tasks: true, members: true } },
    },
  });
  return NextResponse.json({ project }, { status: 201 });
}
