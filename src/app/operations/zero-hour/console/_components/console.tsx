"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PHASE_ORDER, PHASE_LABEL, PHASE_POINTS, type OzhPhase } from "@/lib/ozh-engine";
import { formatCountdown, countdownTone } from "@/lib/ozh-format";
import { Card, Button, Badge } from "@/components/ui";
import { PhaseTriage } from "./phase-triage";
import { PhaseInvestigation } from "./phase-investigation";
import { PhaseHunt } from "./phase-hunt";
import { PhaseReconstruction } from "./phase-reconstruction";
import { PhaseResponse } from "./phase-response";
import { PhaseReport } from "./phase-report";

/** How often the client re-syncs its clock with the server's. */
const POLL_MS = 15_000;

export type PhaseProps<T> = {
  data: T;
  onSubmit: (payload: unknown) => void;
  submitting: boolean;
};

export function Console({
  initialSecondsRemaining,
  initialPhase,
  completedPhases,
}: {
  initialSecondsRemaining: number;
  initialPhase: OzhPhase | null;
  completedPhases: OzhPhase[];
}) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(initialSecondsRemaining);
  const [phase, setPhase] = useState<OzhPhase | null>(initialPhase);
  const [done, setDone] = useState<OzhPhase[]>(completedPhases);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const pending = useRef<unknown>(null);

  // Local ticking between polls. The server remains the authority — this only
  // keeps the display moving so the countdown does not jump every 15 seconds.
  useEffect(() => {
    const t = setInterval(() => setRemaining((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // Re-sync from the server, which is what a tampered local clock cannot fake.
  useEffect(() => {
    const t = setInterval(async () => {
      const res = await fetch("/api/ozh/state");
      if (!res.ok) return;
      const body = await res.json();
      if (!body.run || body.run.status !== "IN_PROGRESS") {
        router.push("/operations/zero-hour/result");
        return;
      }
      setRemaining(body.run.secondsRemaining);
      if (body.run.secondsRemaining === 0) router.push("/operations/zero-hour/result");
    }, POLL_MS);
    return () => clearInterval(t);
  }, [router]);

  useEffect(() => {
    if (remaining === 0) router.push("/operations/zero-hour/result");
  }, [remaining, router]);

  const loadPhase = useCallback(async (p: OzhPhase) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/ozh/phase/${p.toLowerCase()}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not load this phase");
      setLoading(false);
      return;
    }
    setData(body);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (phase) void loadPhase(phase);
  }, [phase, loadPhase]);

  async function reallySubmit() {
    if (!phase) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch(`/api/ozh/phase/${phase.toLowerCase()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pending.current),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    setConfirmSubmit(false);

    if (!res.ok) {
      setError(body.error ?? "Submission failed");
      return;
    }
    setDone((d) => [...d, phase]);
    if (body.nextPhase) {
      setPhase(body.nextPhase as OzhPhase);
    } else {
      router.push("/operations/zero-hour/result");
    }
  }

  // Submitting locks the phase permanently, so it always goes through a
  // confirmation step — there is no undo to fall back on.
  function onSubmit(payload: unknown) {
    pending.current = payload;
    setConfirmSubmit(true);
  }

  const tone = countdownTone(remaining);
  const toneClass = { emerald: "text-emerald-400", amber: "text-amber-400", red: "text-red-400" }[tone];
  const runningPoints = done.reduce((sum, p) => sum + PHASE_POINTS[p], 0);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Console header. Sticky because the countdown is the one thing that
          must never scroll out of view. */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">
              Operation Zero Hour
            </p>
            <p className="text-sm font-bold text-zinc-200">
              {phase ? PHASE_LABEL[phase] : "Complete"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600">Time remaining</p>
            <p className={`text-2xl font-black tabular-nums leading-none ${toneClass}`}>
              {formatCountdown(remaining)}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-3">
          <ol className="flex flex-wrap gap-1.5">
            {PHASE_ORDER.map((p, i) => {
              const isDone = done.includes(p);
              const isCurrent = p === phase;
              return (
                <li
                  key={p}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    isDone
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : isCurrent
                        ? "border-white/25 bg-white/10 text-white"
                        : "border-white/5 text-zinc-600"
                  }`}
                >
                  <span className="tabular-nums opacity-60">{i + 1}</span>
                  {PHASE_LABEL[p]}
                  {isDone && <span aria-hidden>✓</span>}
                </li>
              );
            })}
          </ol>
          {/* Points banked, not points scored — per-phase scores stay hidden
              until the debrief so nobody can infer the key mid-run. */}
          <p className="mt-2 text-[11px] text-zinc-600">
            {done.length} of {PHASE_ORDER.length} phases submitted · {runningPoints} of 1000 points
            in play
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {error && (
          <Card className="mb-4 border-red-500/30 bg-red-500/5 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </Card>
        )}

        {loading && (
          <Card className="p-10 text-center">
            <p className="text-sm text-zinc-500">Loading evidence…</p>
          </Card>
        )}

        {!loading && phase && data && (
          <PhaseBody phase={phase} data={data} onSubmit={onSubmit} submitting={submitting} />
        )}
      </div>

      {confirmSubmit && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-6">
          <Card className="w-full max-w-md border-amber-500/30 p-6">
            <Badge tone="amber" className="mb-3">
              Locks permanently
            </Badge>
            <p className="text-sm font-semibold text-zinc-100">
              Submit {phase && PHASE_LABEL[phase]}?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              You cannot return to this phase or change these answers. Anything you have not
              answered will be marked as unanswered.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmSubmit(false)}
                disabled={submitting}
              >
                Keep working
              </Button>
              <Button size="sm" onClick={reallySubmit} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit and lock"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

function PhaseBody({
  phase,
  data,
  onSubmit,
  submitting,
}: {
  phase: OzhPhase;
  data: Record<string, unknown>;
  onSubmit: (payload: unknown) => void;
  submitting: boolean;
}) {
  const props = { onSubmit, submitting };
  switch (phase) {
    case "TRIAGE":
      return <PhaseTriage data={data as never} {...props} />;
    case "INVESTIGATION":
      return <PhaseInvestigation data={data as never} {...props} />;
    case "HUNT":
      return <PhaseHunt data={data as never} {...props} />;
    case "RECONSTRUCTION":
      return <PhaseReconstruction data={data as never} {...props} />;
    case "RESPONSE":
      return <PhaseResponse data={data as never} {...props} />;
    case "REPORT":
      return <PhaseReport data={data as never} {...props} />;
  }
}
