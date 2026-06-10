"use client";

import Link from "next/link";
import { useState } from "react";
import { timeAgo } from "@/lib/activity-feed";
import type { SerializedFeedEntry } from "@/lib/activity-feed";

type ReactionKey = "useful" | "congrats" | "impressive" | "smart";

const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "useful",     emoji: "👍", label: "Useful" },
  { key: "congrats",   emoji: "🎉", label: "Congrats" },
  { key: "impressive", emoji: "🔥", label: "Impressive" },
  { key: "smart",      emoji: "🧠", label: "Smart" },
];

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  MEDIUM: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HARD:   "text-red-400 bg-red-500/10 border-red-500/20",
  INSANE: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const TYPE_ICON: Record<string, string> = {
  CTF:       "🚩",
  BLUE_TEAM: "🛡️",
  RED_TEAM:  "⚔️",
};

function formatTime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function simRating(score: number) {
  if (score >= 88) return { label: "EXCEPTIONAL", color: "text-emerald-400" };
  if (score >= 68) return { label: "STRONG",      color: "text-blue-400" };
  if (score >= 48) return { label: "ADEQUATE",    color: "text-amber-400" };
  return                  { label: "DEVELOPING",  color: "text-zinc-500" };
}

interface FeedCardProps {
  entry: SerializedFeedEntry;
  initialCounts: Record<string, number>;
  initialMine: string[];
}

export function FeedCard({ entry, initialCounts, initialMine }: FeedCardProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState<Set<string>>(new Set(initialMine));
  const [loading, setLoading] = useState<string | null>(null);

  const name = entry.displayName ?? entry.email.split("@")[0];
  const initial = name[0].toUpperCase();
  const date = entry.type === "lab_solved" ? entry.solvedAt : entry.completedAt;
  const isLab = entry.type === "lab_solved";

  async function toggle(reaction: ReactionKey) {
    if (loading) return;
    setLoading(reaction);
    const had = mine.has(reaction);

    setMine((prev) => {
      const next = new Set(prev);
      had ? next.delete(reaction) : next.add(reaction);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [reaction]: Math.max(0, (prev[reaction] ?? 0) + (had ? -1 : 1)),
    }));

    try {
      await fetch("/api/feed/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, entryType: entry.type, reaction }),
      });
    } catch {
      setMine((prev) => {
        const next = new Set(prev);
        had ? next.add(reaction) : next.delete(reaction);
        return next;
      });
      setCounts((prev) => ({
        ...prev,
        [reaction]: Math.max(0, (prev[reaction] ?? 0) + (had ? 1 : -1)),
      }));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 hover:bg-zinc-900/50 transition-colors">
      <div className="flex items-start gap-3">
        <Link
          href={`/profile/${entry.userId}`}
          className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
            isLab
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
          }`}
        >
          {initial}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-zinc-200 leading-snug">
              <Link href={`/profile/${entry.userId}`} className="font-semibold hover:text-white transition-colors">
                {name}
              </Link>
              {isLab ? (
                <>
                  <span className="text-zinc-500"> solved </span>
                  <span className="font-medium text-zinc-100">{entry.labTitle}</span>
                </>
              ) : (
                <>
                  <span className="text-zinc-500"> completed </span>
                  <span className="font-medium text-zinc-100">{entry.scenarioName}</span>
                </>
              )}
            </p>
            <span className="text-[11px] text-zinc-600 shrink-0 mt-0.5">{timeAgo(date)}</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {isLab ? (
              <>
                <span className="text-sm">{TYPE_ICON[entry.labType] ?? "🔬"}</span>
                <span className="text-xs text-zinc-500">{entry.labType.replace("_", " ")}</span>
                <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 ${DIFF_STYLE[entry.labDifficulty] ?? ""}`}>
                  {entry.labDifficulty}
                </span>
                {entry.score > 0 && (
                  <span className="text-xs text-emerald-400 font-semibold">+{entry.score} XP</span>
                )}
                {entry.timeTakenSec != null && (
                  <span className="text-xs text-zinc-600">· {formatTime(entry.timeTakenSec)}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-sm">⚡</span>
                <span className="text-xs text-zinc-500">Simulation</span>
                <span className="text-xs font-bold text-zinc-200">{entry.simScore}/100</span>
                {(() => {
                  const r = simRating(entry.simScore);
                  return <span className={`text-xs font-bold ${r.color}`}>{r.label}</span>;
                })()}
              </>
            )}
          </div>

          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Platform Verified
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {REACTIONS.map(({ key, emoji, label }) => {
              const active = mine.has(key);
              const count = counts[key] ?? 0;
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  disabled={!!loading}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                    active
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                      : "bg-white/4 border-white/8 text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                  } ${loading === key ? "opacity-60" : ""}`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{label}</span>
                  {count > 0 && <span className="ml-0.5 opacity-80">{count}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
