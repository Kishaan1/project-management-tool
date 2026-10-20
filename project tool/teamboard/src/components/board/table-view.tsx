"use client";

import { CalendarDays, MessageSquare, CheckSquare } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "./priority-badge";
import { TagBadge } from "./tag-badge";
import { getDueDateStatus } from "@/lib/date-utils";
import { STATUSES, type TaskDTO, type TaskStatus } from "@/lib/types";
import { parseSubtasks, parseTags } from "@/lib/task-serializer";
import { cn } from "@/lib/utils";

interface TableViewProps {
  tasks: TaskDTO[];
  onOpen: (taskId: string) => void;
  onPatch: (id: string, patch: Partial<TaskDTO>) => Promise<void>;
}

export function TableView({ tasks, onOpen, onPatch }: TableViewProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-xs text-muted-foreground">
        No tasks match your current filters.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto p-6">
      <div className="min-w-[800px] overflow-hidden rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border/40 bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              <th className="py-3 px-4">Task</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Assignee</th>
              <th className="py-3 px-3">Due Date</th>
              <th className="py-3 px-3">Tags</th>
              <th className="py-3 px-3">Subtasks</th>
              <th className="py-3 px-3 text-right">Comments</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {tasks.map((task) => {
              const dueDateStatus = getDueDateStatus(task.dueDate);
              const subtasks = parseSubtasks(task.subtasks);
              const tags = parseTags(task.tags);
              const totalSubtasks = subtasks.length;
              const completedSubtasks = subtasks.filter((s) => s.completed).length;

              return (
                <tr
                  key={task.id}
                  onClick={() => onOpen(task.id)}
                  className="hover:bg-muted/40 cursor-pointer transition-colors group"
                >
                  {/* Title */}
                  <td className="py-3 px-4 font-medium text-foreground max-w-xs">
                    <span className="line-clamp-1 group-hover:text-primary transition-colors">
                      {task.title}
                    </span>
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onChange={(e) => onPatch(task.id, { status: e.target.value as TaskStatus })}
                      className="h-6 px-1.5 text-[11px] font-medium rounded-md border border-border/60 bg-card text-foreground focus:outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Priority */}
                  <td className="py-3 px-3">
                    <PriorityBadge priority={task.priority} />
                  </td>

                  {/* Assignee */}
                  <td className="py-3 px-3">
                    {task.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <Avatar name={task.assignee.name} className="h-5 w-5 text-[9px]" />
                        <span className="text-muted-foreground truncate max-w-[100px]">
                          {task.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 italic text-[11px]">Unassigned</span>
                    )}
                  </td>

                  {/* Due Date */}
                  <td className="py-3 px-3">
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
                      <span className="text-muted-foreground/60 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Tags */}
                  <td className="py-3 px-3">
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {tags.slice(0, 2).map((tag) => (
                          <TagBadge key={tag} tag={tag} />
                        ))}
                        {tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{tags.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Subtasks */}
                  <td className="py-3 px-3">
                    {totalSubtasks > 0 ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                        <CheckSquare className="h-3 w-3" />
                        <span>
                          {completedSubtasks}/{totalSubtasks}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/60 text-[11px]">—</span>
                    )}
                  </td>

                  {/* Comments */}
                  <td className="py-3 px-3 text-right">
                    {task._count.comments > 0 && (
                      <span className="inline-flex items-center gap-1 text-muted-foreground text-[11px]">
                        <MessageSquare className="h-3 w-3" />
                        {task._count.comments}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
