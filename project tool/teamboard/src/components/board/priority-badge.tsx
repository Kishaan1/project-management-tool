import { cn } from "@/lib/utils";
import type { Priority } from "@/lib/types";

const styles: Record<Priority, { bg: string; dot: string; label: string }> = {
  LOW: {
    bg: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
    dot: "bg-zinc-400",
    label: "Low",
  },
  MEDIUM: {
    bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    dot: "bg-blue-500",
    label: "Medium",
  },
  HIGH: {
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dot: "bg-amber-500",
    label: "High",
  },
  URGENT: {
    bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dot: "bg-rose-500 animate-pulse",
    label: "Urgent",
  },
};

export function PriorityBadge({
  priority,
  showDot = true,
  className,
}: {
  priority: Priority;
  showDot?: boolean;
  className?: string;
}) {
  const item = styles[priority] || styles.MEDIUM;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium border tracking-wide",
        item.bg,
        className
      )}
    >
      {showDot && <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", item.dot)} />}
      <span>{item.label}</span>
    </span>
  );
}
