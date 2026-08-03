"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

type Step = {
  title: string;
  body: string;
  evidence?: { label: string; code: string; language?: string };
  insight?: string;
};

/**
 * A guided investigation the learner advances a step at a time.
 *
 * The pacing of a lecture, with the clock in the learner's hands. Evidence
 * accumulates on screen rather than replacing itself, so by the last step the
 * whole picture is visible at once — which is the point being taught, and the
 * thing a video cannot leave on the screen for you.
 */
export function WalkthroughBlock({ content }: { content: Record<string, unknown> }) {
  const title = String(content.title ?? "Walkthrough");
  const intro = String(content.intro ?? "");
  const steps = (content.steps as Step[] | undefined) ?? [];

  const [current, setCurrent] = useState(0);
  const atEnd = current >= steps.length - 1;

  if (steps.length === 0) return null;

  const step = steps[current];
  const revealed = steps.slice(0, current + 1);

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] overflow-hidden">
      <div className="px-5 py-3 border-b border-cyan-500/15 flex items-center gap-2">
        <Icon name="search" size={14} className="text-cyan-400 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
          Guided investigation
        </span>
        <span className="ml-auto text-[10px] text-zinc-500 tabular-nums shrink-0">
          Step {current + 1} of {steps.length}
        </span>
      </div>

      <div className="px-5 py-4">
        <h4 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h4>
        {intro && <p className="text-xs text-zinc-500 leading-relaxed mb-4">{intro}</p>}

        {/* Step markers — a learner can jump back without losing their place. */}
        <div className="flex items-center gap-1 mb-5">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              title={s.title}
              aria-label={`Step ${i + 1}: ${s.title}`}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < current
                  ? "bg-cyan-500/50"
                  : i === current
                    ? "bg-cyan-400"
                    : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Current step */}
        <div key={current} className="animate-step-in">
          <p className="text-[11px] text-cyan-500/70 uppercase tracking-wider font-mono mb-1">
            {String(current + 1).padStart(2, "0")}
          </p>
          <h5 className="text-[15px] font-semibold text-zinc-100 mb-2">{step.title}</h5>
          <p className="text-sm text-zinc-400 leading-relaxed">{step.body}</p>

          {step.insight && (
            <div className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/8 px-4 py-3">
              <p className="text-[10px] text-amber-500/80 uppercase tracking-wider mb-1">
                What changed
              </p>
              <p className="text-xs text-amber-200/90 leading-relaxed">{step.insight}</p>
            </div>
          )}
        </div>

        {/* Evidence gathered so far */}
        {revealed.some((s) => s.evidence) && (
          <div className="mt-5 space-y-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Evidence on the table
            </p>
            {revealed.map((s, i) =>
              s.evidence ? (
                <div
                  key={i}
                  className={`rounded-lg border overflow-hidden transition-opacity ${
                    i === current
                      ? "border-cyan-500/30 bg-zinc-900"
                      : "border-white/6 bg-zinc-900/50 opacity-60"
                  }`}
                >
                  <div className="px-3 py-1.5 border-b border-white/6 flex items-center justify-between">
                    <span className="text-[10px] text-zinc-500 font-mono">{s.evidence.label}</span>
                    {i === current && (
                      <span className="text-[9px] text-cyan-400 uppercase tracking-wider">new</span>
                    )}
                  </div>
                  <pre className="px-3 py-2 text-[11px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">
                    <code>{s.evidence.code}</code>
                  </pre>
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-cyan-500/15 flex items-center justify-between">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          disabled={current === 0}
          className="text-[11px] text-zinc-500 hover:text-zinc-200 disabled:opacity-25 disabled:hover:text-zinc-500 transition"
        >
          ← Back
        </button>

        {!atEnd ? (
          <button
            onClick={() => setCurrent((c) => Math.min(steps.length - 1, c + 1))}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold px-4 py-1.5 rounded-lg transition"
          >
            Next step →
          </button>
        ) : (
          <button
            onClick={() => setCurrent(0)}
            className="text-[11px] text-zinc-500 hover:text-cyan-400 transition"
          >
            Start over
          </button>
        )}
      </div>

      <style>{`
        @keyframes step-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-step-in { animation: step-in 0.25s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .animate-step-in { animation: none; }
        }
      `}</style>
    </div>
  );
}
