export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export const STATUSES: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "from-zinc-500/20 to-zinc-500/5 text-zinc-600 dark:text-zinc-400" },
  { id: "IN_PROGRESS", label: "In Progress", color: "from-sky-500/20 to-sky-500/5 text-sky-600 dark:text-sky-400" },
  { id: "IN_REVIEW", label: "In Review", color: "from-amber-500/20 to-amber-500/5 text-amber-600 dark:text-amber-400" },
  { id: "DONE", label: "Done", color: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 dark:text-emerald-400" },
];

export const PRIORITIES: { id: Priority; label: string; color: string; badgeClass: string }[] = [
  { id: "LOW", label: "Low", color: "text-zinc-500", badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20" },
  { id: "MEDIUM", label: "Medium", color: "text-blue-500", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { id: "HIGH", label: "High", color: "text-amber-500", badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { id: "URGENT", label: "Urgent", color: "text-rose-500", badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
];

export const PRESET_TAGS = [
  { name: "Frontend", color: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" },
  { name: "Backend", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { name: "Design", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  { name: "Bug", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
  { name: "Feature", color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20" },
  { name: "DevOps", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  { name: "Marketing", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
];

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface UserLite {
  id: string;
  name: string;
  email: string;
}

export interface TaskDTO {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  position: number;
  dueDate: string | null;
  tags?: string[] | null;
  subtasks?: SubtaskItem[] | null;
  projectId: string;
  assigneeId: string | null;
  assignee: UserLite | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number };
}

export interface CommentDTO {
  id: string;
  content: string;
  taskId: string;
  projectId?: string;
  authorId: string;
  author: UserLite;
  createdAt: string;
}

export interface MemberDTO {
  id: string;
  role: "OWNER" | "MEMBER";
  user: UserLite;
}

export interface ProjectSummaryDTO {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  owner: UserLite;
  createdAt: string;
  _count: { tasks: number; members: number };
}

export interface NotificationDTO {
  id: string;
  type: "TASK_ASSIGNED" | "COMMENT_ADDED" | "PROJECT_INVITE";
  message: string;
  read: boolean;
  projectId: string | null;
  taskId: string | null;
  createdAt: string;
}

export type BoardViewMode = "kanban" | "list" | "calendar";

export interface TaskFilterState {
  search: string;
  status: TaskStatus | "ALL";
  priority: Priority | "ALL";
  assigneeId: string | "ALL"; // specific ID, "UNASSIGNED", or "ME"
  tag: string | "ALL";
  dueFilter: "ALL" | "TODAY" | "OVERDUE" | "THIS_WEEK";
  sortBy: "position" | "priority" | "dueDate" | "title" | "newest";
}
