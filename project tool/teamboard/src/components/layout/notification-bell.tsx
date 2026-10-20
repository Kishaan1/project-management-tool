"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket-client";
import { formatRelativeTime } from "@/lib/date-utils";
import { playNotificationSound } from "@/lib/audio";
import { toast } from "sonner";
import type { NotificationDTO } from "@/lib/types";

export function NotificationBell() {
  const router = useRouter();
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications || []);
    setUnread(data.unreadCount || 0);
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    const onNew = (n: NotificationDTO) => {
      setItems((prev) => [n, ...prev.filter((p) => p.id !== n.id)]);
      setUnread((u) => u + 1);
      playNotificationSound();
      toast.info(n.message, {
        description: "New notification",
      });
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [load]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markRead(ids?: string[]) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    setItems((prev) => prev.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)));
    setUnread((u) => (ids ? Math.max(0, u - ids.length) : 0));
  }

  async function openNotification(n: NotificationDTO) {
    if (!n.read) await markRead([n.id]);
    setOpen(false);
    if (n.projectId) router.push(`/projects/${n.projectId}`);
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative h-9 w-9 rounded-full hover:bg-muted"
      >
        <Bell className="h-4 w-4 text-foreground/80" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-84 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-muted/20">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
              <span>Notifications</span>
              {unread > 0 && (
                <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.2 text-[10px] font-medium">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                onClick={() => markRead()}
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-border/20 p-1">
            {items.length === 0 ? (
              <li className="py-10 px-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground mx-auto mb-2">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className="text-xs font-semibold text-foreground">You are all caught up!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">No notifications right now.</p>
              </li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openNotification(n)}
                    className={`flex w-full flex-col gap-1 p-3 text-left rounded-xl transition-colors ${
                      n.read ? "hover:bg-muted/40 opacity-75" : "bg-muted/30 hover:bg-muted/60 font-medium"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-foreground leading-snug">{n.message}</span>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatRelativeTime(n.createdAt)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
