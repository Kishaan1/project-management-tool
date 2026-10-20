"use client";

import { useEffect, useState } from "react";
import {
  Search,
  X,
  LayoutGrid,
  ListFilter,
  Calendar,
  SlidersHorizontal,
  ArrowUpDown,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { isSoundEnabled, setSoundEnabled } from "@/lib/audio";
import {
  STATUSES,
  PRIORITIES,
  PRESET_TAGS,
  type MemberDTO,
  type BoardViewMode,
  type TaskFilterState,
} from "@/lib/types";

interface BoardToolbarProps {
  filters: TaskFilterState;
  onFilterChange: (filters: TaskFilterState) => void;
  viewMode: BoardViewMode;
  onViewModeChange: (mode: BoardViewMode) => void;
  members: MemberDTO[];
  currentUserId?: string;
  totalTasks: number;
  filteredCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export function BoardToolbar({
  filters,
  onFilterChange,
  viewMode,
  onViewModeChange,
  members,
  currentUserId,
  totalTasks,
  filteredCount,
  searchInputRef,
}: BoardToolbarProps) {
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
    function onToggle() {
      setSoundOn(isSoundEnabled());
    }
    window.addEventListener("teamboard:sound_toggle", onToggle);
    return () => window.removeEventListener("teamboard:sound_toggle", onToggle);
  }, []);

  const activeFiltersCount =
    (filters.search ? 1 : 0) +
    (filters.status !== "ALL" ? 1 : 0) +
    (filters.priority !== "ALL" ? 1 : 0) +
    (filters.assigneeId !== "ALL" ? 1 : 0) +
    (filters.tag !== "ALL" ? 1 : 0) +
    (filters.dueFilter !== "ALL" ? 1 : 0);

  function resetFilters() {
    onFilterChange({
      search: "",
      status: "ALL",
      priority: "ALL",
      assigneeId: "ALL",
      tag: "ALL",
      dueFilter: "ALL",
      sortBy: "position",
    });
  }

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }

  return (
    <div className="flex flex-col gap-3 px-6 py-3 border-b border-border/50 bg-background/70 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/40">
          <button
            onClick={() => onViewModeChange("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "kanban"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Kanban</span>
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "list"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <ListFilter className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
          <button
            onClick={() => onViewModeChange("calendar")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "calendar"
                ? "bg-card text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Right: Search, Sound Toggle & Counts */}
        <div className="flex items-center gap-3">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks... (Press / to focus)"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              className="w-full h-8 pl-8 pr-7 text-xs rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {filters.search && (
              <button
                onClick={() => onFilterChange({ ...filters, search: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sound Effects Toggle */}
          <button
            onClick={toggleSound}
            className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-colors ${
              soundOn
                ? "border-border/60 bg-card/60 text-foreground hover:bg-muted"
                : "border-border/40 bg-muted/40 text-muted-foreground hover:text-foreground"
            }`}
            title={soundOn ? "UI Sounds: Enabled (Click to mute)" : "UI Sounds: Muted (Click to enable)"}
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          <div className="text-[11px] font-medium text-muted-foreground hidden sm:block">
            {filteredCount} of {totalTasks} tasks
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium mr-1">
          <SlidersHorizontal className="h-3 w-3" />
          <span>Filters:</span>
        </div>

        {/* Status Filter */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value as any })}
          className="h-7 px-2 text-xs rounded-lg border border-border/60 bg-card/80 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">Status: All</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={filters.priority}
          onChange={(e) => onFilterChange({ ...filters, priority: e.target.value as any })}
          className="h-7 px-2 text-xs rounded-lg border border-border/60 bg-card/80 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">Priority: All</option>
          {PRIORITIES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Assignee Filter with "Assigned to me" */}
        <select
          value={filters.assigneeId}
          onChange={(e) => onFilterChange({ ...filters, assigneeId: e.target.value })}
          className="h-7 px-2 text-xs rounded-lg border border-border/60 bg-card/80 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">Assignee: All</option>
          {currentUserId && <option value="ME">⚡ Assigned to me</option>}
          <option value="UNASSIGNED">Unassigned</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </select>

        {/* Due Date Filter */}
        <select
          value={filters.dueFilter}
          onChange={(e) => onFilterChange({ ...filters, dueFilter: e.target.value as any })}
          className="h-7 px-2 text-xs rounded-lg border border-border/60 bg-card/80 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">Due Date: All</option>
          <option value="TODAY">Due Today</option>
          <option value="OVERDUE">Overdue</option>
          <option value="THIS_WEEK">This Week</option>
        </select>

        {/* Tag Filter */}
        <select
          value={filters.tag}
          onChange={(e) => onFilterChange({ ...filters, tag: e.target.value })}
          className="h-7 px-2 text-xs rounded-lg border border-border/60 bg-card/80 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">Tag: All</option>
          {PRESET_TAGS.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>

        {/* Sort By */}
        <div className="flex items-center gap-1 ml-auto">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
          <select
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
            className="h-7 px-2 text-xs rounded-lg border border-border/60 bg-card/80 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="position">Sort: Board Order</option>
            <option value="priority">Sort: Priority</option>
            <option value="dueDate">Sort: Due Date</option>
            <option value="title">Sort: Title (A-Z)</option>
            <option value="newest">Sort: Newest</option>
          </select>
        </div>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear ({activeFiltersCount})
          </Button>
        )}
      </div>
    </div>
  );
}
