"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { id: string; title: string; content: string; type: string };
type Tactic =
  | "INITIAL_ACCESS"
  | "PERSISTENCE"
  | "PRIVILEGE_ESCALATION"
  | "LATERAL_MOVEMENT"
  | "COMMAND_AND_CONTROL"
  | "EXFILTRATION"
  | "IMPACT";

const TACTICS: { key: Tactic; label: string }[] = [
  { key: "INITIAL_ACCESS", label: "Initial Access" },
  { key: "PERSISTENCE", label: "Persistence" },
  { key: "PRIVILEGE_ESCALATION", label: "Privilege Escalation" },
  { key: "LATERAL_MOVEMENT", label: "Lateral Movement" },
  { key: "COMMAND_AND_CONTROL", label: "Command & Control" },
  { key: "EXFILTRATION", label: "Exfiltration" },
  { key: "IMPACT", label: "Impact" },
];

type Result = {
  score: number;
  accuracyPct: number;
  categorizationCorrect: number;
  taggedTotal: number;
  timelineCorrect: number;
  perItem: Record<string, { correct: boolean; correctTactic: string }>;
};

export function EvidenceBoardClient({
  simulationId,
  simulationSlug,
  title,
  items,
  existing,
}: {
  simulationId: string;
  simulationSlug: string;
  title: string;
  items: Item[];
  existing: { categorization: Record<string, string>; timelineOrder: string[]; score: number | null; accuracyPct: number | null; completed: boolean } | null;
}) {
  const [categorization, setCategorization] = useState<Record<string, Tactic>>(
    (existing?.categorization as Record<string, Tactic>) ?? {}
  );
  const [timelineOrder, setTimelineOrder] = useState<string[]>(existing?.timelineOrder ?? []);
  const [dragId, setDragId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(
    existing?.completed && existing.score !== null
      ? { score: existing.score, accuracyPct: existing.accuracyPct ?? 0, categorizationCorrect: 0, taggedTotal: items.length, timelineCorrect: 0, perItem: {} }
      : null
  );

  const unassigned = items.filter((i) => !categorization[i.id]);
  const allCategorized = unassigned.length === 0;

  function assign(itemId: string, tactic: Tactic) {
    setCategorization((c) => ({ ...c, [itemId]: tactic }));
    setTimelineOrder((order) => (order.includes(itemId) ? order : [...order, itemId]));
  }

  function unassign(itemId: string) {
    setCategorization((c) => {
      const next = { ...c };
      delete next[itemId];
      return next;
    });
    setTimelineOrder((order) => order.filter((id) => id !== itemId));
  }

  function moveInTimeline(itemId: string, dir: -1 | 1) {
    setTimelineOrder((order) => {
      const idx = order.indexOf(itemId);
      const swapWith = idx + dir;
      if (idx === -1 || swapWith < 0 || swapWith >= order.length) return order;
      const next = [...order];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/incidents/evidence-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulationId, categorization, timelineOrder }),
      });
      const data = await res.json();
      if (!data.error) setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  function itemById(id: string) {
    return items.find((i) => i.id === id);
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Evidence Board</h1>
        <p className="text-zinc-500 text-sm mt-1">{title}</p>
        <p className="text-zinc-400 text-sm mt-3 max-w-2xl">
          Drag each piece of evidence into the MITRE ATT&CK tactic it belongs to, then order everything into a
          timeline before you write your report.
        </p>
      </header>

      {/* Unsorted tray */}
      {unassigned.length > 0 && (
        <div
          className="mb-6 rounded-xl border border-dashed border-white/15 bg-zinc-900/30 p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (dragId) unassign(dragId);
          }}
        >
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Unsorted Evidence</p>
          <div className="flex flex-wrap gap-2">
            {unassigned.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragId(item.id)}
                className="cursor-grab active:cursor-grabbing rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:border-sage-500/40 transition"
                title={item.content}
              >
                {item.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tactic columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        {TACTICS.map((tac) => {
          const inColumn = items.filter((i) => categorization[i.id] === tac.key);
          return (
            <div
              key={tac.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) assign(dragId, tac.key);
              }}
              className="rounded-xl border border-white/8 bg-zinc-900/40 p-3 min-h-[140px]"
            >
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2 leading-tight">{tac.label}</p>
              <div className="space-y-1.5">
                {inColumn.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDragId(item.id)}
                    className="cursor-grab active:cursor-grabbing rounded-md border border-sage-500/30 bg-sage-500/10 px-2 py-1.5 text-[11px] text-zinc-200"
                    title={item.content}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Timeline builder */}
      {allCategorized && !result && (
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-5 mb-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Build the Timeline</p>
          <div className="space-y-2">
            {timelineOrder.map((id, idx) => {
              const item = itemById(id);
              if (!item) return null;
              return (
                <div key={id} className="flex items-center justify-between rounded-lg border border-white/8 bg-zinc-950/50 px-3 py-2">
                  <span className="text-sm text-zinc-200">
                    <span className="text-zinc-600 font-mono mr-2">{idx + 1}.</span>
                    {item.title}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => moveInTimeline(id, -1)} disabled={idx === 0} className="text-xs text-zinc-500 hover:text-white disabled:opacity-30 px-2">↑</button>
                    <button onClick={() => moveInTimeline(id, 1)} disabled={idx === timelineOrder.length - 1} className="text-xs text-zinc-500 hover:text-white disabled:opacity-30 px-2">↓</button>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-4 rounded-lg bg-sage-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Evidence Board"}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="rounded-xl border border-sage-500/40 bg-sage-500/5 p-6 text-center">
            <h3 className="font-bold text-sage-400 text-lg mb-1">Board Submitted</h3>
            <p className="text-3xl font-black text-zinc-100">{result.score} pts</p>
            <p className="text-sm text-zinc-400 mt-1">{result.accuracyPct}% overall accuracy</p>
          </div>
          {Object.keys(result.perItem).length > 0 && (
            <div className="space-y-2">
              {items.filter((i) => result.perItem[i.id]).map((item) => {
                const r = result.perItem[item.id];
                return (
                  <div key={item.id} className={`rounded-lg border p-3 text-sm ${r.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                    <p className="font-medium text-zinc-200">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {r.correct ? "Correctly categorized" : `Correct tactic: ${TACTICS.find((t) => t.key === r.correctTactic)?.label}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <Link
            href={`/incidents/${simulationSlug}/report`}
            className="block text-center rounded-lg bg-sage-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition"
          >
            Continue to Report Builder →
          </Link>
        </div>
      )}
    </div>
  );
}
