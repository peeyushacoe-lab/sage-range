"use client";

import Link from "next/link";
import { useState } from "react";
import { timeAgo } from "@/lib/activity-feed";
import type { SerializedComment, SerializedFeedEntry } from "@/lib/activity-feed";
import { CyberAvatar } from "@/components/cyber-avatar";

import { Icon, type IconName } from "@/components/ui/icon";
type ReactionKey = "useful" | "congrats" | "impressive" | "smart";

const REACTIONS: { key: ReactionKey; emoji: string; label: string }[] = [
  { key: "useful",     emoji: "👍", label: "Useful" },
  { key: "congrats",   emoji: "🎉", label: "Congrats" },
  { key: "impressive", emoji: "🔥", label: "Impressive" },
  { key: "smart",      emoji: "🧠", label: "Smart" },
];

const DIFF_STYLE: Record<string, string> = {
  EASY:   "text-ok bg-ok-wash border-ok-edge",
  MEDIUM: "text-warn bg-warn-wash border-warn-edge",
  HARD:   "text-danger bg-danger-wash border-danger-edge",
  INSANE: "text-accent bg-accent-wash border-accent-edge",
};

const TYPE_ICON: Record<string, IconName> = {
  CTF:       "challenges",
  BLUE_TEAM: "blueTeam",
  RED_TEAM:  "redTeam",
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
  if (score >= 88) return { label: "EXCEPTIONAL", color: "text-ok" };
  if (score >= 68) return { label: "STRONG",      color: "text-info" };
  if (score >= 48) return { label: "ADEQUATE",    color: "text-warn" };
  return                  { label: "DEVELOPING",  color: "text-ink-3" };
}

interface FeedCardProps {
  entry: SerializedFeedEntry;
  initialCounts: Record<string, number>;
  initialMine: string[];
  initialComments: SerializedComment[];
  meId: string;
}

export function FeedCard({ entry, initialCounts, initialMine, initialComments, meId }: FeedCardProps) {
  const [counts, setCounts] = useState(initialCounts);
  const [mine, setMine] = useState<Set<string>>(new Set(initialMine));
  const [loading, setLoading] = useState<string | null>(null);
  const [comments, setComments] = useState(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

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

  async function submitComment() {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const res = await fetch("/api/feed/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, entryType: entry.type, body }),
      });
      if (res.ok) {
        const created = (await res.json()) as SerializedComment;
        setComments((prev) => [...prev, created]);
        setDraft("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function deleteComment(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/feed/comment/${id}`, { method: "DELETE" });
  }

  return (
    <div className="rounded-xl border border-edge bg-surface-1 p-4 hover:bg-surface-1 transition-colors">
      <div className="flex items-start gap-3">
        <Link href={`/profile/${entry.userId}`} className="shrink-0 hover:opacity-80 transition-opacity">
          <CyberAvatar initial={initial} skillScore={entry.skillScore} size="sm" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-ink leading-snug">
              <Link href={`/profile/${entry.userId}`} className="font-semibold hover:text-white transition-colors">
                {name}
              </Link>
              {isLab ? (
                <>
                  <span className="text-ink-3"> solved </span>
                  <span className="font-medium text-ink">{entry.labTitle}</span>
                </>
              ) : (
                <>
                  <span className="text-ink-3"> completed </span>
                  <span className="font-medium text-ink">{entry.scenarioName}</span>
                </>
              )}
            </p>
            <span className="text-[11px] text-ink-3 shrink-0 mt-0.5">{timeAgo(date)}</span>
          </div>

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {isLab ? (
              <>
                <Icon name={TYPE_ICON[entry.labType] ?? "research"} size={15} />
                <span className="text-xs text-ink-3">{entry.labType.replace("_", " ")}</span>
                <span className={`text-[10px] font-bold uppercase border rounded px-1.5 py-0.5 ${DIFF_STYLE[entry.labDifficulty] ?? ""}`}>
                  {entry.labDifficulty}
                </span>
                {entry.score > 0 && (
                  <span className="text-xs text-ok font-semibold">+{entry.score} XP</span>
                )}
                {entry.timeTakenSec != null && (
                  <span className="text-xs text-ink-3">· {formatTime(entry.timeTakenSec)}</span>
                )}
              </>
            ) : (
              <>
                <Icon name="energy" size={15} />
                <span className="text-xs text-ink-3">Simulation</span>
                <span className="text-xs font-bold text-ink">{entry.simScore}/100</span>
                {(() => {
                  const r = simRating(entry.simScore);
                  return <span className={`text-xs font-bold ${r.color}`}>{r.label}</span>;
                })()}
              </>
            )}
          </div>

          <div className="mt-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ok">
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
                      ? "bg-ok-wash border-ok-edge text-ok"
                      : "bg-surface-2 border-edge text-ink-3 hover:border-edge-strong hover:text-ink-2"
                  } ${loading === key ? "opacity-60" : ""}`}
                >
                  <span>{emoji}</span>
                  <span className="font-medium">{label}</span>
                  {count > 0 && <span className="ml-0.5 opacity-80">{count}</span>}
                </button>
              );
            })}

            {comments.length > 0 && (
              <button
                onClick={() => setShowComments((v) => !v)}
                className="text-xs text-ink-3 hover:text-ink-2 transition-colors px-1"
              >
                {showComments ? "Hide" : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
              </button>
            )}
          </div>

          {showComments && comments.length > 0 && (
            <div className="mt-3 space-y-2">
              {comments.map((c) => {
                const cName = c.displayName ?? c.email.split("@")[0];
                return (
                  <div key={c.id} className="flex items-start justify-between gap-2 text-xs">
                    <p className="text-ink-2 leading-snug">
                      <Link href={`/profile/${c.userId}`} className="font-semibold hover:text-white transition-colors">
                        {cName}
                      </Link>
                      <span className="text-ink-3"> {c.body}</span>
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-ink-3">{timeAgo(c.createdAt)}</span>
                      {c.userId === meId && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-ink-3 hover:text-danger transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitComment();
              }}
              maxLength={500}
              placeholder="Add a comment…"
              className="flex-1 bg-surface-2 border border-edge rounded-full px-3 py-1.5 text-xs text-ink placeholder:text-ink-3 focus:outline-none focus:border-edge-strong"
            />
            <button
              onClick={submitComment}
              disabled={!draft.trim() || posting}
              className="text-xs font-semibold text-ok hover:text-ok disabled:opacity-30 transition-colors shrink-0"
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
