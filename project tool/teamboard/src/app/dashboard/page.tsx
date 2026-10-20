import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { userSelect } from "@/lib/queries";
import { Header } from "@/components/layout/header";
import { DashboardClient } from "@/components/dashboard-client";
import type { ProjectSummaryDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: user.id } } },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: userSelect },
      _count: { select: { tasks: true, members: true } },
    },
  });

  const initialProjects = JSON.parse(JSON.stringify(projects)) as ProjectSummaryDTO[];

  return (
    <>
      <Header user={user} />
      <DashboardClient initialProjects={initialProjects} userName={user.name} />
    </>
  );
}
