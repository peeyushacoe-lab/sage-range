"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Badge, ProgressBar } from "@/components/ui";

type Option = { id: string; label: string; detail: string | null; costMinutes: number };

type ActiveInject = {
  id: string;
  channel: string;
  title: string;
  body: string;
  arrivedAt: string;
  minutesLeft: number;
  options: Option[];
};

type LapsedInject = { id: string; title: string; note: string; at: string };

const CHANNEL_TONE: Record<string, "red" | "amber" | "blue" | "purple" | "emerald" | "zinc"> = {
  SOC: "red",
  INFRA: "amber",
  EXEC: "purple",
  LEGAL: "blue",
  MEDIA: "amber",
  CUSTOMER: "emerald",
  LAW_ENFORCEMENT: "blue",
};

const CHANNEL_LABEL: Record<string, string> = {
  SOC: "SOC",
  INFRA: "Infrastructure",
  EXEC: "Executive",
  LEGAL: "Legal",
  MEDIA: "Media",
  CUSTOMER: "Customers",
  LAW_ENFORCEMENT: "Law enforcement",
};

function money(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `£${Math.round(n / 1_000)}k`;
  return `£${n}`;
}

function Meter({ label, value }: { label: string; value: number }) {
  const tone = value >= 60 ? "emerald" : value >= 30 ? "amber" : "red";
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</span>
        <span className="font-mono text-sm font-bold tabular-nums text-zinc-200">{value}</span>
      </div>
      <ProgressBar value={value} tone={tone} />
    </div>
  );
}

/**
 * The command centre screen.
 *
 * Server-rendered per decision rather than held in client state: the engine is
 * authoritative, so every action round-trips and the page re-reads the run.
 * That keeps the displayed meters identical to the stored ones even if a tab
 * is left open or reloaded mid-crisis.
 */
export function CommandCenter({
  runId,
  title,
  clock,
  minute,
  durationMinutes,
  state,
  active,
  lapsed,
  remaining,
  nextArrivalIn,
}: {
  runId: string;
  title: string;
  clock: string;
  minute: number;
  durationMinutes: number;
  state: { containment: number; reputation: number; morale: number; financialLoss: number };
  active: ActiveInject[];
  lapsed: LapsedInject[];
  remaining: number;
  nextArrivalIn: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(active[0]?.id ?? null);

  const working = busy || pending;

  async function decide(injectId: string, optionId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/crisis/run/${runId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ injectId, optionId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "That decision could not be recorded");
        return;
      }
      if (body?.complete) {
        router.push(`/crisis/run/${runId}/debrief`);
        return;
      }
      setExpanded(null);
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — your decision was not recorded");
    } finally {
      setBusy(false);
    }
  }

  async function hold(minutes: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/crisis/run/${runId}/skip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Could not advance the clock");
        return;
      }
      if (body?.complete) {
        router.push(`/crisis/run/${runId}/debrief`);
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* ── Status bar ── */}
      <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-white/10 bg-zinc-950/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
            <p className="font-mono text-3xl font-black tabular-nums text-zinc-100">{clock}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Loss to date</p>
            <p className="font-mono text-2xl font-black tabular-nums text-red-400">
              {money(state.financialLoss)}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Meter label="Containment" value={state.containment} />
          <Meter label="Reputation" value={state.reputation} />
          <Meter label="Team morale" value={state.morale} />
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-zinc-600">
          <span>
            {Math.round((minute / durationMinutes) * 100)}% through the day · {remaining} still to
            come
          </span>
          {nextArrivalIn !== null && <span>next in {nextArrivalIn}m</span>}
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {/* ── Active queue ── */}
      <section className="mb-8">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-emerald-500">
          Needs your decision
        </h2>

        {active.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-zinc-400">
              Nothing is waiting on you right now. Hold position and let the day move.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Button onClick={() => hold(15)} disabled={working}>
                {working ? "…" : "Hold 15m"}
              </Button>
              <Button variant="secondary" onClick={() => hold(60)} disabled={working}>
                Hold 1h
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {active.map((inject) => {
              const open = expanded === inject.id;
              const urgent = inject.minutesLeft <= 15;
              return (
                <Card
                  key={inject.id}
                  className={`p-5 ${urgent ? "border-red-500/40" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : inject.id)}
                    className="w-full text-left"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2">
                          <Badge tone={CHANNEL_TONE[inject.channel] ?? "zinc"}>
                            {CHANNEL_LABEL[inject.channel] ?? inject.channel}
                          </Badge>
                          <span className="text-xs text-zinc-600">{inject.arrivedAt}</span>
                        </div>
                        <p className="text-base font-semibold text-zinc-100">{inject.title}</p>
                      </div>
                      <span
                        className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                          urgent ? "animate-pulse text-red-400" : "text-zinc-500"
                        }`}
                      >
                        {inject.minutesLeft}m left
                      </span>
                    </div>
                  </button>

                  {open && (
                    <>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-400">
                        {inject.body}
                      </p>
                      <div className="mt-4 space-y-2">
                        {inject.options.map((o) => (
                          <button
                            key={o.id}
                            type="button"
                            disabled={working}
                            onClick={() => decide(inject.id, o.id)}
                            className="block w-full rounded-md border border-white/10 px-4 py-3 text-left transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5 disabled:opacity-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-zinc-200">{o.label}</p>
                                {o.detail && (
                                  <p className="mt-0.5 text-xs text-zinc-500">{o.detail}</p>
                                )}
                              </div>
                              <span className="shrink-0 font-mono text-xs text-zinc-600">
                                {o.costMinutes}m
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── What got away ── */}
      {lapsed.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-zinc-600">
            Passed you by
          </h2>
          <Card className="divide-y divide-white/5 p-0">
            {lapsed.map((l) => (
              <div key={l.id} className="px-5 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm text-zinc-400">{l.title}</p>
                  <span className="shrink-0 font-mono text-xs text-zinc-700">{l.at}</span>
                </div>
                <p className="mt-1 text-xs text-red-400/80">{l.note}</p>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
