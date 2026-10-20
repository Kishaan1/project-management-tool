import { prisma } from "./prisma";
import { emitToUser } from "./realtime";

type NotificationType = "TASK_ASSIGNED" | "COMMENT_ADDED" | "PROJECT_INVITE";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  message: string;
  projectId?: string;
  taskId?: string;
}

/** Persist a notification and push it to the user in real time. */
export async function notify(input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      message: input.message,
      projectId: input.projectId,
      taskId: input.taskId,
    },
  });
  emitToUser(input.userId, "notification:new", notification);
  return notification;
}
