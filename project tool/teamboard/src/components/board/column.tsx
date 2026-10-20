"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskCard } from "./task-card";
import { STATUSES, type TaskDTO, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ColumnProps {
  status: TaskStatus;
  label: string;
  tasks: TaskDTO[];
  dragId: string | null;
  dropIndex: number | null;
  activeViewers?: Record<string, string>; // taskId -> userName
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onOverIndex: (status: TaskStatus, index: number) => void;
  onDrop: (status: TaskStatus) => void;
  onOpen: (taskId: string) => void;
  onQuickAdd: (status: TaskStatus, title: string) => Promise<void>;
}

function GhostDropPlaceholder() {
  return (
    <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 p-3.5 h-20 animate-pulse flex items-center justify-center text-primary/60 text-xs font-medium my-1">
      Drop task here
    </div>
  );
}

export function Column({
  status,
  label,
  tasks,
  dragId,
  dropIndex,
  activeViewers = {},
  onDragStart,
  onDragEnd,
  onOverIndex,
  onDrop,
  onOpen,
  onQuickAdd,
}: ColumnProps) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const isActive = dragId !== null && dropIndex !== null;

  const statusMeta = STATUSES.find((s) => s.id === status);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onQuickAdd(status, title.trim());
      setTitle("");
      setAdding(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label={label}
      className={cn(
        "flex w-80 shrink-0 flex-col rounded-2xl border border-border/50 bg-card/40 backdrop-blur-md transition-all duration-200 shadow-sm",
        isActive && "border-primary/60 shadow-lg ring-1 ring-primary/20 bg-card/60"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        onOverIndex(status, tasks.length);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(status);
      }}
    >
      {/* Column Header */}
      <header className="flex items-center justify-between px-4 py-3.5 border-b border-border/30">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              status === "TODO" && "bg-zinc-400",
              status === "IN_PROGRESS" && "bg-sky-500",
              status === "IN_REVIEW" && "bg-amber-500",
              status === "DONE" && "bg-emerald-500"
            )}
          />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {label}
          </h3>
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted/80 px-1.5 text-[11px] font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setAdding(true)}
          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </header>

      {/* Task Cards Container */}
      <div className="flex min-h-[120px] flex-1 flex-col gap-2.5 p-3 overflow-y-auto max-h-[calc(100vh-250px)]">
        {tasks.length === 0 && !adding ? (
          <div
            onClick={() => setAdding(true)}
            className="flex flex-col items-center justify-center py-8 px-4 text-center rounded-xl border border-dashed border-border/60 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <Sparkles className="h-5 w-5 text-muted-foreground/60 mb-1.5" />
            <p className="text-xs font-medium text-muted-foreground">No tasks in this stage</p>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5">Click to add one</p>
          </div>
        ) : (
          tasks.map((task, i) => (
            <div key={task.id} className="flex flex-col gap-2">
              {isActive && dropIndex === i && <GhostDropPlaceholder />}
              <TaskCard
                task={task}
                index={i}
                isDragging={dragId === task.id}
                activeViewerName={activeViewers[task.id]}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onOverIndex={(idx) => onOverIndex(status, idx)}
                onOpen={onOpen}
              />
            </div>
          ))
        )}
        {isActive && dropIndex === tasks.length && <GhostDropPlaceholder />}
      </div>

      {/* Quick Add Form or Trigger */}
      <div className="border-t border-border/30 p-2.5">
        {adding ? (
          <form onSubmit={submit} className="space-y-2 rounded-xl bg-card/90 p-2 border border-border/60 shadow-sm">
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              maxLength={200}
              className="h-8 text-xs bg-transparent"
              onKeyDown={(e) => {
                if (e.key === "Escape") setAdding(false);
              }}
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setAdding(false)}
                className="h-7 px-2.5 text-xs text-muted-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving || !title.trim()} className="h-7 px-3 text-xs">
                {saving ? "Adding..." : "Add task"}
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 rounded-xl"
            onClick={() => setAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Add a task
          </Button>
        )}
      </div>
    </section>
  );
}
