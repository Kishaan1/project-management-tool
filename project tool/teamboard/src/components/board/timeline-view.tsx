"use client";

import { useMemo } from "react";
import { isPast, isToday, isThisWeek, parseISO } from "date-fns";
import { CalendarDays, AlertCircle, Clock, CalendarCheck } from "lucide-react";
import { PriorityBadge } from "./priority-badge";
import { Avatar } from "@/components/ui/avatar";
import { TagBadge } from "./tag-badge";
import { STATUSES, type TaskDTO } from "@/lib/types";
import { parseTags } from "@/lib/task-serializer";
import { cn } from "@/lib/utils";

interface TimelineViewProps {
  tasks: TaskDTO[];
  onOpen: (taskId: string) => void;
}

interface MilestoneGroup {
  id: string;
  title: string;
  icon: any;
  headerClass: string;
  tasks: TaskDTO[];
}

export function TimelineView({ tasks, onOpen }: TimelineViewProps) {
  const groups: MilestoneGroup[] = useMemo(() => {
    const overdue: TaskDTO[] = [];
    const today: TaskDTO[] = [];
    const thisWeek: TaskDTO[] = [];
    const later: TaskDTO[] = [];
    const unscheduled: TaskDTO[] = [];

    for (const t of tasks) {
      if (!t.dueDate) {
        unscheduled.push(t);
        continue;
      }
      try {
        const d = parseISO(t.dueDate);
        if (isToday(d)) {
          today.push(t);
        } else if (isPast(d) && t.status !== "DONE") {
          overdue.push(t);
        } else if (isThisWeek(d)) {
          thisWeek.push(t);
        } else {
          later.push(t);
        }
      } catch {
        unscheduled.push(t);
      }
    }

    return [
      {
        id: "overdue",
        title: "Overdue Milestones",
        icon: AlertCircle,
        headerClass: "text-rose-500 bg-rose-500/10 border-rose-500/20",
        tasks: overdue,
      },
      {
        id: "today",
        title: "Due Today",
        icon: Clock,
        headerClass: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        tasks: today,
      },
      {
        id: "thisWeek",
        title: "This Week",
        icon: CalendarCheck,
        headerClass: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        tasks: thisWeek,
      },
      {
        id: "later",
        title: "Upcoming Milestones",
        icon: CalendarDays,
        headerClass: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
        tasks: later,
      },
      {
        id: "unscheduled",
        title: "Unscheduled Tasks",
        icon: Clock,
        headerClass: "text-muted-foreground bg-muted/40 border-border/30",
        tasks: unscheduled,
      },
    ].filter((g) => g.tasks.length > 0);
  }, [tasks]);

  if (groups.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-xs text-muted-foreground">
        No tasks match your current filters.
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-6 space-y-6">
      {groups.map((group) => {
        const Icon = group.icon;
        return (
          <div key={group.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                  group.headerClass
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{group.title}</span>
                <span className="ml-1 opacity-75">({group.tasks.length})</span>
              </span>
              <div className="h-px flex-1 bg-border/40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.tasks.map((task) => {
                const statusMeta = STATUSES.find((s) => s.id === task.status);
                return (
                  <div
                    key={task.id}
                    onClick={() => onOpen(task.id)}
                    className="p-3.5 rounded-xl border border-border/50 bg-card/70 backdrop-blur-sm hover:border-border/90 hover:shadow-md cursor-pointer transition-all duration-150 space-y-2.5 group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {statusMeta?.label}
                      </span>
                      <PriorityBadge priority={task.priority} />
                    </div>

                    <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {task.title}
                    </h4>

                    {parseTags(task.tags).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {parseTags(task.tags).map((tag) => (
                          <TagBadge key={tag} tag={tag} />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/30 text-[11px] text-muted-foreground">
                      <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}</span>
                      {task.assignee && <Avatar name={task.assignee.name} className="h-5 w-5 text-[9px]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
