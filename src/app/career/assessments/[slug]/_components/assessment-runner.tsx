"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Button, ProgressBar } from "@/components/ui";

type Question = {
  id: string;
  prompt: string;
  type: "SINGLE" | "MULTI" | "TEXT";
  options?: string[];
};

type Result = {
  score: number;
  passed: boolean;
  credentialCode?: string;
};

type Phase = "idle" | "running" | "done";

/** Answer shapes mirror the grader: index, index list, or free text. */
type Answer = number | number[] | string;

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function AssessmentRunner({
  slug,
  timeLimitSec,
  passingScore,
}: {
  slug: string;
  timeLimitSec: number;
  passingScore: number;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(timeLimitSec);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Integrity signal: how often the candidate left the tab mid-attempt. Sent
  // with the submission for the reviewer to weigh; it never blocks grading.
  const blurCount = useRef(0);

  // A ref mirrors the latest answers so the expiry auto-submit sends what is
  // on screen — a timer callback would otherwise close over the first render.
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  const submit = useCallback(
    async (auto: boolean) => {
      if (!attemptId || submittedRef.current) return;
      submittedRef.current = true;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/career/assessments/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId,
            responses: answersRef.current,
            proctorFlags: { tabBlurs: blurCount.current, autoSubmitted: auto },
          }),
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          setError(body?.error ?? "Submission failed");
          submittedRef.current = false;
          return;
        }
        setResult(body as Result);
        setPhase("done");
      } catch {
        setError("Network error — your answers were not submitted. Try again.");
        submittedRef.current = false;
      } finally {
        setBusy(false);
      }
    },
    [attemptId],
  );

  // Countdown. Deadline comes from the server so a clock skew or a page
  // refresh cannot extend the attempt.
  useEffect(() => {
    if (phase !== "running" || endsAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) void submit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, endsAt, submit]);

  useEffect(() => {
    if (phase !== "running") return;
    const onBlur = () => { blurCount.current += 1; };
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [phase]);

  // Guard against losing an in-progress attempt to a stray navigation.
  useEffect(() => {
    if (phase !== "running") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/career/assessments/${slug}/start`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Could not start the assessment");
        return;
      }
      setQuestions((body.questions ?? []) as Question[]);
      setAttemptId(body.attemptId as string);
      setEndsAt(new Date(body.endsAt as string).getTime());
      submittedRef.current = false;
      setPhase("running");
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  function setAnswer(id: string, value: Answer) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, index: number) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[id]) ? (prev[id] as number[]) : [];
      const next = current.includes(index)
        ? current.filter((i) => i !== index)
        : [...current, index];
      return { ...prev, [id]: next };
    });
  }

  // ── Result ───────────────────────────────────────────────────────────────
  if (phase === "done" && result) {
    return (
      <Card className="p-8 text-center">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">Result</p>
        <p
          className={`mt-2 font-mono text-6xl font-black tabular-nums ${
            result.passed ? "text-emerald-400" : "text-red-400"
          }`}
        >
          {result.score}%
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          {result.passed
            ? "Passed — credential issued."
            : `Not passed. ${passingScore}% is required.`}
        </p>

        {result.credentialCode && (
          <div className="mt-6 inline-block rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Credential code
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
              {result.credentialCode}
            </p>
            <Link
              href={`/career/credentials/${result.credentialCode}`}
              className="mt-2 block text-xs text-emerald-400 hover:underline"
            >
              View public verification page →
            </Link>
          </div>
        )}

        <p className="mt-6 text-xs text-zinc-600">
          Free-text questions, if any, are excluded from this score and await review.
        </p>

        <div className="mt-6">
          <Link href="/career" className="text-sm text-zinc-400 hover:text-emerald-400">
            ← Back to Career
          </Link>
        </div>
      </Card>
    );
  }

  // ── Intro ────────────────────────────────────────────────────────────────
  if (phase === "idle") {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-zinc-400">
          Once started, the clock runs for {Math.round(timeLimitSec / 60)} minutes and does
          not pause. Leaving the page is recorded but will not stop your attempt.
        </p>
        <div className="mt-6">
          <Button onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Start assessment"}
          </Button>
        </div>
        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
      </Card>
    );
  }

  // ── Running ──────────────────────────────────────────────────────────────
  const answeredCount = questions.filter((q) => {
    const a = answers[q.id];
    if (a === undefined) return false;
    if (Array.isArray(a)) return a.length > 0;
    if (typeof a === "string") return a.trim().length > 0;
    return true;
  }).length;

  const low = remaining <= 60;

  return (
    <div>
      <div className="sticky top-0 z-20 -mx-6 mb-6 border-b border-white/8 bg-zinc-950/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-zinc-500">
            {answeredCount} of {questions.length} answered
          </span>
          <span
            className={`font-mono text-lg font-bold tabular-nums ${
              low ? "animate-pulse text-red-400" : "text-zinc-200"
            }`}
          >
            {formatClock(remaining)}
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar
            value={questions.length ? (answeredCount / questions.length) * 100 : 0}
          />
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <Card key={q.id} className="p-5">
            <p className="mb-3 text-sm font-medium text-zinc-200">
              <span className="mr-2 font-mono text-xs text-zinc-600">{qi + 1}.</span>
              {q.prompt}
            </p>

            {q.type === "TEXT" ? (
              <textarea
                className="min-h-[120px] w-full rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                placeholder="Your answer…"
                value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
              />
            ) : (
              <div className="space-y-2">
                {(q.options ?? []).map((opt, oi) => {
                  const selected =
                    q.type === "SINGLE"
                      ? answers[q.id] === oi
                      : Array.isArray(answers[q.id]) &&
                        (answers[q.id] as number[]).includes(oi);
                  return (
                    <label
                      key={oi}
                      className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                        selected
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                          : "border-white/8 text-zinc-300 hover:border-white/20"
                      }`}
                    >
                      <input
                        type={q.type === "SINGLE" ? "radio" : "checkbox"}
                        name={q.id}
                        checked={selected}
                        onChange={() =>
                          q.type === "SINGLE" ? setAnswer(q.id, oi) : toggleMulti(q.id, oi)
                        }
                        className="accent-emerald-500"
                      />
                      {opt}
                    </label>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-600">
          Unanswered questions are marked incorrect.
        </p>
        <Button onClick={() => submit(false)} disabled={busy}>
          {busy ? "Submitting…" : "Submit assessment"}
        </Button>
      </div>
    </div>
  );
}
