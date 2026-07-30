"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
type RankInfo = { label: string; tier: string; color: string };
type User     = { rank: number; id: string; name: string; skillScore: number; rankInfo: RankInfo };
type Activity = { id: string; kind: "LAB" | "SIM"; user: string; userId: string; title: string; detail: string; ts: number };

type ScoreboardData = {
  users:       User[];
  activity:    Activity[];
  activeCount: number;
  ts:          number;
};

const DIFF_COLOR: Record<string, string> = {
  "EASY easy":    "text-ok",
  "MEDIUM medium":"text-warn",
  "HARD hard":    "text-sev-high",
  "INSANE insane":"text-danger",
};

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function MovementArrow({ delta }: { delta: number }) {
  if (delta === 0) return <span className="w-4 text-center text-ink-3 text-xs">—</span>;
  if (delta > 0)   return <span className="w-4 text-center text-ok text-xs font-bold">↑{delta}</span>;
  return               <span className="w-4 text-center text-danger text-xs font-bold">↓{Math.abs(delta)}</span>;
}

const MEDAL_TONE = ["gold", "slate", "amber"] as const;

export function LiveBoard({
  initialData,
  currentUserId,
}: {
  initialData: ScoreboardData;
  currentUserId: string;
}) {
  const [data, setData]           = useState<ScoreboardData>(initialData);
  const [staleSec, setStaleSec]   = useState(0);
  const [pulse, setPulse]         = useState(false);
  const prevRanks = useRef<Map<string, number>>(new Map(initialData.users.map(u => [u.id, u.rank])));
  const tickRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll every 6 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/scoreboard");
        if (!res.ok) return;
        const fresh: ScoreboardData = await res.json();
        setData(fresh);
        setStaleSec(0);
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
        prevRanks.current = new Map(data.users.map(u => [u.id, u.rank]));
      } catch { /* network hiccup — keep showing last good data */ }
    };

    tickRef.current = setInterval(poll, 6000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [data.users]);

  // Stale counter
  useEffect(() => {
    const t = setInterval(() => setStaleSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [data.ts]);

  const meRow = data.users.find(u => u.id === currentUserId);

  return (
    <div className="space-y-6">

      {/* Live header bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full bg-ok ${pulse ? "scale-150" : ""} transition-transform`} />
          <span className="text-xs font-bold text-ink-3 uppercase tracking-widest">Live</span>
        </div>
        <span className="text-xs text-ink-3">
          {staleSec < 3 ? "Just updated" : `Updated ${staleSec}s ago`}
        </span>
        <span className="text-xs text-ink-3">·</span>
        <span className="text-xs text-ink-3">{data.activeCount} active today</span>

        {/* Me badge */}
        {meRow && (
          <span className="ml-auto text-xs border border-ok-edge bg-ok-wash text-ok rounded-full px-3 py-0.5">
            You are #{meRow.rank} · {meRow.skillScore} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Scoreboard table */}
        <div className="lg:col-span-2 rounded-xl border border-edge bg-surface-1 overflow-hidden">
          <div className="px-4 py-3 border-b border-edge flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-ink-3">Global Rankings</p>
            <p className="text-xs text-ink-3">{data.users.length} players</p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "62vh" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-1 backdrop-blur z-10">
                <tr className="text-left text-[10px] uppercase tracking-widest text-ink-3 border-b border-edge-subtle">
                  <th className="px-4 py-2.5 w-10">#</th>
                  <th className="px-2 py-2.5 w-6" />
                  <th className="px-2 py-2.5">Player</th>
                  <th className="px-4 py-2.5 text-right">Score</th>
                  <th className="px-4 py-2.5">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-subtle">
                {data.users.map((u) => {
                  const prevRank  = prevRanks.current.get(u.id) ?? u.rank;
                  const delta     = prevRank - u.rank; // positive = moved up
                  const isMe      = u.id === currentUserId;
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${isMe ? "bg-ok-wash hover:bg-ok-wash" : "hover:bg-surface-2"}`}
                    >
                      <td className="px-4 py-2.5 text-ink-3 tabular-nums font-mono text-xs w-10">
                        {u.rank <= 3 ? <Icon name="medal" tone={MEDAL_TONE[u.rank - 1]} size={14} /> : u.rank}
                      </td>
                      <td className="px-2 py-2.5 w-6">
                        <MovementArrow delta={delta} />
                      </td>
                      <td className="px-2 py-2.5">
                        <Link
                          href={`/profile/${u.id}`}
                          className={`font-medium hover:underline ${isMe ? "text-ok" : "text-ink"}`}
                        >
                          {u.name}
                          {isMe && <span className="text-ink-3 font-normal text-xs ml-1">(you)</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-ink">
                        {u.skillScore.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border"
                          style={{ color: u.rankInfo.color, borderColor: u.rankInfo.color + "40" }}
                        >
                          {u.rankInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-edge bg-surface-1 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-edge flex items-center justify-between shrink-0">
            <p className="text-xs uppercase tracking-widest text-ink-3">Recent Activity</p>
            <span className={`h-1.5 w-1.5 rounded-full bg-ok ${pulse ? "animate-ping" : ""}`} />
          </div>
          <div className="overflow-y-auto flex-1" style={{ maxHeight: "62vh" }}>
            {data.activity.length === 0 ? (
              <p className="px-4 py-8 text-xs text-ink-3 text-center">No activity in the last 30 minutes</p>
            ) : (
              <div className="divide-y divide-edge-subtle">
                {data.activity.map((ev) => (
                  <div key={ev.id} className="px-4 py-3 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon name={ev.kind === "SIM" ? "energy" : "challenges"} size={14} className="shrink-0" />
                        <Link href={`/profile/${ev.userId}`}
                          className="text-xs font-semibold text-ink-2 hover:text-white truncate">
                          {ev.user}
                        </Link>
                      </div>
                      <span className="text-[10px] text-ink-3 tabular-nums shrink-0">
                        {relativeTime(ev.ts)}
                      </span>
                    </div>
                    <p className="text-xs text-ink-3 truncate pl-5">{ev.title}</p>
                    <p className={`text-[10px] pl-5 ${
                      ev.detail.includes("HARD") || ev.detail.includes("INSANE") ? "text-sev-high"
                      : ev.detail === "contained" ? "text-ok"
                      : ev.detail.includes("breached") ? "text-danger"
                      : "text-ink-3"
                    }`}>
                      {ev.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
