"use client";

import { CalendarDays, MessageSquare, CheckSquare, Eye } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "./priority-badge";
import { TagBadge } from "./tag-badge";
import { getDueDateStatus } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type { TaskDTO } from "@/lib/types";

import { parseSubtasks, parseTags } from "@/lib/task-serializer";

interface TaskCardProps {
  task: TaskDTO;
  index: number;
  isDragging: boolean;
  activeViewerName?: string | null;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onOverIndex: (index: number) => void;
  onOpen: (taskId: string) => void;
}

export function TaskCard({
  task,
  index,
  isDragging,
  activeViewerName,
  onDragStart,
  onDragEnd,
  onOverIndex,
  onOpen,
}: TaskCardProps) {
  const dueDateStatus = getDueDateStatus(task.dueDate);
  const subtasks = parseSubtasks(task.subtasks);
  const tags = parseTags(task.tags);
  const totalSubtasks = subtasks.length;
  const completedSubtasks = subtasks.filter((s) => s.completed).length;
  const subtaskPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      onClick={() => onOpen(task.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(task.id);
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", task.id);
        onDragStart(task.id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        const rect = e.currentTarget.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
        onOverIndex(index + (after ? 1 : 0));
      }}
      className={cn(
        "group relative select-none rounded-xl border border-border/60 bg-card/90 p-3.5 text-left backdrop-blur-sm transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-border/90 active:scale-[0.99] active:cursor-grabbing cursor-grab",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isDragging && "opacity-30 scale-95 border-dashed border-primary"
      )}
    >
      {/* Active Viewer Indicator */}
      {activeViewerName && (
        <div className="mb-2 flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600 dark:text-sky-400 border border-sky-500/20 animate-pulse">
          <Eye className="h-3 w-3" />
          <span>{activeViewerName} is viewing</span>
        </div>
      )}

      {/* Top row: Priority & Assignee */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        {task.assignee && (
          <div className="flex items-center gap-1" title={task.assignee.name}>
            <Avatar name={task.assignee.name} className="h-5 w-5 text-[9px]" />
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold leading-relaxed text-foreground group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {/* Tags Chips */}
      {tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      )}

      {/* Subtasks Progress Bar */}
      {totalSubtasks > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1 font-medium">
            <span className="flex items-center gap-1">
              <CheckSquare className="h-3 w-3" />
              <span>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </span>
            <span>{subtaskPercent}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                subtaskPercent === 100 ? "bg-emerald-500" : "bg-primary/70"
              )}
              style={{ width: `${subtaskPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom metadata row */}
      {(dueDateStatus || task._count.comments > 0) && (
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
          {dueDateStatus ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] border",
                dueDateStatus.badgeClass
              )}
            >
              <CalendarDays className="h-3 w-3" />
              {dueDateStatus.label}
            </span>
          ) : (
            <span />
          )}

          {task._count.comments > 0 && (
            <span className="flex items-center gap-1 hover:text-foreground">
              <MessageSquare className="h-3 w-3" />
              <span>{task._count.comments}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
