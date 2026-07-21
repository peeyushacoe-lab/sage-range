"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
  "EASY easy":    "text-emerald-400",
  "MEDIUM medium":"text-amber-400",
  "HARD hard":    "text-orange-400",
  "INSANE insane":"text-red-400",
};

function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function MovementArrow({ delta }: { delta: number }) {
  if (delta === 0) return <span className="w-4 text-center text-zinc-700 text-xs">—</span>;
  if (delta > 0)   return <span className="w-4 text-center text-emerald-400 text-xs font-bold">↑{delta}</span>;
  return               <span className="w-4 text-center text-red-400 text-xs font-bold">↓{Math.abs(delta)}</span>;
}

const MEDAL = ["🥇", "🥈", "🥉"];

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
          <span className={`h-2 w-2 rounded-full bg-emerald-500 ${pulse ? "scale-150" : ""} transition-transform`} />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Live</span>
        </div>
        <span className="text-xs text-zinc-600">
          {staleSec < 3 ? "Just updated" : `Updated ${staleSec}s ago`}
        </span>
        <span className="text-xs text-zinc-600">·</span>
        <span className="text-xs text-zinc-600">{data.activeCount} active today</span>

        {/* Me badge */}
        {meRow && (
          <span className="ml-auto text-xs border border-emerald-500/30 bg-emerald-500/8 text-emerald-400 rounded-full px-3 py-0.5">
            You are #{meRow.rank} · {meRow.skillScore} pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Scoreboard table */}
        <div className="lg:col-span-2 rounded-xl border border-white/8 bg-zinc-900/50 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Global Rankings</p>
            <p className="text-xs text-zinc-600">{data.users.length} players</p>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: "62vh" }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur z-10">
                <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-600 border-b border-white/5">
                  <th className="px-4 py-2.5 w-10">#</th>
                  <th className="px-2 py-2.5 w-6" />
                  <th className="px-2 py-2.5">Player</th>
                  <th className="px-4 py-2.5 text-right">Score</th>
                  <th className="px-4 py-2.5">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/4">
                {data.users.map((u) => {
                  const prevRank  = prevRanks.current.get(u.id) ?? u.rank;
                  const delta     = prevRank - u.rank; // positive = moved up
                  const isMe      = u.id === currentUserId;
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${isMe ? "bg-emerald-500/6 hover:bg-emerald-500/10" : "hover:bg-white/3"}`}
                    >
                      <td className="px-4 py-2.5 text-zinc-500 tabular-nums font-mono text-xs w-10">
                        {u.rank <= 3 ? MEDAL[u.rank - 1] : u.rank}
                      </td>
                      <td className="px-2 py-2.5 w-6">
                        <MovementArrow delta={delta} />
                      </td>
                      <td className="px-2 py-2.5">
                        <Link
                          href={`/profile/${u.id}`}
                          className={`font-medium hover:underline ${isMe ? "text-emerald-300" : "text-zinc-200"}`}
                        >
                          {u.name}
                          {isMe && <span className="text-zinc-600 font-normal text-xs ml-1">(you)</span>}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-zinc-200">
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
        <div className="rounded-xl border border-white/8 bg-zinc-900/50 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between shrink-0">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Recent Activity</p>
            <span className={`h-1.5 w-1.5 rounded-full bg-emerald-500 ${pulse ? "animate-ping" : ""}`} />
          </div>
          <div className="overflow-y-auto flex-1" style={{ maxHeight: "62vh" }}>
            {data.activity.length === 0 ? (
              <p className="px-4 py-8 text-xs text-zinc-600 text-center">No activity in the last 30 minutes</p>
            ) : (
              <div className="divide-y divide-white/4">
                {data.activity.map((ev) => (
                  <div key={ev.id} className="px-4 py-3 space-y-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm shrink-0">{ev.kind === "SIM" ? "⚡" : "🚩"}</span>
                        <Link href={`/profile/${ev.userId}`}
                          className="text-xs font-semibold text-zinc-300 hover:text-white truncate">
                          {ev.user}
                        </Link>
                      </div>
                      <span className="text-[10px] text-zinc-600 tabular-nums shrink-0">
                        {relativeTime(ev.ts)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate pl-5">{ev.title}</p>
                    <p className={`text-[10px] pl-5 ${
                      ev.detail.includes("HARD") || ev.detail.includes("INSANE") ? "text-orange-400"
                      : ev.detail === "contained" ? "text-emerald-400"
                      : ev.detail.includes("breached") ? "text-red-400"
                      : "text-zinc-600"
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
