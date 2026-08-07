"use client";

import { useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import type { PhaseProps } from "./console";

type Alert = { id: string; source: string; at: string; summary: string; rawLog: string };
type Data = { alerts: Alert[]; assets: string[] };

type Row = { verdict?: string; severity?: string; priority?: string; asset?: string };

const VERDICTS = ["BENIGN", "SUSPICIOUS", "MALICIOUS", "FALSE_POSITIVE"] as const;
const SEVERITIES = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;

const VERDICT_TONE: Record<string, "emerald" | "amber" | "red" | "zinc"> = {
  BENIGN: "emerald",
  SUSPICIOUS: "amber",
  MALICIOUS: "red",
  FALSE_POSITIVE: "zinc",
};

/**
 * Phase 1 — SOC Triage.
 *
 * Alerts are listed in the order the SOC received them, which is not the order
 * the attack happened in. Sorting them by time would quietly hand over part of
 * the Phase 4 answer.
 */
export function PhaseTriage({ data, onSubmit, submitting }: PhaseProps<Data>) {
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [open, setOpen] = useState<string | null>(data.alerts[0]?.id ?? null);

  const set = (id: string, patch: Row) =>
    setRows((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  const complete = data.alerts.filter((a) => {
    const r = rows[a.id];
    return r?.verdict && r?.severity && r?.priority && r?.asset;
  }).length;

  function submit() {
    onSubmit({
      answers: data.alerts.map((a) => ({ alertId: a.id, ...rows[a.id] })),
    });
  }

  return (
    <div>
      <Card className="mb-4 p-5">
        <p className="text-sm text-zinc-300">
          Fifteen alerts are open. Classify each one, set its severity and priority, and attribute
          it to an asset.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Not everything here is an attack, and the loudest alert is not necessarily the most
          important one. Severity within one step of the correct value earns half credit.
        </p>
      </Card>

      <div className="mb-4 space-y-2">
        {data.alerts.map((a) => {
          const r = rows[a.id] ?? {};
          const isOpen = open === a.id;
          const filled = r.verdict && r.severity && r.priority && r.asset;
          return (
            <Card key={a.id} className={filled ? "border-emerald-500/20" : undefined}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : a.id)}
                className="flex w-full items-start justify-between gap-4 p-4 text-left"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-400">{a.id}</span>
                    <span className="text-[11px] text-zinc-600">{a.at}</span>
                    <Badge tone="zinc">{a.source}</Badge>
                    {r.verdict && <Badge tone={VERDICT_TONE[r.verdict]}>{r.verdict}</Badge>}
                  </span>
                  <span className="mt-1.5 block text-sm text-zinc-200">{a.summary}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-600">{isOpen ? "−" : "+"}</span>
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-4 pb-4 pt-3">
                  <pre className="mb-4 overflow-x-auto rounded-lg border border-white/5 bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-400">
                    {a.rawLog}
                  </pre>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="Classification">
                      <Select
                        value={r.verdict ?? ""}
                        options={VERDICTS}
                        onChange={(v) => set(a.id, { verdict: v })}
                      />
                    </Field>
                    <Field label="Severity">
                      <Select
                        value={r.severity ?? ""}
                        options={SEVERITIES}
                        onChange={(v) => set(a.id, { severity: v })}
                      />
                    </Field>
                    <Field label="Priority">
                      <Select
                        value={r.priority ?? ""}
                        options={PRIORITIES}
                        onChange={(v) => set(a.id, { priority: v })}
                      />
                    </Field>
                    <Field label="Affected asset">
                      <Select
                        value={r.asset ?? ""}
                        options={data.assets}
                        onChange={(v) => set(a.id, { asset: v })}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <SubmitBar
        complete={complete}
        total={data.alerts.length}
        submitting={submitting}
        onSubmit={submit}
        noun="alerts triaged"
      />
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Select({
  value,
  options,
  onChange,
  placeholder = "— select —",
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500/50 focus:outline-none"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}

export function SubmitBar({
  complete,
  total,
  submitting,
  onSubmit,
  noun,
}: {
  complete: number;
  total: number;
  submitting: boolean;
  onSubmit: () => void;
  noun: string;
}) {
  const incomplete = complete < total;
  return (
    <Card className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-sm font-semibold text-zinc-200">
          {complete} / {total} {noun}
        </p>
        {incomplete && (
          <p className="text-xs text-amber-400/80">
            Unanswered items score nothing. You can submit anyway.
          </p>
        )}
      </div>
      <Button onClick={onSubmit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit phase"}
      </Button>
    </Card>
  );
}
