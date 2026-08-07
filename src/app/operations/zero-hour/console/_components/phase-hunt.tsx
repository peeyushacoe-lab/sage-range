"use client";

import { useMemo, useState } from "react";
import { Card, Badge } from "@/components/ui";
import type { PhaseProps } from "./console";
import { SubmitBar } from "./phase-triage";

type LogLine = { seq: number; at: string; source: string; host: string; user: string; line: string };
type Question = { id: string; tactic: string; prompt: string; hint: string };
type Technique = { id: string; label: string };
type Data = { dataset: LogLine[]; questions: Question[]; techniques: Technique[] };

const PAGE = 60;

/**
 * Phase 3 — Threat Hunt.
 *
 * Raw logs, no alerts, no highlighting. The intern queries the corpus and
 * records what they find against each tactic.
 *
 * Search supports a leading `/` for regex, because grepping a log corpus is
 * the actual skill being tested and substring matching alone would make some
 * of these findings tedious rather than difficult.
 */
export function PhaseHunt({ data, onSubmit, submitting }: PhaseProps<Data>) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { technique?: string; indicator?: string }>>(
    {},
  );

  const { rows, error } = useMemo(() => {
    const q = query.trim();
    if (!q) return { rows: data.dataset, error: null as string | null };

    if (q.startsWith("/")) {
      try {
        const re = new RegExp(q.slice(1), "i");
        return {
          rows: data.dataset.filter((l) =>
            re.test(`${l.at} ${l.source} ${l.host} ${l.user} ${l.line}`),
          ),
          error: null,
        };
      } catch {
        return { rows: [], error: "Invalid regular expression" };
      }
    }

    const lower = q.toLowerCase();
    return {
      rows: data.dataset.filter((l) =>
        `${l.at} ${l.source} ${l.host} ${l.user} ${l.line}`.toLowerCase().includes(lower),
      ),
      error: null,
    };
  }, [data.dataset, query]);

  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));

  const set = (id: string, patch: { technique?: string; indicator?: string }) =>
    setAnswers((a) => ({ ...a, [id]: { ...a[id], ...patch } }));

  const complete = data.questions.filter(
    (q) => answers[q.id]?.indicator?.trim() && answers[q.id]?.technique,
  ).length;

  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
      <div>
        <Card className="mb-3 p-4">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Filter — plain text, or /regex"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-zinc-600">
              {error ? (
                <span className="text-red-400">{error}</span>
              ) : (
                <>
                  {rows.length.toLocaleString()} of {data.dataset.length.toLocaleString()} lines
                </>
              )}
            </p>
            {pages > 1 && (
              <span className="flex items-center gap-2 text-[11px] text-zinc-500">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded border border-white/10 px-2 py-0.5 disabled:opacity-30"
                >
                  ←
                </button>
                {page + 1} / {pages}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={page >= pages - 1}
                  className="rounded border border-white/10 px-2 py-0.5 disabled:opacity-30"
                >
                  →
                </button>
              </span>
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <tbody>
                {pageRows.map((l) => (
                  <tr key={l.seq} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-2 py-1.5 align-top text-zinc-600 tabular-nums">
                      {l.at}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 align-top text-zinc-500">
                      {l.host}
                    </td>
                    <td className="px-2 py-1.5 align-top leading-relaxed text-zinc-300">{l.line}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pageRows.length === 0 && !error && (
              <p className="p-6 text-center text-sm text-zinc-500">No lines match.</p>
            )}
          </div>
        </Card>
      </div>

      <div>
        <Card className="mb-3 p-4">
          <p className="text-sm text-zinc-300">
            Ten attacker behaviours are in this corpus. Nothing marks them.
          </p>
          <p className="mt-1.5 text-xs text-zinc-500">
            Finding the indicator is worth more than naming the technique — record what you find
            even if you are unsure of the mapping.
          </p>
        </Card>

        <div className="space-y-2">
          {data.questions.map((q) => {
            const a = answers[q.id] ?? {};
            const filled = a.indicator?.trim() && a.technique;
            return (
              <Card key={q.id} className={`p-4 ${filled ? "border-emerald-500/20" : ""}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge tone={filled ? "emerald" : "zinc"}>{q.tactic}</Badge>
                </div>
                <p className="mb-3 text-sm text-zinc-300">{q.prompt}</p>
                <input
                  value={a.indicator ?? ""}
                  onChange={(e) => set(q.id, { indicator: e.target.value })}
                  placeholder={q.hint}
                  className="mb-2 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                />
                <select
                  value={a.technique ?? ""}
                  onChange={(e) => set(q.id, { technique: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 focus:border-emerald-500/50 focus:outline-none"
                >
                  <option value="">— technique —</option>
                  {data.techniques.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Card>
            );
          })}
        </div>

        <div className="mt-3">
          <SubmitBar
            complete={complete}
            total={data.questions.length}
            submitting={submitting}
            onSubmit={() =>
              onSubmit({
                answers: data.questions.map((q) => ({
                  id: q.id,
                  technique: answers[q.id]?.technique,
                  indicator: answers[q.id]?.indicator?.trim(),
                })),
              })
            }
            noun="findings recorded"
          />
        </div>
      </div>
    </div>
  );
}
