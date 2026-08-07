"use client";

import { useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import type { PhaseProps } from "./console";

type Action = { id: string; category: string; label: string; detail: string };
type Data = { actions: Action[] };

const CATEGORY_LABEL: Record<string, string> = {
  ENDPOINT: "Endpoint",
  ACCOUNTS: "Accounts",
  NETWORK: "Network",
  EVIDENCE: "Evidence",
  COMMS: "Communications",
};

const ORDER = ["ENDPOINT", "ACCOUNTS", "NETWORK", "EVIDENCE", "COMMS"];

/**
 * Phase 5 — Incident Response.
 *
 * No indication of which actions are correct, and no count of how many to
 * pick. Some of these are wrong in ways that cost more than doing nothing, so
 * the warning below is the only hint given — and it is the same warning a real
 * responder carries into the decision.
 */
export function PhaseResponse({ data, onSubmit, submitting }: PhaseProps<Data>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const grouped = ORDER.map((cat) => ({
    cat,
    actions: data.actions.filter((a) => a.category === cat),
  })).filter((g) => g.actions.length > 0);

  return (
    <div>
      <Card className="mb-4 border-amber-500/25 bg-amber-500/[0.03] p-5">
        <p className="text-sm text-zinc-200">
          Choose the actions you would take, based on what you have established.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-amber-200/80">
          Actions have consequences. Some of the options below will damage the investigation, the
          business, or both — and selecting them costs you points. Selecting everything scores
          worse than selecting carefully.
        </p>
      </Card>

      <div className="space-y-4">
        {grouped.map(({ cat, actions }) => (
          <div key={cat}>
            <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
              {CATEGORY_LABEL[cat] ?? cat}
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {actions.map((a) => {
                const on = selected.has(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    aria-pressed={on}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      on
                        ? "border-emerald-500/40 bg-emerald-500/[0.07]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15"
                    }`}
                  >
                    <span className="flex items-start gap-2.5">
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                          on
                            ? "border-emerald-500 bg-emerald-500 text-zinc-950"
                            : "border-white/20"
                        }`}
                        aria-hidden
                      >
                        {on ? "✓" : ""}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-zinc-200">{a.label}</span>
                        <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
                          {a.detail}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Card className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-zinc-200">
            {selected.size} action{selected.size === 1 ? "" : "s"} selected
          </p>
          <p className="text-xs text-zinc-500">
            There is no target number. Take what the evidence justifies.
          </p>
        </div>
        <Button onClick={() => onSubmit({ selected: [...selected] })} disabled={submitting}>
          {submitting ? "Submitting…" : "Execute response plan"}
        </Button>
      </Card>

      {selected.size === 0 && (
        <p className="mt-2 text-center text-xs text-zinc-600">
          <Badge tone="zinc">Doing nothing is also a decision — and it scores zero.</Badge>
        </p>
      )}
    </div>
  );
}
