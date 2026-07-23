"use client";

import { useState } from "react";
import Link from "next/link";

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
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-6 ${result.passed ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40" : "bg-red-500/20 text-red-400 border-2 border-red-500/40"}`}>
            {result.score}%
          </div>
          <h1 className="text-2xl font-bold mb-2">{result.passed ? "Quiz Passed!" : "Not quite"}</h1>
          <p className="text-zinc-400 text-sm mb-3">
            {result.correct} of {result.total} correct · Pass mark: {quiz.passMark}%
          </p>
          {result.xpEarned !== 0 && (
            <p className={`text-sm font-bold mb-8 ${result.xpEarned > 0 ? "text-amber-400" : "text-red-400"}`}>
              {result.xpEarned > 0 ? `+${result.xpEarned}` : result.xpEarned} XP
            </p>
          )}
          {result.xpEarned === 0 && <div className="mb-8" />}
          <div className="flex gap-3 justify-center">
            <Link href={`/academy/${courseSlug}`} className="text-sm text-zinc-400 border border-white/10 px-4 py-2 rounded-xl hover:text-white transition">
              Back to Course
            </Link>
            {!result.passed && (
              <button onClick={() => { setResult(null); setAnswers({}); setFillText({}); }} className="bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link href={`/academy/${courseSlug}`} className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-6 block">← {courseTitle}</Link>

        <h1 className="text-2xl font-bold mb-1">{quiz.title}</h1>
        <p className="text-zinc-500 text-sm mb-2">{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} · Pass at {quiz.passMark}%</p>
        {lastAttempt && (
          <p className="text-xs text-zinc-600 mb-8">
            Last attempt: {lastAttempt.score}% ({lastAttempt.passed ? "passed" : "failed"})
          </p>
        )}
        {quiz.description && <p className="text-zinc-400 text-sm mb-8">{quiz.description}</p>}

        <div className="space-y-8">
          {quiz.questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
              <p className="text-xs text-zinc-500 mb-2">{i + 1} of {quiz.questions.length}</p>
              <p className="font-semibold text-zinc-200 mb-4 leading-relaxed">{q.question}</p>

              {q.type === "MULTIPLE_CHOICE" && q.options && (
                <div className="space-y-2">
                  {q.options.map(opt => (
                    <label key={opt.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${answers[q.id] === opt.id ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/8 hover:border-white/20"}`}>
                      <input type="radio" name={q.id} value={opt.id} checked={answers[q.id] === opt.id} onChange={() => setAnswer(q.id, opt.id)} className="sr-only" />
                      <span className={`w-4 h-4 rounded-full border flex-shrink-0 ${answers[q.id] === opt.id ? "border-emerald-500 bg-emerald-500" : "border-zinc-600"}`} />
                      <span className="text-sm text-zinc-300">{opt.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === "MULTIPLE_SELECT" && q.options && (
                <div className="space-y-2">
                  {q.options.map(opt => {
                    const sel = (answers[q.id] as string[] | undefined)?.includes(opt.id) ?? false;
                    return (
                      <label key={opt.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${sel ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/8 hover:border-white/20"}`}>
                        <input type="checkbox" checked={sel} onChange={() => toggleSelect(q.id, opt.id)} className="sr-only" />
                        <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${sel ? "border-emerald-500 bg-emerald-500 text-black" : "border-zinc-600"}`}>{sel ? "✓" : ""}</span>
                        <span className="text-sm text-zinc-300">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.type === "TRUE_FALSE" && (
                <div className="flex gap-3">
                  {["true", "false"].map(v => (
                    <label key={v} className={`flex items-center gap-2 rounded-lg border px-5 py-2.5 cursor-pointer transition capitalize ${answers[q.id] === v ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-white/8 text-zinc-400 hover:border-white/20"}`}>
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
                  className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50"
                  placeholder="Your answer…"
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={() => void submit()}
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
          >
            {submitting ? "Submitting…" : "Submit Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
