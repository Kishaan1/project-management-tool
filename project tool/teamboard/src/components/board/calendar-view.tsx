"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTags } from "@/lib/task-serializer";
import { STATUSES, type TaskDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  tasks: TaskDTO[];
  onOpen: (taskId: string) => void;
}

export function CalendarView({ tasks, onOpen }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const days = useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  // Group tasks by Date string (YYYY-MM-DD)
  const { dateMap, unscheduled } = useMemo(() => {
    const map = new Map<string, TaskDTO[]>();
    const un: TaskDTO[] = [];

    for (const t of tasks) {
      if (!t.dueDate) {
        un.push(t);
        continue;
      }
      try {
        const d = new Date(t.dueDate);
        if (Number.isNaN(d.getTime())) {
          un.push(t);
          continue;
        }
        const key = format(d, "yyyy-MM-dd");
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      } catch {
        un.push(t);
      }
    }
    return { dateMap: map, unscheduled: un };
  }, [tasks]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-6 min-h-[calc(100vh-200px)]">
      {/* Main Calendar Grid */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md shadow-sm overflow-hidden">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="h-7 text-xs px-2.5 rounded-lg"
            >
              Today
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate((d) => subMonths(d, 1))}
              className="h-8 w-8 rounded-lg"
              aria-label="Previous Month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentDate((d) => addMonths(d, 1))}
              className="h-8 w-8 rounded-lg"
              aria-label="Next Month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-border/40 text-center text-[11px] font-semibold text-muted-foreground uppercase py-2 bg-muted/10">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 flex-1 divide-x divide-y divide-border/30 auto-rows-fr">
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayTasks = dateMap.get(dateKey) || [];
            const isCurMonth = isSameMonth(day, monthStart);
            const isTodayDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[110px] p-2 flex flex-col transition-colors",
                  !isCurMonth && "bg-muted/10 text-muted-foreground/40",
                  isTodayDay && "bg-primary/5"
                )}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isTodayDay && "bg-primary text-primary-foreground shadow-xs font-bold",
                      !isTodayDay && isCurMonth && "text-foreground",
                      !isCurMonth && "text-muted-foreground/40"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {dayTasks.length}
                    </span>
                  )}
                </div>

                {/* Day Tasks Chips */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[100px]">
                  {dayTasks.map((t) => {
                    const isOverdue = isPast(day) && !isTodayDay && t.status !== "DONE";
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpen(t.id)}
                        className={cn(
                          "w-full text-left p-1.5 rounded-md text-[11px] font-medium transition-all truncate border flex items-center gap-1.5 group",
                          isOverdue
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:border-rose-500/40"
                            : t.status === "DONE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 line-through opacity-70"
                            : "bg-card/90 text-foreground border-border/50 hover:border-primary/40 hover:shadow-xs"
                        )}
                        title={t.title}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full shrink-0",
                            t.priority === "URGENT" && "bg-rose-500",
                            t.priority === "HIGH" && "bg-amber-500",
                            t.priority === "MEDIUM" && "bg-blue-500",
                            t.priority === "LOW" && "bg-zinc-400"
                          )}
                        />
                        <span className="truncate group-hover:text-primary">{t.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unscheduled Tasks Sidebar */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-4 space-y-3 shadow-sm h-fit">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Unscheduled ({unscheduled.length})</span>
        </div>

        {unscheduled.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center italic">
            All tasks have scheduled dates!
          </p>
        ) : (
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
            {unscheduled.map((t) => (
              <div
                key={t.id}
                onClick={() => onOpen(t.id)}
                className="p-2.5 rounded-xl border border-border/40 bg-card/70 hover:border-primary/40 hover:shadow-xs cursor-pointer text-xs transition-all space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">
                    {STATUSES.find((s) => s.id === t.status)?.label}
                  </span>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      t.priority === "URGENT" && "bg-rose-500",
                      t.priority === "HIGH" && "bg-amber-500",
                      t.priority === "MEDIUM" && "bg-blue-500",
                      t.priority === "LOW" && "bg-zinc-400"
                    )}
                  />
                </div>
                <h4 className="font-medium text-foreground group-hover:text-primary truncate">
                  {t.title}
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
