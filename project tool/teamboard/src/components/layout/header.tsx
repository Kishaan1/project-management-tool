"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KanbanSquare, LogOut, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "./theme-toggle";
import { NotificationBell } from "./notification-bell";
import { disconnectSocket } from "@/lib/socket-client";
import type { UserLite } from "@/lib/types";

export function Header({ user }: { user: Pick<UserLite, "name" | "email"> }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    disconnectSocket();
    router.push("/login");
    router.refresh();
  }

  function triggerCommandPalette() {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-6">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-sm tracking-tight group">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
              <KanbanSquare className="h-4 w-4" />
            </div>
            <span className="text-foreground">TeamBoard</span>
          </Link>

          {/* Quick Search Trigger */}
          <button
            onClick={triggerCommandPalette}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search or command...</span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground ml-3 shadow-2xs">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ThemeToggle />

          <div className="h-4 w-px bg-border/60 mx-1" />

          <div className="flex items-center gap-2 pl-1">
            <Avatar name={user.name} className="h-7 w-7 text-[10px]" />
            <span className="text-xs font-semibold text-foreground hidden sm:inline-block max-w-[120px] truncate">
              {user.name}
            </span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Log out"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
