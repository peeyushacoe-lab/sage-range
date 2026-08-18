"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

/**
 * A construct-the-answer exercise, sitting between the reading and the quiz.
 *
 * The lesson shape was read then quiz, which only ever tests recognition. This
 * asks the learner to write the command themselves and gives feedback that
 * escalates: a count first, then one missing element, then everything. The
 * struggle before the hint is the part that teaches.
 *
 * The required elements and the worked solution stay on the server. They used
 * to be handed to this component with the page, which meant `requires` — a list
 * of every part the answer needs — was in devtools before the learner had
 * written anything. Marking happens in /api/academy/blocks/[blockId], which
 * releases the solution only once the learner has genuinely tried.
 *
 * Nothing is scored or sent anywhere for credit — practice is formative.
 * Getting it wrong four times should cost a learner nothing but time.
 */
type Feedback = {
  status: "correct" | "wrong-approach" | "incomplete" | "empty";
  message: string;
  hints: string[];
  offerSolution: boolean;
  progress: number;
  solution?: string;
  explanation?: string;
};

export function PracticeBlock({
  blockId,
  content,
}: {
  blockId: string;
  content: Record<string, unknown>;
}) {
  const task = String(content.task ?? "");
  const setup = content.setup as { label: string; code: string } | undefined;
  const requiredCount = Number(content.requiredCount ?? 0);

  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [showSolution, setShowSolution] = useState(false);
  const [checking, setChecking] = useState(false);

  const solved = feedback?.status === "correct";
  const progress = feedback?.progress ?? 0;
  const solution = feedback?.solution ?? "";
  const explanation = feedback?.explanation ?? "";

  async function submit() {
    if (solved || checking) return;
    const next = answer.trim().length === 0 ? attempts : attempts + 1;
    setAttempts(next);
    setChecking(true);
    try {
      const res = await fetch(`/api/academy/blocks/${blockId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer, attempts: next }),
      });
      if (!res.ok) return;
      setFeedback((await res.json()) as Feedback);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-emerald-500/15">
        <Icon name="tools" size={14} className="text-emerald-400 shrink-0" />
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
          Try it yourself
        </span>
        <span className="text-[10px] text-emerald-500/60">— nothing is scored here</span>
        {attempts > 0 && (
          <span className="ml-auto text-[10px] text-zinc-600 tabular-nums shrink-0">
            {attempts} attempt{attempts === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-zinc-200 leading-relaxed mb-4">{task}</p>

        {setup && (
          <div className="rounded-lg border border-white/8 bg-zinc-900 overflow-hidden mb-4">
            <div className="px-3 py-1.5 border-b border-white/6">
              <span className="text-[10px] text-zinc-500 font-mono">{setup.label}</span>
            </div>
            <pre className="px-3 py-2.5 text-[11px] text-zinc-400 font-mono leading-relaxed overflow-x-auto">
              <code>{setup.code}</code>
            </pre>
          </div>
        )}

        <div className="relative">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              // Enter submits; Shift+Enter is a newline, since some answers are
              // genuinely multi-line.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            disabled={solved}
            rows={2}
            spellCheck={false}
            placeholder="Write your answer…"
            className={`w-full rounded-lg bg-zinc-900 border px-3 py-2.5 text-[13px] font-mono text-zinc-200 placeholder-zinc-700 resize-y focus:outline-none transition disabled:opacity-70 ${
              solved
                ? "border-emerald-500/40"
                : "border-white/8 focus:border-emerald-500/40"
            }`}
          />
          {/* How much of the required shape is present, live. Deliberately not
              itemised — the count nudges without giving the parts away. */}
          {!solved && answer.trim().length > 0 && requiredCount > 0 && (
            <div className="absolute right-2 bottom-2 flex items-center gap-1.5 pointer-events-none">
              <div className="w-14 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/60 rounded-full transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!solved && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => void submit()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
            >
              Check
            </button>
            {feedback?.offerSolution && !showSolution && (
              <button
                onClick={() => setShowSolution(true)}
                className="text-[11px] text-zinc-500 hover:text-zinc-200 transition"
              >
                Show me one that works
              </button>
            )}
            <span className="ml-auto text-[10px] text-zinc-700">Enter to check</span>
          </div>
        )}

        {feedback && (
          <div
            className={`mt-3 rounded-lg border px-4 py-3 ${
              feedback.status === "correct"
                ? "border-emerald-500/30 bg-emerald-500/8"
                : feedback.status === "empty"
                  ? "border-white/8 bg-zinc-900/60"
                  : "border-amber-500/25 bg-amber-500/8"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                feedback.status === "correct"
                  ? "text-emerald-300"
                  : feedback.status === "empty"
                    ? "text-zinc-400"
                    : "text-amber-300"
              }`}
            >
              {feedback.message}
            </p>

            {feedback.hints.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Still needs
                </span>
                {feedback.hints.map((h) => (
                  <code
                    key={h}
                    className="text-[11px] font-mono text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5"
                  >
                    {h}
                  </code>
                ))}
              </div>
            )}

            {feedback.status === "correct" && explanation && (
              <p className="text-xs text-zinc-400 leading-relaxed mt-2">{explanation}</p>
            )}
          </div>
        )}

        {showSolution && !solved && (
          <div className="mt-3 rounded-lg border border-white/8 bg-zinc-900 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-white/6">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                One answer that works
              </span>
            </div>
            <pre className="px-3 py-2.5 text-[12px] text-emerald-300 font-mono overflow-x-auto">
              <code>{solution}</code>
            </pre>
            {explanation && (
              <p className="px-3 py-2.5 border-t border-white/6 text-xs text-zinc-400 leading-relaxed">
                {explanation}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
