"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Send,
  Trash2,
  X,
  Calendar,
  CheckSquare,
  Tag,
  Clock,
  Sparkles,
  FileText,
  Eye,
  Plus,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "./priority-badge";
import { TagBadge } from "./tag-badge";
import { getSocket } from "@/lib/socket-client";
import { formatRelativeTime, formatDateTime, getDueDateStatus } from "@/lib/date-utils";
import { playCompletionSound, playSubtaskSound } from "@/lib/audio";
import confetti from "canvas-confetti";
import {
  PRIORITIES,
  STATUSES,
  PRESET_TAGS,
  type CommentDTO,
  type MemberDTO,
  type Priority,
  type TaskDTO,
  type TaskStatus,
  type UserLite,
  type SubtaskItem,
} from "@/lib/types";
import { parseSubtasks, parseTags } from "@/lib/task-serializer";
import { cn } from "@/lib/utils";

interface TaskModalProps {
  task: TaskDTO;
  members: MemberDTO[];
  currentUser: UserLite;
  onClose: () => void;
  onPatch: (taskId: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function TaskModal({
  task,
  members,
  currentUser,
  onClose,
  onPatch,
  onDelete,
}: TaskModalProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [descMode, setDescMode] = useState<"edit" | "preview">("edit");
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  // Sync state on task prop update
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? "");
  }, [task.id, task.title, task.description]);

  // Real-time active viewing presence
  useEffect(() => {
    const socket = getSocket();
    socket.emit("task:viewing:start", { projectId: task.projectId, taskId: task.id });
    return () => {
      socket.emit("task:viewing:end", { projectId: task.projectId, taskId: task.id });
    };
  }, [task.projectId, task.id]);

  const addComment = useCallback((comment: CommentDTO) => {
    setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev : [...prev, comment]));
  }, []);

  // Fetch comments and listen to socket
  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    fetch(`/api/tasks/${task.id}/comments`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((data) => {
        if (!cancelled) setComments(data.comments || []);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    const socket = getSocket();
    const onCreated = ({ comment }: { comment: CommentDTO }) => {
      if (comment.taskId === task.id) addComment(comment);
    };
    socket.on("comment:created", onCreated);
    return () => {
      cancelled = true;
      socket.off("comment:created", onCreated);
    };
  }, [task.id, addComment]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [comments.length]);

  // Save Title
  async function saveTitle() {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      return;
    }
    if (trimmed !== task.title) {
      await onPatch(task.id, { title: trimmed });
    }
  }

  // Save Description
  async function saveDescription() {
    if (description !== (task.description ?? "")) {
      await onPatch(task.id, { description: description.trim() || null });
    }
  }

  const currentSubtasks = parseSubtasks(task.subtasks);
  const currentTags = parseTags(task.tags);

  // Subtask management
  async function toggleSubtask(subtaskId: string) {
    let nowCompleted = false;
    const subtasks = currentSubtasks.map((s) => {
      if (s.id === subtaskId) {
        nowCompleted = !s.completed;
        return { ...s, completed: !s.completed };
      }
      return s;
    });

    if (nowCompleted) {
      playSubtaskSound();
    }

    await onPatch(task.id, { subtasks });

    // Celebration check
    const allDone = subtasks.length > 0 && subtasks.every((s) => s.completed);
    if (allDone) {
      playCompletionSound();
      confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
    }
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    const item: SubtaskItem = {
      id: "st_" + Math.random().toString(36).substring(2, 9),
      title: newSubtaskTitle.trim(),
      completed: false,
    };
    const subtasks = [...currentSubtasks, item];
    setNewSubtaskTitle("");
    await onPatch(task.id, { subtasks });
  }

  async function removeSubtask(subtaskId: string) {
    const subtasks = currentSubtasks.filter((s) => s.id !== subtaskId);
    await onPatch(task.id, { subtasks });
  }

  // Tags management
  async function toggleTag(tagName: string) {
    const exists = currentTags.includes(tagName);
    const updated = exists ? currentTags.filter((t) => t !== tagName) : [...currentTags, tagName];
    await onPatch(task.id, { tags: updated });
  }

  // Post Comment
  async function postComment(e?: React.FormEvent) {
    e?.preventDefault();
    const content = newComment.trim();
    if (!content) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        addComment(data.comment);
        setNewComment("");
      }
    } finally {
      setPosting(false);
    }
  }

  const dueDateStatus = getDueDateStatus(task.dueDate);
  const totalSubtasks = currentSubtasks.length;
  const completedSubtasks = currentSubtasks.filter((s) => s.completed).length;
  const subtaskPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Frosted Glass Backdrop */}
      <div
        className="fixed inset-0 bg-background/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-2xl bg-card border-l border-border/60 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-right duration-250">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/20">
            <div className="flex items-center gap-2">
              <select
                value={task.status}
                onChange={(e) => onPatch(task.id, { status: e.target.value as TaskStatus })}
                className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-border/60 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {STATUSES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>

              <select
                value={task.priority}
                onChange={(e) => onPatch(task.id, { priority: e.target.value as Priority })}
                className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-border/60 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} Priority
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this task?")) {
                    onDelete(task.id);
                  }
                }}
                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                title="Delete task"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Drawer Body - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                }}
                placeholder="Task title..."
                className="w-full text-lg font-bold bg-transparent text-foreground placeholder:text-muted-foreground/60 border-b border-transparent focus:border-border focus:outline-none pb-1 transition-colors"
              />
            </div>

            {/* Quick Properties Grid */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-border/40 bg-muted/20 text-xs">
              {/* Assignee */}
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                  Assignee
                </span>
                <select
                  value={task.assigneeId ?? ""}
                  onChange={(e) => onPatch(task.id, { assigneeId: e.target.value || null })}
                  className="w-full h-8 px-2 rounded-lg border border-border/60 bg-card text-foreground focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>
                      {m.user.name} ({m.user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                  Due Date
                </span>
                <input
                  type="date"
                  value={task.dueDate ? task.dueDate.split("T")[0] : ""}
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    onPatch(task.id, { dueDate: val });
                  }}
                  className="w-full h-8 px-2 rounded-lg border border-border/60 bg-card text-foreground focus:outline-none"
                />
              </div>
            </div>

            {/* Labels & Tags Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" /> Tags & Labels
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingTag(!isAddingTag)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {isAddingTag ? "Done" : "+ Manage Tags"}
                </button>
              </div>

              {/* Active Tags */}
              <div className="flex flex-wrap gap-1.5">
                {currentTags.length > 0 ? (
                  currentTags.map((tag) => (
                    <TagBadge
                      key={tag}
                      tag={tag}
                      onRemove={() => toggleTag(tag)}
                      className="text-xs py-1 px-2"
                    />
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground/60 italic">No tags applied</span>
                )}
              </div>

              {/* Preset Tags Picker */}
              {isAddingTag && (
                <div className="mt-3 p-3 rounded-xl border border-border/40 bg-muted/30 animate-in fade-in duration-150">
                  <p className="text-[11px] text-muted-foreground mb-2">Click to toggle tags:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TAGS.map((preset) => {
                      const isActive = currentTags.includes(preset.name);
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => toggleTag(preset.name)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
                            preset.color,
                            isActive
                              ? "ring-2 ring-primary ring-offset-1 font-semibold"
                              : "opacity-60 hover:opacity-100"
                          )}
                        >
                          {isActive ? "✓ " : "+ "}
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Description Section with Markdown Edit / Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Description
                </span>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted text-[11px]">
                  <button
                    type="button"
                    onClick={() => setDescMode("edit")}
                    className={cn(
                      "px-2 py-0.5 rounded-md transition-colors",
                      descMode === "edit" ? "bg-card text-foreground font-medium shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescMode("preview")}
                    className={cn(
                      "px-2 py-0.5 rounded-md transition-colors flex items-center gap-1",
                      descMode === "preview" ? "bg-card text-foreground font-medium shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              </div>

              {descMode === "edit" ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={saveDescription}
                  rows={4}
                  placeholder="Add a detailed description... (Markdown supported: **bold**, lists, `code`)"
                  className="w-full p-3 text-xs rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y leading-relaxed"
                />
              ) : (
                <div className="min-h-[100px] p-3 text-xs rounded-xl border border-border/40 bg-muted/20 leading-relaxed whitespace-pre-wrap">
                  {description ? description : <span className="text-muted-foreground/60 italic">No description provided.</span>}
                </div>
              )}
            </div>

            {/* Subtasks / Checklist Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" /> Checklist ({completedSubtasks}/{totalSubtasks})
                </span>
                {totalSubtasks > 0 && (
                  <span className="text-xs font-medium text-muted-foreground">{subtaskPercent}%</span>
                )}
              </div>

              {/* Progress Bar */}
              {totalSubtasks > 0 && (
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      subtaskPercent === 100 ? "bg-emerald-500" : "bg-primary/70"
                    )}
                    style={{ width: `${subtaskPercent}%` }}
                  />
                </div>
              )}

              {/* Items List */}
              <div className="space-y-1.5">
                {currentSubtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border/40 bg-card/50 hover:bg-card text-xs group"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSubtask(subtask.id)}
                      className="flex items-center gap-2.5 flex-1 text-left"
                    >
                      {subtask.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground/60 shrink-0" />
                      )}
                      <span
                        className={cn(
                          "transition-colors",
                          subtask.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {subtask.title}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSubtask(subtask.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-rose-500 transition-opacity p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Subtask Input */}
              <form onSubmit={addSubtask} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a checklist item..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  className="flex-1 h-8 px-3 text-xs rounded-xl border border-border/60 bg-card/60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button type="submit" size="sm" variant="secondary" className="h-8 px-3 text-xs" disabled={!newSubtaskTitle.trim()}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </form>
            </div>

            {/* Activity Feed & Live Discussion */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Activity & Comments
              </span>

              {/* Task Creation Milestone */}
              <div className="flex items-start gap-2.5 text-xs text-muted-foreground pl-1">
                <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span>Task created {formatRelativeTime(task.createdAt)}</span>
                </div>
              </div>

              {/* Comments Thread */}
              <div className="space-y-3 pt-2">
                {loadingComments ? (
                  <div className="text-xs text-muted-foreground italic">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-xs text-muted-foreground/60 italic">No comments yet. Start the conversation!</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-2.5 text-xs">
                      <Avatar name={c.author.name} className="h-6 w-6 text-[10px] shrink-0 mt-0.5" />
                      <div className="flex-1 rounded-xl border border-border/50 bg-card/80 p-3 shadow-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-semibold text-foreground">{c.author.name}</span>
                          <span className="text-[10px] text-muted-foreground">{formatRelativeTime(c.createdAt)}</span>
                        </div>
                        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={listEndRef} />
              </div>

              {/* Post Comment Input */}
              <form onSubmit={postComment} className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 h-9 px-3 text-xs rounded-xl border border-border/60 bg-card/60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button type="submit" size="sm" disabled={posting || !newComment.trim()} className="h-9 px-4 text-xs">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  {posting ? "Posting..." : "Send"}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
