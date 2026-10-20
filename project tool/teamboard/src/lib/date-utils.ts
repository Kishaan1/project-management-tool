import { format, formatDistanceToNow, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";

export interface DueDateStatus {
  status: "overdue" | "today" | "tomorrow" | "soon" | "future";
  label: string;
  badgeClass: string;
}

export function getDueDateStatus(dueDateStr: string | null | undefined): DueDateStatus | null {
  if (!dueDateStr) return null;
  const date = new Date(dueDateStr);
  if (Number.isNaN(date.getTime())) return null;

  if (isToday(date)) {
    return {
      status: "today",
      label: "Due Today",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    };
  }

  if (isTomorrow(date)) {
    return {
      status: "tomorrow",
      label: "Due Tomorrow",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    };
  }

  if (isPast(date)) {
    const days = Math.max(1, Math.abs(differenceInDays(new Date(), date)));
    return {
      status: "overdue",
      label: `Overdue ${days}d`,
      badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 font-medium",
    };
  }

  const daysUntil = differenceInDays(date, new Date());
  if (daysUntil <= 3) {
    return {
      status: "soon",
      label: `In ${daysUntil}d`,
      badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
    };
  }

  return {
    status: "future",
    label: format(date, "MMM d"),
    badgeClass: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  };
}

export function formatRelativeTime(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return "";
  }
}

export function formatDateTime(dateStr: string | Date): string {
  try {
    const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return format(d, "MMM d, yyyy h:mm a");
  } catch {
    return "";
  }
}
