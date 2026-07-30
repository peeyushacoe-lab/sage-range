"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";

import { Icon, type IconName } from "@/components/ui/icon";
type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<string, IconName> = {
  lab_assigned:          "labs",
  sim_complete:          "simulations",
  badge_earned:          "medal",
  writeup_approved:      "checkCircle",
  writeup_rejected:      "cross",
  scenario_published:    "simulations",
  competition_start:     "redTeam",
  competition_win:       "trophy",
  announcement:          "announce",
  cert_pending_approval: "clipboard",
  cert_approved:         "graduation",
  cert_rejected:         "warning",
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnread);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function loadNotifs() {
    if (loaded) return;
    const r = await fetch("/api/notifications?limit=10");
    if (!r.ok) return;
    const d = await r.json();
    setNotifs(d.notifications ?? []);
    setUnread(d.unread ?? 0);
    setLoaded(true);
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  }

  async function dismiss(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifs((prev) => {
      const next = prev.filter((n) => n.id !== id);
      const wasUnread = prev.find((n) => n.id === id)?.read === false;
      if (wasUnread) setUnread((u) => Math.max(0, u - 1));
      return next;
    });
  }

  function handleOpen() {
    setOpen((o) => !o);
    loadNotifs();
    if (unread > 0) markAllRead();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative cursor-pointer rounded-md p-1.5 text-ink-3 transition-colors duration-fast hover:bg-surface-2 hover:text-ink-2"
      >
        <Bell aria-hidden="true" className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-danger px-0.5 font-mono text-[9px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-overlay mt-2 w-80 overflow-hidden rounded-lg border border-edge bg-surface-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-edge-subtle px-4 py-3">
            <span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">Notifications</span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[10px] text-ink-3 transition-colors duration-fast hover:text-ink-2"
            >
              View all →
            </Link>
          </div>

          {!loaded ? (
            <div className="px-4 py-6 text-center text-xs text-ink-3">Loading…</div>
          ) : notifs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="mb-2 flex justify-center text-ink-3"><Bell aria-hidden="true" className="h-6 w-6" /></p>
              <p className="text-xs text-ink-3">No notifications yet</p>
            </div>
          ) : (
            <div className="max-h-80 divide-y divide-edge-subtle overflow-y-auto">
              {notifs.map((n) => {
                const inner = (
                  <div className={`group flex gap-3 px-4 py-3 transition-colors duration-fast hover:bg-surface-3/60 ${!n.read ? "bg-accent-wash/40" : ""}`}>
                    <Icon name={TYPE_ICON[n.type] ?? "bell"} size={16} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs leading-snug ${!n.read ? "font-medium text-ink" : "text-ink-2"}`}>{n.title}</p>
                      {n.body && <p className="mt-0.5 truncate text-[11px] text-ink-3">{n.body}</p>}
                      <p className="mt-1 text-[10px] text-ink-3">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => dismiss(n.id, e)}
                      className="shrink-0 cursor-pointer text-ink-3 opacity-0 transition-opacity duration-fast hover:text-ink-2 group-hover:opacity-100"
                      aria-label="Dismiss"
                    ><X aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0" /></button>
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={() => setOpen(false)}>{inner}</Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
