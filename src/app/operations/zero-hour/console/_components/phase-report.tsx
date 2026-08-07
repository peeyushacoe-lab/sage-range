"use client";

import { useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import type { PhaseProps } from "./console";

type Options = {
  severity: string[];
  iocs: string[];
  assets: string[];
  techniques: string[];
  containment: string[];
};
type Data = { options: Options };

/** Matches NARRATIVE_MIN_CHARS in the engine. */
const MIN_CHARS = 120;

const NARRATIVE_FIELDS = [
  {
    key: "executiveSummary" as const,
    label: "Executive summary",
    hint: "What happened, in language a non-technical board member can act on.",
  },
  {
    key: "impact" as const,
    label: "Impact",
    hint: "What the attacker could reach, and what left the estate.",
  },
  {
    key: "remediation" as const,
    label: "Remediation",
    hint: "What happens after containment, and in what order.",
  },
  {
    key: "recommendations" as const,
    label: "Recommendations",
    hint: "What would have stopped this, or caught it sooner.",
  },
];

/**
 * Phase 6 — Final Report.
 *
 * The structured sections are graded against the answer key with a
 * false-positive penalty, so ticking every IoC on the list scores worse than
 * naming the ones you can actually evidence. The narrative sections are scored
 * for being written rather than for their wording — judging prose without a
 * human grader would be arbitrary, and pretending otherwise would be worse
 * than being honest about it.
 */
export function PhaseReport({ data, onSubmit, submitting }: PhaseProps<Data>) {
  const [severity, setSeverity] = useState("");
  const [sets, setSets] = useState<Record<string, Set<string>>>({
    iocs: new Set(),
    assets: new Set(),
    techniques: new Set(),
    containment: new Set(),
  });
  const [prose, setProse] = useState<Record<string, string>>({});

  function toggle(field: string, value: string) {
    setSets((s) => {
      const next = new Set(s[field]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...s, [field]: next };
    });
  }

  function submit() {
    onSubmit({
      answer: {
        severity,
        iocs: [...sets.iocs],
        assets: [...sets.assets],
        techniques: [...sets.techniques],
        containment: [...sets.containment],
        ...prose,
      },
    });
  }

  const proseDone = NARRATIVE_FIELDS.filter(
    (f) => (prose[f.key] ?? "").trim().length >= MIN_CHARS,
  ).length;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Incident report INC-2026-001</p>
            <p className="text-xs text-zinc-500">{"Aegis Financial Services"}</p>
          </div>
          <Badge tone="red">Cannot be modified after submission</Badge>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-zinc-500">
          Selecting entries you cannot evidence is penalised. A shorter, correct report scores
          higher than an exhaustive one.
        </p>
      </Card>

      <Card className="p-5">
        <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">Severity</p>
        <div className="flex flex-wrap gap-2">
          {data.options.severity.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                severity === s
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-zinc-400 hover:border-white/25"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </Card>

      <ChipSection
        title="Indicators of compromise"
        hint="Addresses, domains, hashes, filenames, task and key names."
        options={data.options.iocs}
        selected={sets.iocs}
        onToggle={(v) => toggle("iocs", v)}
        mono
      />
      <ChipSection
        title="Compromised assets"
        hint="Hosts and accounts under attacker control. An account that was attacked and held is not compromised."
        options={data.options.assets}
        selected={sets.assets}
        onToggle={(v) => toggle("assets", v)}
        mono
      />
      <ChipSection
        title="Attack techniques"
        hint="MITRE ATT&CK techniques evidenced in this incident."
        options={data.options.techniques}
        selected={sets.techniques}
        onToggle={(v) => toggle("techniques", v)}
        mono
      />
      <ChipSection
        title="Immediate containment"
        hint="What must happen now."
        options={data.options.containment}
        selected={sets.containment}
        onToggle={(v) => toggle("containment", v)}
      />

      {NARRATIVE_FIELDS.map((f) => {
        const value = prose[f.key] ?? "";
        const ok = value.trim().length >= MIN_CHARS;
        return (
          <Card key={f.key} className="p-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">{f.label}</p>
              <p className={`text-[11px] tabular-nums ${ok ? "text-emerald-500" : "text-zinc-600"}`}>
                {value.trim().length} / {MIN_CHARS}
              </p>
            </div>
            <p className="mb-2 text-xs text-zinc-500">{f.hint}</p>
            <textarea
              value={value}
              onChange={(e) => setProse((p) => ({ ...p, [f.key]: e.target.value }))}
              rows={5}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
              placeholder="Write for the reader who was not in the room."
            />
          </Card>
        );
      })}

      <Card className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-zinc-200">
            {severity ? "Severity set" : "Severity not set"} · {sets.iocs.size} IoCs ·{" "}
            {sets.assets.size} assets · {sets.techniques.size} techniques · {proseDone}/4 sections
            written
          </p>
          <p className="text-xs text-amber-400/80">
            Submitting the report ends the operation.
          </p>
        </div>
        <Button onClick={submit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit final report"}
        </Button>
      </Card>
    </div>
  );
}

function ChipSection({
  title,
  hint,
  options,
  selected,
  onToggle,
  mono,
}: {
  title: string;
  hint: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">{title}</p>
        <p className="text-[11px] tabular-nums text-zinc-600">{selected.size} selected</p>
      </div>
      <p className="mb-3 text-xs text-zinc-500">{hint}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.has(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              aria-pressed={on}
              className={`max-w-full truncate rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                mono ? "font-mono" : ""
              } ${
                on
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                  : "border-white/10 text-zinc-400 hover:border-white/25"
              }`}
              title={o}
            >
              {o}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
