"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isToday, isPast, isThisWeek } from "date-fns";
import { Trash2, UserPlus, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Column } from "./column";
import { TaskModal } from "./task-modal";
import { BoardToolbar } from "./board-toolbar";
import { TableView } from "./table-view";
import { CalendarView } from "./calendar-view";
import { CommandPalette } from "@/components/command-palette";
import { getSocket } from "@/lib/socket-client";
import { playCompletionSound, playNotificationSound } from "@/lib/audio";
import { serializeTask, serializeTasks } from "@/lib/task-serializer";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  STATUSES,
  type CommentDTO,
  type MemberDTO,
  type TaskDTO,
  type TaskStatus,
  type UserLite,
  type BoardViewMode,
  type TaskFilterState,
} from "@/lib/types";

interface BoardClientProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  ownerId: string;
  initialTasks: TaskDTO[];
  initialMembers: MemberDTO[];
  currentUser: UserLite;
}

export function BoardClient({
  projectId,
  projectName,
  projectDescription,
  ownerId,
  initialTasks,
  initialMembers,
  currentUser,
}: BoardClientProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [tasks, setTasks] = useState<TaskDTO[]>(() => serializeTasks(initialTasks));
  const [members, setMembers] = useState<MemberDTO[]>(initialMembers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ status: TaskStatus; index: number } | null>(null);
  const [live, setLive] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [onlineUsers, setOnlineUsers] = useState<UserLite[]>([]);
  const [activeViewers, setActiveViewers] = useState<Record<string, string>>({}); // taskId -> userName

  // Persistent view preference
  const [viewMode, setViewMode] = useState<BoardViewMode>("kanban");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("teamboard_view_preference") as BoardViewMode;
      if (saved && ["kanban", "list", "calendar"].includes(saved)) {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  function handleViewModeChange(mode: BoardViewMode) {
    setViewMode(mode);
    try {
      localStorage.setItem("teamboard_view_preference", mode);
    } catch {}
  }

  const [filters, setFilters] = useState<TaskFilterState>({
    search: "",
    status: "ALL",
    priority: "ALL",
    assigneeId: "ALL",
    tag: "ALL",
    dueFilter: "ALL",
    sortBy: "position",
  });

  const isOwner = currentUser.id === ownerId;

  const upsertTask = useCallback((rawTask: TaskDTO) => {
    const task = serializeTask(rawTask);
    setTasks((prev) =>
      prev.some((t) => t.id === task.id) ? prev.map((t) => (t.id === task.id ? task : t)) : [...prev, task]
    );
  }, []);

  const reload = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (!res.ok) return;
    const data = await res.json();
    setTasks(serializeTasks(data.project.tasks));
    setMembers(data.project.members);
  }, [projectId]);

  // Real-time socket events for board & presence
  useEffect(() => {
    const socket = getSocket();
    const join = () => {
      socket.emit("project:join", projectId);
      setLive(true);
      reload();
    };
    const onDisconnect = () => setLive(false);

    const onPresence = ({ users }: { users: UserLite[] }) => {
      setOnlineUsers(users || []);
    };

    const onTaskViewing = ({ taskId, user }: { taskId: string; user: { id: string; name: string } }) => {
      if (user.id !== currentUser.id) {
        setActiveViewers((prev) => ({ ...prev, [taskId]: user.name }));
      }
    };

    const onTaskViewingEnded = ({ taskId }: { taskId: string }) => {
      setActiveViewers((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
    };

    const onCreated = ({ task, actorId }: { task: TaskDTO; actorId?: string }) => {
      upsertTask(task);
      if (actorId && actorId !== currentUser.id) {
        toast.info(`New task added: "${task.title}"`);
      }
    };

    const onUpdated = ({ task }: { task: TaskDTO }) => {
      upsertTask(task);
    };

    const onDeleted = ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedId((cur) => (cur === taskId ? null : cur));
    };

    const onMember = ({ member }: { member: MemberDTO }) => {
      setMembers((prev) => (prev.some((m) => m.id === member.id) ? prev : [...prev, member]));
      toast.success(`${member.user.name} joined the project`);
    };

    const onComment = ({ comment }: { comment: CommentDTO }) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === comment.taskId ? { ...t, _count: { comments: t._count.comments + 1 } } : t
        )
      );
      if (comment.authorId !== currentUser.id) {
        playNotificationSound();
      }
    };

    const onProjectDeleted = () => {
      toast.error("This project was deleted by the owner");
      router.push("/dashboard");
      router.refresh();
    };

    if (socket.connected) join();
    socket.on("connect", join);
    socket.on("disconnect", onDisconnect);
    socket.on("project:presence", onPresence);
    socket.on("task:viewing", onTaskViewing);
    socket.on("task:viewing:ended", onTaskViewingEnded);
    socket.on("task:created", onCreated);
    socket.on("task:updated", onUpdated);
    socket.on("task:deleted", onDeleted);
    socket.on("member:added", onMember);
    socket.on("comment:created", onComment);
    socket.on("project:deleted", onProjectDeleted);

    return () => {
      socket.emit("project:leave", projectId);
      socket.off("connect", join);
      socket.off("disconnect", onDisconnect);
      socket.off("project:presence", onPresence);
      socket.off("task:viewing", onTaskViewing);
      socket.off("task:viewing:ended", onTaskViewingEnded);
      socket.off("task:created", onCreated);
      socket.off("task:updated", onUpdated);
      socket.off("task:deleted", onDeleted);
      socket.off("member:added", onMember);
      socket.off("comment:created", onComment);
      socket.off("project:deleted", onProjectDeleted);
    };
  }, [projectId, reload, router, upsertTask, currentUser.id]);

  // Patch Task with Celebrations and Optimistic Updates
  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    const prevTask = tasks.find((t) => t.id === taskId);
    const movingToDone = patch.status === "DONE" && prevTask?.status !== "DONE";

    if (movingToDone) {
      playCompletionSound();
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      toast.success("Task completed! 🎉");
    }

    // Optimistic local update
    setTasks((all) =>
      all.map((t) => (t.id === taskId ? serializeTask({ ...t, ...patch }) : t))
    );

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Could not update task");
        await reload();
        return;
      }
      const data = await res.json();
      upsertTask(data.task);
    } catch {
      toast.error("Network error updating task");
      await reload();
    }
  }

  // Delete Task
  async function deleteTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete task");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedId(null);
    toast.success("Task deleted");
  }

  // Quick Add
  const quickAdd = useCallback(
    async (status: TaskStatus, title: string) => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not create task");
        throw new Error("create failed");
      }
      upsertTask(data.task);
      toast.success("Task created");
    },
    [projectId, upsertTask]
  );

  // Global Keyboard Shortcuts (C for new task, / for search, Esc to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (e.key === "Escape") {
        if (selectedId) setSelectedId(null);
        return;
      }

      if (isEditing) return;

      if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        quickAdd("TODO", "New Task");
      } else if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, quickAdd]);

  // Drop Handler with spring physics and fractional position
  function handleDrop(status: TaskStatus) {
    const id = dragId;
    const target = drop;
    setDragId(null);
    setDrop(null);
    if (!id || !target || target.status !== status) return;
    const dragged = tasks.find((t) => t.id === id);
    if (!dragged) return;

    const original = columns[status];
    const originalIndex = original.findIndex((t) => t.id === id);
    const list = original.filter((t) => t.id !== id);
    let index = target.index;
    if (originalIndex !== -1 && originalIndex < index) index -= 1;
    index = Math.max(0, Math.min(index, list.length));

    const prev = list[index - 1];
    const next = list[index];
    let position: number;
    if (!prev && !next) position = 1000;
    else if (!prev) position = next.position / 2;
    else if (!next) position = prev.position + 1000;
    else position = (prev.position + next.position) / 2;

    if (dragged.status === status && dragged.position === position) return;

    // Check completion trigger
    if (status === "DONE" && dragged.status !== "DONE") {
      playCompletionSound();
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      toast.success("Task completed! 🎉");
    }

    setTasks((all) => all.map((t) => (t.id === id ? { ...t, status, position } : t)));
    patchTask(id, { status, position });
  }

  // Member Invite
  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Could not add member");
      return;
    }
    setMembers((prev) => (prev.some((m) => m.id === data.member.id) ? prev : [...prev, data.member]));
    setInviteEmail("");
    toast.success(`${data.member.user.name} added to the project`);
  }

  // Delete Project
  async function deleteProject() {
    if (!window.confirm(`Delete "${projectName}" and all of its tasks? This action cannot be undone.`)) return;
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Project deleted");
      router.push("/dashboard");
      router.refresh();
    } else {
      toast.error("Could not delete project");
    }
  }

  // Multi-criteria Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    // Status
    if (filters.status !== "ALL") {
      result = result.filter((t) => t.status === filters.status);
    }

    // Priority
    if (filters.priority !== "ALL") {
      result = result.filter((t) => t.priority === filters.priority);
    }

    // Assignee (supports "ME", "UNASSIGNED", or member ID)
    if (filters.assigneeId === "ME") {
      result = result.filter((t) => t.assigneeId === currentUser.id);
    } else if (filters.assigneeId === "UNASSIGNED") {
      result = result.filter((t) => !t.assigneeId);
    } else if (filters.assigneeId !== "ALL") {
      result = result.filter((t) => t.assigneeId === filters.assigneeId);
    }

    // Due Date Filter ("TODAY", "OVERDUE", "THIS_WEEK")
    if (filters.dueFilter !== "ALL") {
      result = result.filter((t) => {
        if (!t.dueDate) return false;
        try {
          const d = new Date(t.dueDate);
          if (Number.isNaN(d.getTime())) return false;
          if (filters.dueFilter === "TODAY") return isToday(d);
          if (filters.dueFilter === "OVERDUE") return isPast(d) && !isToday(d) && t.status !== "DONE";
          if (filters.dueFilter === "THIS_WEEK") return isThisWeek(d);
        } catch {
          return false;
        }
        return true;
      });
    }

    // Tag
    if (filters.tag !== "ALL") {
      result = result.filter((t) => t.tags?.includes(filters.tag));
    }

    // Sort By
    result.sort((a, b) => {
      if (filters.sortBy === "position") return a.position - b.position;
      if (filters.sortBy === "priority") {
        const weights = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return weights[b.priority] - weights[a.priority];
      }
      if (filters.sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (filters.sortBy === "title") return a.title.localeCompare(b.title);
      if (filters.sortBy === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });

    return result;
  }, [tasks, filters, currentUser.id]);

  // Group into Kanban Columns
  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, TaskDTO[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };
    for (const t of filteredTasks) {
      if (grouped[t.status]) grouped[t.status].push(t);
    }
    return grouped;
  }, [filteredTasks]);

  const selectedTask = selectedId ? tasks.find((t) => t.id === selectedId) ?? null : null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-56px)]">
      {/* Global Command Palette */}
      <CommandPalette
        tasks={tasks}
        onSelectTask={(t) => setSelectedId(t.id)}
        onOpenNewTask={() => quickAdd("TODO", "New Task")}
        onSetViewMode={handleViewModeChange}
      />

      {/* Board Top Header */}
      <div className="px-6 py-4 border-b border-border/40 bg-card/40 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight text-foreground truncate">
                {projectName}
              </h1>

              {/* Live WebSocket Status Pill */}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                  live
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border/50"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                  )}
                />
                {live ? "Live Sync" : "Connecting..."}
              </span>
            </div>

            {projectDescription && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-1 max-w-xl">
                {projectDescription}
              </p>
            )}
          </div>

          {/* Right Controls: Presence + Quick Add + Invite + Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Collaborator Presence Avatars */}
            {onlineUsers.length > 0 && (
              <div className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full border border-border/50 bg-card/60 backdrop-blur-sm">
                <div className="flex -space-x-2 overflow-hidden">
                  {onlineUsers.map((u) => (
                    <div key={u.id} className="relative" title={`${u.name} is online`}>
                      <Avatar
                        name={u.name}
                        className="h-6 w-6 text-[9px] border-2 border-background ring-1 ring-emerald-500"
                      />
                      <span className="absolute bottom-0 right-0 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
                    </div>
                  ))}
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ml-1">
                  {onlineUsers.length} online
                </span>
              </div>
            )}

            {/* Quick Task Button */}
            <Button
              size="sm"
              onClick={() => quickAdd("TODO", "New Task")}
              className="h-8 px-3 text-xs rounded-xl shadow-xs"
              title="Add task (Press C)"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> New Task
              <kbd className="hidden sm:inline-block ml-1.5 rounded bg-primary-foreground/20 px-1 py-0.2 text-[9px]">
                C
              </kbd>
            </Button>

            {/* Invite Form (Owner Only) */}
            {isOwner && (
              <form onSubmit={invite} className="flex items-center gap-1.5">
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="Invite colleague email..."
                  className="h-8 w-44 text-xs rounded-xl"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-8 text-xs px-2.5 rounded-xl">
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Invite
                </Button>
              </form>
            )}

            {/* Delete Project (Owner Only) */}
            {isOwner && (
              <Button
                size="sm"
                variant="ghost"
                onClick={deleteProject}
                className="h-8 px-2.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Filter, Sort & View Switcher Toolbar */}
      <BoardToolbar
        filters={filters}
        onFilterChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        members={members}
        currentUserId={currentUser.id}
        totalTasks={tasks.length}
        filteredCount={filteredTasks.length}
        searchInputRef={searchInputRef}
      />

      {/* Main View Area */}
      <div className="flex-1 overflow-x-auto">
        {viewMode === "kanban" && (
          <div className="flex h-full gap-5 p-6 min-w-max">
            {STATUSES.map((s) => (
              <Column
                key={s.id}
                status={s.id}
                label={s.label}
                tasks={columns[s.id]}
                dragId={dragId}
                dropIndex={drop && drop.status === s.id ? drop.index : null}
                activeViewers={activeViewers}
                onDragStart={setDragId}
                onDragEnd={() => {
                  setDragId(null);
                  setDrop(null);
                }}
                onOverIndex={(status, index) => {
                  setDrop((cur) =>
                    cur && cur.status === status && cur.index === index ? cur : { status, index }
                  );
                }}
                onDrop={handleDrop}
                onOpen={setSelectedId}
                onQuickAdd={quickAdd}
              />
            ))}
          </div>
        )}

        {viewMode === "list" && (
          <TableView tasks={filteredTasks} onOpen={setSelectedId} onPatch={patchTask} />
        )}

        {viewMode === "calendar" && (
          <CalendarView tasks={filteredTasks} onOpen={setSelectedId} />
        )}
      </div>

      {/* Enhanced Task Detail Slide-over Drawer */}
      {selectedTask && (
        <TaskModal
          key={selectedTask.id}
          task={selectedTask}
          members={members}
          currentUser={currentUser}
          onClose={() => setSelectedId(null)}
          onPatch={patchTask}
          onDelete={deleteTask}
        />
      )}
    </div>
  );
}
