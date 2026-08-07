"use client";

import { useMemo, useState } from "react";
import { Card, Button, Badge } from "@/components/ui";
import type { PhaseProps } from "./console";
import { Field, Select, SubmitBar } from "./phase-triage";

type Record_ = {
  id: string;
  category: string;
  at: string;
  source: string;
  host: string;
  user: string;
  summary: string;
  detail: string;
};
type Question = { id: string; question: string; options: string[] };
type Data = { records: Record_[]; questions: Question[] };

const CATEGORIES = ["ALL", "EMAIL", "ENDPOINT", "AUTH", "NETWORK", "DNS", "FIREWALL", "FILE"];

/**
 * Phase 2 — Investigation.
 *
 * A searchable evidence environment on the left, the findings to reach on the
 * right. Search covers every field including the detail body, so a query like
 * the C2 address or a username pulls back everything that mentions it — which
 * is how the work is actually done.
 */
export function PhaseInvestigation({ data, onSubmit, submitting }: PhaseProps<Data>) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.records.filter((r) => {
      if (category !== "ALL" && r.category !== category) return false;
      if (!q) return true;
      return [r.id, r.at, r.source, r.host, r.user, r.summary, r.detail, r.category]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data.records, query, category]);

  function view(id: string) {
    setOpen(open === id ? null : id);
    // Rule 5: evidence views are part of the audit trail. Fire-and-forget —
    // a failed log must never block the investigation.
    void fetch("/api/ozh/phase/investigation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId: id }),
    }).catch(() => {});
  }

  const answered = data.questions.filter((q) => answers[q.id]).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <Card className="mb-3 p-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search evidence — hostname, user, IP, domain, filename…"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  category === c
                    ? "border-white/25 bg-white/10 text-white"
                    : "border-white/5 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-600">
            {filtered.length} of {data.records.length} records
          </p>
        </Card>

        <div className="space-y-2">
          {filtered.map((r) => (
            <Card key={r.id}>
              <button
                type="button"
                onClick={() => view(r.id)}
                className="w-full p-3.5 text-left"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-zinc-400">{r.id}</span>
                  <Badge tone="zinc">{r.category}</Badge>
                  <span className="text-[11px] text-zinc-600">{r.at}</span>
                  <span className="text-[11px] text-zinc-600">{r.host}</span>
                </span>
                <span className="mt-1.5 block text-sm text-zinc-200">{r.summary}</span>
              </button>
              {open === r.id && (
                <pre className="mx-3.5 mb-3.5 overflow-x-auto whitespace-pre-wrap rounded-lg border border-white/5 bg-black/40 p-3 text-[11px] leading-relaxed text-zinc-400">
                  {r.detail}
                </pre>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500">No records match that query.</p>
            </Card>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-40 lg:self-start">
        <Card className="p-5">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Findings</p>
          <p className="mb-4 text-xs text-zinc-500">
            Answer from the evidence, not from the alert queue.
          </p>
          <div className="space-y-4">
            {data.questions.map((q) => (
              <Field key={q.id} label={q.question}>
                <Select
                  value={answers[q.id] ?? ""}
                  options={q.options}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                />
              </Field>
            ))}
          </div>
        </Card>

        <div className="mt-3">
          <SubmitBar
            complete={answered}
            total={data.questions.length}
            submitting={submitting}
            onSubmit={() =>
              onSubmit({
                answers: data.questions.map((q) => ({ id: q.id, value: answers[q.id] ?? "" })),
              })
            }
            noun="findings answered"
          />
        </div>
      </div>
    </div>
  );
}
