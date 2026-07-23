"use client";

import { useEffect, useMemo, useState } from "react";

type Alert = { id: string; source: string; summary: string; rawLog: string };
type Shift = { id: string; title: string; briefing: string; timeLimitSec: number; alerts: Alert[] };
type Attempt = { id: string; startedAt: string; completedAt: string | null; score: number | null; accuracyPct: number | null };

type Action = "ESCALATE" | "CLOSE" | "MONITOR";

const ACTION_STYLE: Record<Action, string> = {
  ESCALATE: "bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25",
  CLOSE: "bg-zinc-500/15 border-zinc-500/40 text-zinc-300 hover:bg-zinc-500/25",
  MONITOR: "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25",
};

function formatClock(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function SocShiftClient({ shift, initialAttempt }: { shift: Shift; initialAttempt: Attempt | null }) {
  const [attempt, setAttempt] = useState<Attempt | null>(initialAttempt?.completedAt || initialAttempt?.id ? initialAttempt : null);
  const [triaged, setTriaged] = useState<Record<string, { action: Action; correct: boolean; explanation: string }>>({});
  const [starting, setStarting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  const inProgress = !!attempt && !attempt.completedAt;
  const isDone = !!attempt?.completedAt;

  useEffect(() => {
    if (!inProgress || !attempt) return;
    const started = new Date(attempt.startedAt).getTime();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - started) / 1000);
      setRemainingSec(Math.max(0, shift.timeLimitSec - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [inProgress, attempt, shift.timeLimitSec]);

  const allTriaged = useMemo(() => shift.alerts.every((a) => triaged[a.id]), [shift.alerts, triaged]);

  async function startShift() {
    setStarting(true);
    try {
      const res = await fetch("/api/soc-shift/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shiftId: shift.id }),
      });
      const data = await res.json();
      setAttempt({ id: data.attemptId, startedAt: data.startedAt, completedAt: null, score: null, accuracyPct: null });
    } finally {
      setStarting(false);
    }
  }

  async function triage(alertId: string, action: Action) {
    if (!attempt || triaged[alertId]) return;
    const res = await fetch("/api/soc-shift/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: attempt.id, alertId, action }),
    });
    const data = await res.json();
    if (data.error) return;
    setTriaged((t) => ({ ...t, [alertId]: { action, correct: data.correct, explanation: data.explanation } }));
  }

  async function finishShift() {
    if (!attempt) return;
    setFinishing(true);
    try {
      const res = await fetch("/api/soc-shift/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: attempt.id }),
      });
      const data = await res.json();
      setAttempt((a) => (a ? { ...a, completedAt: new Date().toISOString(), score: data.score, accuracyPct: data.accuracyPct } : a));
    } finally {
      setFinishing(false);
    }
  }

  // Auto-finish when the timer runs out.
  useEffect(() => {
    if (inProgress && remainingSec === 0) {
      void finishShift();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSec, inProgress]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{shift.title}</h1>
        <p className="text-zinc-400 mt-2 leading-relaxed max-w-2xl">{shift.briefing}</p>
      </header>

      {!attempt && (
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-6 text-center">
          <p className="text-sm text-zinc-400 mb-4">
            {shift.alerts.length} alerts, {Math.round(shift.timeLimitSec / 60)} minutes. Escalate the real ones, close the noise.
          </p>
          <button
            onClick={startShift}
            disabled={starting}
            className="rounded-lg bg-sage-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-50"
          >
            {starting ? "Starting…" : "Start Shift"}
          </button>
        </div>
      )}

      {inProgress && (
        <>
          <div className="flex items-center justify-between mb-4 rounded-lg border border-white/8 bg-zinc-900/40 px-4 py-3">
            <span className="text-sm text-zinc-400">
              {Object.keys(triaged).length}/{shift.alerts.length} triaged
            </span>
            <span className={`text-lg font-mono font-bold ${remainingSec !== null && remainingSec < 300 ? "text-red-400" : "text-zinc-100"}`}>
              {remainingSec !== null ? formatClock(remainingSec) : "--:--"}
            </span>
          </div>

          <div className="space-y-3">
            {shift.alerts.map((a) => {
              const done = triaged[a.id];
              return (
                <div key={a.id} className={`rounded-xl border p-4 ${done ? "border-white/5 bg-zinc-900/30 opacity-60" : "border-white/8 bg-zinc-900/50"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">{a.source}</span>
                      <p className="text-sm font-medium text-zinc-200 mt-0.5">{a.summary}</p>
                    </div>
                  </div>
                  <pre className="font-mono text-xs text-zinc-500 whitespace-pre-wrap bg-zinc-950 border border-white/5 rounded-lg p-3 mb-3">{a.rawLog}</pre>
                  {!done ? (
                    <div className="flex gap-2">
                      {(["ESCALATE", "MONITOR", "CLOSE"] as Action[]).map((act) => (
                        <button
                          key={act}
                          onClick={() => triage(a.id, act)}
                          className={`text-xs font-semibold uppercase tracking-wide rounded-lg border px-3 py-1.5 transition ${ACTION_STYLE[act]}`}
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-zinc-500">Triaged: {done.action}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={finishShift}
              disabled={finishing}
              className="rounded-lg bg-sage-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-50"
            >
              {finishing ? "Finishing…" : allTriaged ? "Finish Shift" : "End Shift Early"}
            </button>
          </div>
        </>
      )}

      {isDone && attempt && (
        <div className="space-y-4">
          <div className="rounded-xl border border-sage-500/40 bg-sage-500/5 p-6 text-center">
            <h3 className="font-bold text-sage-400 text-lg mb-1">Shift Complete</h3>
            <p className="text-3xl font-black text-zinc-100">{attempt.score ?? 0} pts</p>
            <p className="text-sm text-zinc-400 mt-1">{attempt.accuracyPct ?? 0}% triage accuracy</p>
          </div>

          {Object.keys(triaged).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Breakdown</p>
              {shift.alerts.map((a) => {
                const t = triaged[a.id];
                if (!t) return null;
                return (
                  <div key={a.id} className={`rounded-lg border p-3 text-sm ${t.correct ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                    <p className="font-medium text-zinc-200">{a.summary}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      You: <span className="font-mono">{t.action}</span> — {t.correct ? "Correct" : "Incorrect"}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">{t.explanation}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
