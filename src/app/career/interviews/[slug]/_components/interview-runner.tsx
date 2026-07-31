"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, ProgressBar } from "@/components/ui";

type Question = { id: string; prompt: string; weight?: number };

type Phase = "idle" | "running" | "done";

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Timed mock interview.
 *
 * Answers are free text and are stored unscored — a reviewer grades them
 * later — so the end state here is "submitted", never a score. Claiming a
 * number the platform cannot justify would undermine the credential system.
 */
export function InterviewRunner({
  slug,
  timeLimitSec,
}: {
  slug: string;
  timeLimitSec: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(timeLimitSec);
  const [answered, setAnswered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const submittedRef = useRef(false);

  const submit = useCallback(async () => {
    if (!sessionId || submittedRef.current) return;
    submittedRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/career/interviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answers: answersRef.current }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Submission failed");
        submittedRef.current = false;
        return;
      }
      setAnswered(body?.answered ?? 0);
      setPhase("done");
      router.refresh();
    } catch {
      setError("Network error — your answers were not submitted. Try again.");
      submittedRef.current = false;
    } finally {
      setBusy(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    if (phase !== "running" || endsAt === null) return;
    const tick = () => {
      const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) void submit();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, endsAt, submit]);

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
      const res = await fetch(`/api/career/interviews/${slug}/start`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Could not start the interview");
        return;
      }
      setQuestions((body.questions ?? []) as Question[]);
      setSessionId(body.sessionId as string);
      setEndsAt(new Date(body.endsAt as string).getTime());
      submittedRef.current = false;
      setPhase("running");
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "done") {
    return (
      <Card className="p-8 text-center">
        <p className="text-lg font-semibold text-emerald-300">Interview submitted</p>
        <p className="mt-2 text-sm text-zinc-400">
          {answered} answer{answered === 1 ? "" : "s"} recorded. A reviewer will score this
          session and leave feedback — free-text answers are not auto-graded.
        </p>
        <div className="mt-6">
          <Link href="/career" className="text-sm text-zinc-400 hover:text-emerald-400">
            ← Back to Career
          </Link>
        </div>
      </Card>
    );
  }

  if (phase === "idle") {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-zinc-400">
          {Math.round(timeLimitSec / 60)} minutes, answered in your own words. Answers are
          reviewed by a person rather than auto-graded, so explain your reasoning as you
          would in a real interview.
        </p>
        <div className="mt-6">
          <Button onClick={start} disabled={busy}>
            {busy ? "Starting…" : "Start interview"}
          </Button>
        </div>
        {error && <p className="mt-4 text-xs text-red-400">{error}</p>}
      </Card>
    );
  }

  const answeredCount = questions.filter((q) => (answers[q.id] ?? "").trim().length > 0).length;
  const low = remaining <= 120;

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
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-zinc-200">
                <span className="mr-2 font-mono text-xs text-zinc-600">{qi + 1}.</span>
                {q.prompt}
              </p>
              {q.weight != null && (
                <span className="shrink-0 font-mono text-[10px] text-zinc-600">
                  weight {q.weight}
                </span>
              )}
            </div>
            <textarea
              className="min-h-[140px] w-full rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
              placeholder="Talk through your approach…"
              value={answers[q.id] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
              }
            />
          </Card>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-xs text-zinc-600">Blank answers are not recorded.</p>
        <Button onClick={submit} disabled={busy}>
          {busy ? "Submitting…" : "Submit interview"}
        </Button>
      </div>
    </div>
  );
}
