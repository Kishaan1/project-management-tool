"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Plus,
  LayoutGrid,
  ListFilter,
  Calendar,
  Sun,
  Moon,
  Home,
  UserPlus,
  ArrowRight,
  Command,
  Volume2,
} from "lucide-react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio";
import type { TaskDTO, BoardViewMode } from "@/lib/types";

interface CommandPaletteProps {
  tasks?: TaskDTO[];
  onSelectTask?: (task: TaskDTO) => void;
  onOpenNewTask?: () => void;
  onOpenInvite?: () => void;
  onSetViewMode?: (mode: BoardViewMode) => void;
}

export function CommandPalette({
  tasks = [],
  onSelectTask,
  onOpenNewTask,
  onOpenInvite,
  onSetViewMode,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Actions list
  const actions = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle?: string;
      category: "Actions" | "Tasks" | "Navigation" | "Views";
      icon: any;
      run: () => void;
    }[] = [];

    if (onOpenNewTask) {
      list.push({
        id: "create-task",
        title: "Create new task",
        category: "Actions",
        icon: Plus,
        run: () => {
          onOpenNewTask();
          setOpen(false);
        },
      });
    }

    if (onOpenInvite) {
      list.push({
        id: "invite-member",
        title: "Invite team member to project",
        category: "Actions",
        icon: UserPlus,
        run: () => {
          onOpenInvite();
          setOpen(false);
        },
      });
    }

    if (onSetViewMode) {
      list.push(
        {
          id: "view-kanban",
          title: "Switch to Kanban Board View",
          category: "Views",
          icon: LayoutGrid,
          run: () => {
            onSetViewMode("kanban");
            setOpen(false);
          },
        },
        {
          id: "view-list",
          title: "Switch to Table / List View",
          category: "Views",
          icon: ListFilter,
          run: () => {
            onSetViewMode("list");
            setOpen(false);
          },
        },
        {
          id: "view-calendar",
          title: "Switch to Calendar View",
          category: "Views",
          icon: Calendar,
          run: () => {
            onSetViewMode("calendar");
            setOpen(false);
          },
        }
      );
    }

    list.push({
      id: "toggle-sound",
      title: "Toggle UI Sound Effects",
      subtitle: "Enable or mute task completion and notification sounds",
      category: "Actions",
      icon: Volume2,
      run: () => {
        setSoundEnabled(!isSoundEnabled());
        setOpen(false);
      },
    });

    list.push({
      id: "toggle-theme",
      title: `Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`,
      category: "Actions",
      icon: resolvedTheme === "dark" ? Sun : Moon,
      run: () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
        setOpen(false);
      },
    });

    list.push({
      id: "nav-dashboard",
      title: "Go to Dashboard",
      category: "Navigation",
      icon: Home,
      run: () => {
        router.push("/dashboard");
        setOpen(false);
      },
    });

    // Add matching tasks
    if (tasks.length > 0 && query.trim()) {
      const q = query.toLowerCase();
      const matched = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
      );
      for (const t of matched.slice(0, 8)) {
        list.push({
          id: `task-${t.id}`,
          title: t.title,
          subtitle: `${t.status} • Priority: ${t.priority}`,
          category: "Tasks",
          icon: ArrowRight,
          run: () => {
            onSelectTask?.(t);
            setOpen(false);
          },
        });
      }
    }

    return list;
  }, [tasks, query, onOpenNewTask, onOpenInvite, onSetViewMode, onSelectTask, resolvedTheme, setTheme, router]);

  // Filter actions by query
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.subtitle?.toLowerCase().includes(q)
    );
  }, [actions, query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? Math.max(0, filteredActions.length - 1) : prev - 1
      );
    } else if (e.key === "Enter" && filteredActions[selectedIndex]) {
      e.preventDefault();
      filteredActions[selectedIndex].run();
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 py-3.5 border-b border-border/50">
          <Search className="h-4 w-4 text-muted-foreground mr-3 shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search tasks, run actions, or switch views..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded"
            >
              Esc
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredActions.map((action, idx) => {
              const Icon = action.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={action.id}
                  onClick={action.run}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 ${
                        isSelected
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="truncate">{action.title}</div>
                      {action.subtitle && (
                        <div
                          className={`text-[10px] truncate ${
                            isSelected
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground"
                          }`}
                        >
                          {action.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted/70 text-muted-foreground"
                    }`}
                  >
                    {action.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
