"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  announcement:       "📣",
};

const TYPE_COLOR: Record<string, string> = {
  lab_assigned:       "border-l-blue-500",
  sim_complete:       "border-l-sage-500",
  badge_earned:       "border-l-amber-500",
  writeup_approved:   "border-l-emerald-500",
  writeup_rejected:   "border-l-red-500",
  scenario_published: "border-l-purple-500",
  competition_start:  "border-l-orange-500",
  announcement:       "border-l-zinc-500",
};

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)} minutes ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)} hours ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/notifications?limit=50")
      .then((r) => r.json())
      .then((d) => { setNotifs(d.notifications ?? []); setLoading(false); })
      .catch(() => setLoading(false));

    // Mark all as read
    fetch("/api/notifications", { method: "PATCH" }).catch(() => null);
  }, []);

  async function dismiss(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    setNotifs((prev) => prev.filter((n) => n.id !== id));
  }

  async function clearAll() {
    await Promise.all(notifs.map((n) => fetch(`/api/notifications/${n.id}`, { method: "DELETE" })));
    setNotifs([]);
  }

  const unread = notifs.filter((n) => !n.read);
  const read = notifs.filter((n) => n.read);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.back()} className="text-xs text-zinc-500 hover:text-zinc-300 transition mb-3 block">
              ← Back
            </button>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-zinc-500 text-sm mt-1">{notifs.length} total · {unread.length} unread</p>
          </div>
          {notifs.length > 0 && (
            <button
              onClick={clearAll}
              className="text-xs text-zinc-600 hover:text-red-400 transition-colors border border-zinc-800 rounded-lg px-3 py-1.5"
            >
              Clear all
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-zinc-900/50 animate-pulse" />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="rounded-xl border border-white/6 bg-zinc-900/30 py-20 text-center">
            <p className="text-4xl mb-4">🔔</p>
            <p className="text-zinc-400 font-medium">You&apos;re all caught up</p>
            <p className="text-zinc-600 text-sm mt-1">No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {unread.length > 0 && (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-3">New</p>
                <div className="space-y-2">
                  {unread.map((n) => <NotifCard key={n.id} n={n} onDismiss={dismiss} />)}
                </div>
              </section>
            )}
            {read.length > 0 && (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Earlier</p>
                <div className="space-y-2 opacity-70">
                  {read.map((n) => <NotifCard key={n.id} n={n} onDismiss={dismiss} />)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NotifCard({ n, onDismiss }: { n: Notif; onDismiss: (id: string) => void }) {
  const borderColor = TYPE_COLOR[n.type] ?? "border-l-zinc-700";

  const inner = (
    <div className={`group flex items-start gap-4 rounded-xl border border-white/6 bg-zinc-900/40 px-4 py-4 border-l-2 ${borderColor} hover:border-white/10 transition-colors ${!n.read ? "bg-zinc-800/30" : ""}`}>
      <span className="text-xl leading-none shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? "🔔"}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium leading-snug ${!n.read ? "text-zinc-100" : "text-zinc-400"}`}>{n.title}</p>
        {n.body && <p className="text-xs text-zinc-500 mt-1">{n.body}</p>}
        <p className="text-[11px] text-zinc-700 mt-2">{timeAgo(n.createdAt)}</p>
      </div>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(n.id); }}
        className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
        aria-label="Dismiss"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );

  return n.href ? (
    <Link href={n.href}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}
