import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getMembership } from "@/lib/access";
import { taskInclude, userSelect } from "@/lib/queries";
import { Header } from "@/components/layout/header";
import { BoardClient } from "@/components/board/board-client";
import type { MemberDTO, TaskDTO } from "@/lib/types";

import { serializeTasks } from "@/lib/task-serializer";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!(await getMembership(params.id, user.id))) notFound();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      members: { include: { user: { select: userSelect } }, orderBy: { createdAt: "asc" } },
      tasks: { include: taskInclude, orderBy: { position: "asc" } },
    },
  });
  if (!project) notFound();

  const rawTasks = JSON.parse(JSON.stringify(project.tasks));
  const tasks = serializeTasks(rawTasks);
  const members = JSON.parse(JSON.stringify(project.members)) as MemberDTO[];

  return (
    <>
      <Header user={user} />
      <BoardClient
        projectId={project.id}
        projectName={project.name}
        projectDescription={project.description}
        ownerId={project.ownerId}
        initialTasks={tasks}
        initialMembers={members}
        currentUser={user}
      />
    </>
  );
}
