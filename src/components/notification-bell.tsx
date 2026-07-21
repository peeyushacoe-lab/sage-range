"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

const TYPE_ICON: Record<string, string> = {
  lab_assigned:       "🧪",
  sim_complete:       "🛡️",
  badge_earned:       "🏅",
  writeup_approved:   "✅",
  writeup_rejected:   "❌",
  scenario_published: "🎯",
  competition_start:  "⚔️",
  competition_win:    "🏆",
  announcement:       "📣",
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
        className="relative p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center px-0.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Notifications</span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              View all →
            </Link>
          </div>

          {!loaded ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-600">Loading…</div>
          ) : notifs.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-2xl mb-2">🔔</p>
              <p className="text-xs text-zinc-600">No notifications yet</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
              {notifs.map((n) => {
                const inner = (
                  <div className={`px-4 py-3 flex gap-3 hover:bg-white/3 transition-colors group ${!n.read ? "bg-zinc-800/40" : ""}`}>
                    <span className="shrink-0 text-base leading-none mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-snug ${!n.read ? "text-zinc-100" : "text-zinc-400"}`}>{n.title}</p>
                      {n.body && <p className="text-[11px] text-zinc-600 mt-0.5 truncate">{n.body}</p>}
                      <p className="text-[10px] text-zinc-700 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      onClick={(e) => dismiss(n.id, e)}
                      className="shrink-0 text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      aria-label="Dismiss"
                    >✕</button>
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
