import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { readJson, unauthorized } from "@/lib/api";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { userId: user.id, read: false } }),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
});

/** Mark specific notifications (or all, when no ids given) as read. */
export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const parsed = await readJson(req, patchSchema);
  if (!parsed.ok) return parsed.res;

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      read: false,
      ...(parsed.data.ids ? { id: { in: parsed.data.ids } } : {}),
    },
    data: { read: true },
  });
  return NextResponse.json({ ok: true });
}
