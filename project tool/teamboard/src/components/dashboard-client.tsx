"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderKanban, Plus, Users, ListChecks, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { CommandPalette } from "@/components/command-palette";
import { toast } from "sonner";
import type { ProjectSummaryDTO } from "@/lib/types";

export function DashboardClient({
  initialProjects,
  userName,
}: {
  initialProjects: ProjectSummaryDTO[];
  userName: string;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const totalTasks = projects.reduce((acc, p) => acc + p._count.tasks, 0);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not create project");
        return;
      }
      setProjects((p) => [data.project, ...p]);
      setName("");
      setDescription("");
      toast.success("Project created! Redirecting...");
      router.push(`/projects/${data.project.id}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      {/* Global Command Palette */}
      <CommandPalette />

      {/* Hero Welcome */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Workspace Overview
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Welcome back, {userName.split(" ")[0]}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Collaborate on Kanban boards, track deliverables, and manage your team in real time.
          </p>
        </div>

        {/* Quick Stats Banner */}
        <div className="flex items-center gap-4">
          <div className="rounded-xl border border-border/50 bg-card/60 p-3 text-center min-w-[90px] backdrop-blur-sm">
            <div className="text-xl font-bold text-foreground">{projects.length}</div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Projects</div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/60 p-3 text-center min-w-[90px] backdrop-blur-sm">
            <div className="text-xl font-bold text-foreground">{totalTasks}</div>
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">Active Tasks</div>
          </div>
        </div>
      </div>

      {/* New Project Creation Card */}
      <div className="rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur-xl shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Create New Project
        </h2>
        <form onSubmit={createProject} className="grid gap-4 md:grid-cols-[1.2fr_1.8fr_auto] items-end">
          <div>
            <Label htmlFor="project-name" className="text-xs mb-1.5 block">Project Name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Product Launch"
              required
              maxLength={100}
              className="h-10 text-xs rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="project-desc" className="text-xs mb-1.5 block">Short Description</Label>
            <Input
              id="project-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="What goals are you achieving with this board?"
              className="h-10 text-xs rounded-xl"
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()} className="h-10 px-5 rounded-xl text-xs font-semibold">
            <Plus className="h-4 w-4 mr-1.5" />
            {loading ? "Creating..." : "Create Project"}
          </Button>
        </form>
      </div>

      {/* Projects Grid */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Active Projects ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="h-7 w-7" />}
            title="No projects yet"
            description="Create your first collaborative Kanban board above to get started."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur-md shadow-xs hover:border-primary/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FolderKanban className="h-4 w-4" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </div>

                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {p.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 min-h-[2rem] leading-relaxed">
                    {p.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-6 pt-3.5 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-medium">
                      <ListChecks className="h-3.5 w-3.5 text-primary/70" /> {p._count.tasks} tasks
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="h-3.5 w-3.5 text-primary/70" /> {p._count.members}
                    </span>
                  </div>
                  <span className="text-[11px] truncate max-w-[100px]">By {p.owner.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
