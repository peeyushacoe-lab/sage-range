"use client";

import { useState } from "react";
import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import { NoCopy } from "@/components/ui/no-copy";

type Option = { id: string; text: string };
type Question = { id: string; type: string; question: string; options: Option[] | null; explanation: string };
type Quiz = { id: string; title: string; description: string; passMark: number; questions: Question[] };

export function QuizClient({ courseSlug, courseTitle, quiz, lastAttempt }: {
  courseSlug: string;
  courseTitle: string;
  quiz: Quiz;
  lastAttempt: { score: number; passed: boolean } | null;
}) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [fillText, setFillText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; correct: number; total: number; xpEarned: number } | null>(null);

  function setAnswer(qId: string, val: unknown) {
    setAnswers(a => ({ ...a, [qId]: val }));
  }

  function toggleSelect(qId: string, optId: string) {
    const cur = (answers[qId] as string[] | undefined) ?? [];
    const next = cur.includes(optId) ? cur.filter(x => x !== optId) : [...cur, optId];
    setAnswer(qId, next);
  }

  async function submit() {
    setSubmitting(true);
    const payload = quiz.questions.map(q => ({
      questionId: q.id,
      answer: q.type === "FILL_BLANK" ? fillText[q.id] ?? "" : answers[q.id] ?? null,
    }));
    const res = await fetch(`/api/academy/quiz/${quiz.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    if (res.ok) {
      const data = await res.json() as { score: number; passed: boolean; correct: number; total: number; xpEarned: number };
      setResult(data);
    }
    setSubmitting(false);
  }

  if (result) {
    return (
      <div className="min-h-screen bg-surface-0 text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6 ${result.passed ? "bg-ok-wash text-ok border-2 border-ok-edge" : "bg-danger-wash text-danger border-2 border-danger-edge"}`}>
            {result.score}%
          </div>
          <h1 className="text-2xl font-bold mb-2">{result.passed ? "Quiz Passed!" : "Not quite"}</h1>
          <p className="text-ink-2 text-sm mb-3">
            {result.correct} of {result.total} correct · Pass mark: {quiz.passMark}%
          </p>
          {result.xpEarned !== 0 && (
            <p className={`text-sm font-bold mb-8 ${result.xpEarned > 0 ? "text-warn" : "text-danger"}`}>
              {result.xpEarned > 0 ? `+${result.xpEarned}` : result.xpEarned} XP
            </p>
          )}
          {result.xpEarned === 0 && <div className="mb-8" />}
          <div className="flex gap-3 justify-center">
            <Link href={`/academy/${courseSlug}`} className="text-sm text-ink-2 border border-edge px-4 py-2 rounded-xl hover:text-white transition">
              Back to Course
            </Link>
            {!result.passed && (
              <button onClick={() => { setResult(null); setAnswers({}); setFillText({}); }} className="bg-surface-3 hover:bg-surface-3 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/academy/${courseSlug}`} className="text-xs text-ink-3 hover:text-ink-2 transition">← {courseTitle}</Link>
          <div className="flex items-center gap-3">
            <Link href="/academy" className="text-[11px] text-ink-3 hover:text-ink-2 transition">Academy</Link>
            <Link href="/dashboard" className="text-[11px] text-ink-3 hover:text-ok transition border border-edge rounded px-2 py-0.5">Vault</Link>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-1">{quiz.title}</h1>
        <p className="text-ink-3 text-sm mb-2">{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} · Pass at {quiz.passMark}%</p>
        {lastAttempt && (
          <p className="text-xs text-ink-3 mb-8">
            Last attempt: {lastAttempt.score}% ({lastAttempt.passed ? "passed" : "failed"})
          </p>
        )}
        {quiz.description && <p className="text-ink-2 text-sm mb-8">{quiz.description}</p>}

        <div className="space-y-8">
          {quiz.questions.map((q, i) => (
            <NoCopy key={q.id} className="rounded-xl border border-edge bg-surface-1 p-5">
              <p className="text-xs text-ink-3 mb-2">{i + 1} of {quiz.questions.length}</p>
              <p className="font-semibold text-ink mb-4 leading-relaxed">{q.question}</p>

              {q.type === "MULTIPLE_CHOICE" && q.options && (
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <label key={opt.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${answers[q.id] === opt.id ? "border-ok-edge bg-ok-wash" : "border-edge hover:border-edge-strong"}`}>
                      <input type="radio" name={q.id} value={opt.id} checked={answers[q.id] === opt.id} onChange={() => setAnswer(q.id, opt.id)} className="sr-only" />
                      <span className={`w-4 h-4 rounded-full border flex-shrink-0 ${answers[q.id] === opt.id ? "border-ok-edge bg-ok-wash" : "border-edge-strong"}`} />
                      <span className="text-sm text-ink-2">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "MULTIPLE_SELECT" && q.options && (
                <div className="space-y-2">
                  {q.options.map(opt => {
                    const sel = (answers[q.id] as string[] | undefined)?.includes(opt.id) ?? false;
                    return (
                      <label key={opt.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${sel ? "border-ok-edge bg-ok-wash" : "border-edge hover:border-edge-strong"}`}>
                        <input type="checkbox" checked={sel} onChange={() => toggleSelect(q.id, opt.id)} className="sr-only" />
                        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${sel ? "border-ok-edge bg-accent-fill text-white" : "border-edge-strong"}`}>{sel ? <Icon name="check" size={11} /> : ""}</span>
                        <span className="text-sm text-ink-2">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "TRUE_FALSE" && (
                <div className="flex gap-3">
                  {["true", "false"].map(v => (
                    <label key={v} className={`flex items-center gap-2 rounded-lg border px-5 py-2.5 cursor-pointer transition capitalize ${answers[q.id] === v ? "border-ok-edge bg-ok-wash text-ok" : "border-edge text-ink-2 hover:border-edge-strong"}`}>
                      <input type="radio" name={q.id} value={v} checked={answers[q.id] === v} onChange={() => setAnswer(q.id, v)} className="sr-only" />
                      <span className="text-sm font-medium">{v}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "FILL_BLANK" && (
                <input
                  value={fillText[q.id] ?? ""}
                  onChange={e => setFillText(p => ({ ...p, [q.id]: e.target.value }))}
                  className="w-full bg-surface-1 border border-edge rounded-lg px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-ok-edge"
                  placeholder="Your answer…"
                />
              )}
            </NoCopy>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={() => void submit()}
            disabled={submitting}
            className="w-full bg-ok hover:bg-ok-wash disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
          >
            {submitting ? "Submitting…" : "Submit Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
