"use client";

import { useState, useMemo } from "react";

type Event = { id: string; raw: string; fields: Record<string, string> };
type Step = { step: number; narrative: string; events: Event[] };
type Condition = { field: string; operator: string; value: string };

type EvalResponse = {
  precision: number;
  recall: number;
  f1: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  passed: boolean;
  isLastStep: boolean;
  completed: boolean;
  awardedPoints: number;
  matched: { id: string; isMalicious: boolean }[];
};

const FIELDS = ["host", "user", "process", "parent", "commandline"];
const OPERATORS: { value: string; label: string }[] = [
  { value: "equals", label: "equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "starts_with", label: "starts with" },
];

export function PurpleTeamClient({
  replayId,
  title,
  description,
  points,
  steps,
  initialStep,
  completed: initialCompleted,
  bestF1,
}: {
  replayId: string;
  title: string;
  description: string;
  points: number;
  steps: Step[];
  initialStep: number;
  completed: boolean;
  bestF1: number;
}) {
  const [currentStep, setCurrentStep] = useState(Math.min(initialStep, steps.length));
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<Condition[]>([{ field: "process", operator: "equals", value: "" }]);
  const [result, setResult] = useState<EvalResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(initialCompleted);

  const visibleEvents = useMemo(
    () => steps.filter((s) => s.step <= currentStep).flatMap((s) => s.events),
    [steps, currentStep]
  );
  const currentNarrative = steps.find((s) => s.step === currentStep)?.narrative ?? "";
  const isLastStep = currentStep === steps.length;

  function updateCondition(idx: number, patch: Partial<Condition>) {
    setConditions((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function addCondition() {
    setConditions((cs) => [...cs, { field: "process", operator: "equals", value: "" }]);
  }
  function removeCondition(idx: number) {
    setConditions((cs) => cs.filter((_, i) => i !== idx));
  }

  async function evaluate(finalize: boolean) {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/purple-team/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replayId, step: currentStep, rule: { logic, conditions }, finalize }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error === "empty_rule" ? "Add at least one condition first." : "Something went wrong.");
        return;
      }
      setResult(data);
      if (data.completed) setCompleted(true);
    } finally {
      setSubmitting(false);
    }
  }

  const matchedById = new Map((result?.matched ?? []).map((m) => [m.id, m.isMalicious]));

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-zinc-400 mt-2 max-w-3xl leading-relaxed">{description}</p>
        <p className="text-xs font-mono text-zinc-500 mt-2">
          {points} pts · step {currentStep}/{steps.length}
          {completed && <span className="text-sage-400 ml-2">✓ completed (best F1 {bestF1.toFixed(2)})</span>}
        </p>
      </header>

      <div className="rounded-xl border border-sage-500/20 bg-sage-500/5 p-4 mb-6">
        <p className="text-xs uppercase tracking-widest text-sage-500 mb-1">Step {currentStep} of {steps.length}</p>
        <p className="text-sm text-zinc-300">{currentNarrative}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">
        <div className="rounded-xl border border-white/8 bg-zinc-900/40 overflow-hidden">
          <div className="border-b border-white/8 p-3">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Events revealed so far ({visibleEvents.length})</p>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-white/5">
            {visibleEvents.map((e) => {
              const label = matchedById.get(e.id);
              return (
                <div key={e.id} className={`p-3 text-xs font-mono ${label === true ? "bg-sage-500/5" : label === false ? "bg-red-500/5" : ""}`}>
                  <p className="text-zinc-300 whitespace-pre-wrap break-all">{e.raw}</p>
                  {label !== undefined && (
                    <p className={`mt-1 font-semibold ${label ? "text-sage-400" : "text-red-400"}`}>
                      {label ? "✓ correctly matched (malicious)" : "✗ matched, but this one was benign"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Your Rule</p>
              <div className="flex rounded-lg border border-white/10 overflow-hidden">
                {(["AND", "OR"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLogic(l)}
                    className={`px-3 py-1 text-xs font-semibold ${logic === l ? "bg-sage-500 text-black" : "text-zinc-400 hover:bg-white/5"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value })} className="rounded-md bg-zinc-950 border border-white/10 px-2 py-1.5 text-xs text-zinc-200">
                    {FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value })} className="rounded-md bg-zinc-950 border border-white/10 px-2 py-1.5 text-xs text-zinc-200">
                    {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input value={c.value} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder="value" className="flex-1 min-w-0 rounded-md bg-zinc-950 border border-white/10 px-2 py-1.5 text-xs text-zinc-100 font-mono" />
                  <button onClick={() => removeCondition(i)} disabled={conditions.length === 1} className="text-zinc-600 hover:text-red-400 disabled:opacity-30 px-1">✕</button>
                </div>
              ))}
            </div>
            <button onClick={addCondition} className="mt-3 text-xs text-sage-500 hover:text-sage-400">+ Add condition</button>

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => evaluate(false)}
                disabled={submitting}
                className="flex-1 rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:border-white/30 transition disabled:opacity-50"
              >
                {submitting ? "…" : "Evaluate"}
              </button>
              {!isLastStep ? (
                <button
                  onClick={() => { setCurrentStep((s) => Math.min(s + 1, steps.length)); setResult(null); }}
                  className="flex-1 rounded-lg bg-sage-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition"
                >
                  Next Step →
                </button>
              ) : (
                <button
                  onClick={() => evaluate(true)}
                  disabled={submitting || completed}
                  className="flex-1 rounded-lg bg-sage-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-50"
                >
                  {completed ? "Completed" : "Finalize Replay"}
                </button>
              )}
            </div>
          </div>

          {result && (
            <div className={`rounded-xl border p-4 ${result.passed ? "border-sage-500/40 bg-sage-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              <p className={`text-sm font-bold mb-2 ${result.passed ? "text-sage-400" : "text-amber-400"}`}>
                {result.awardedPoints > 0 ? `Replay complete — ${result.awardedPoints} pts` : result.passed ? "Passing at this step" : "Not passing yet"}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div><p className="text-zinc-500">Precision</p><p className="text-zinc-100 font-bold">{Math.round(result.precision * 100)}%</p></div>
                <div><p className="text-zinc-500">Recall</p><p className="text-zinc-100 font-bold">{Math.round(result.recall * 100)}%</p></div>
                <div><p className="text-zinc-500">F1</p><p className="text-zinc-100 font-bold">{result.f1.toFixed(2)}</p></div>
              </div>
              <div className="mt-3 text-xs text-zinc-500 font-mono flex justify-between">
                <span>TP {result.truePositives}</span>
                <span>FP {result.falsePositives}</span>
                <span>FN {result.falseNegatives}</span>
                <span>TN {result.trueNegatives}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
