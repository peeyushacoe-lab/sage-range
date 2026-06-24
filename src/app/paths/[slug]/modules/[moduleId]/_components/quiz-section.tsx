"use client";

import { useState } from "react";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER";

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[] | null;
  explanation: string | null;
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  passMark: number;
  questions: Question[];
}

interface PriorAttempt {
  score: number;
  passed: boolean;
  completedAt: Date;
}

interface Props {
  moduleId: string;
  quiz: Quiz;
  priorAttempt: PriorAttempt | null;
}

interface QuizResult {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  answers: Record<string, { correct: boolean; explanation: string | null }>;
}

export function QuizSection({ moduleId, quiz, priorAttempt }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAnswer = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const toggleMultiSelect = (questionId: string, option: string) => {
    const current = (answers[questionId] as string[]) ?? [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setAnswer(questionId, next);
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/modules/${moduleId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quizId: quiz.id, answers }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to submit quiz");
        return;
      }
      const data: QuizResult = await res.json();
      setResult(data);
    } catch {
      setError("Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="space-y-6">
        <div className={`rounded-xl border p-6 text-center ${result.passed ? "border-sage-500/40 bg-sage-500/5" : "border-red-500/30 bg-red-500/5"}`}>
          <p className={`text-4xl font-bold mb-1 ${result.passed ? "text-sage-400" : "text-red-400"}`}>
            {result.score}%
          </p>
          <p className="text-zinc-400 text-sm mb-2">
            {result.correct} / {result.total} correct · Pass mark {quiz.passMark}%
          </p>
          <p className={`text-sm font-semibold ${result.passed ? "text-sage-400" : "text-red-400"}`}>
            {result.passed ? "Passed ✓" : "Not passed — review the material and try again"}
          </p>
        </div>

        <div className="space-y-4">
          {quiz.questions.map((q) => {
            const fb = result.answers[q.id];
            if (!fb) return null;
            return (
              <div key={q.id} className={`rounded-xl border p-4 ${fb.correct ? "border-sage-500/30" : "border-red-500/30"}`}>
                <p className="text-sm font-medium mb-1">{q.question}</p>
                <p className={`text-xs ${fb.correct ? "text-sage-400" : "text-red-400"}`}>
                  {fb.correct ? "Correct" : "Incorrect"}
                </p>
                {fb.explanation && (
                  <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-white/8">{fb.explanation}</p>
                )}
              </div>
            );
          })}
        </div>

        {!result.passed && (
          <button
            onClick={() => { setResult(null); setAnswers({}); }}
            className="w-full rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-zinc-300 hover:border-sage-500/40 hover:text-sage-500 transition"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {priorAttempt && (
        <div className={`rounded-xl border p-4 text-sm ${priorAttempt.passed ? "border-sage-500/30 bg-sage-500/5 text-sage-400" : "border-white/8 text-zinc-400"}`}>
          Previous attempt: {priorAttempt.score}% — {priorAttempt.passed ? "Passed ✓" : "Not passed"}
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-1">{quiz.title}</h3>
        {quiz.description && <p className="text-sm text-zinc-400 mb-6">{quiz.description}</p>}
      </div>

      <div className="space-y-8">
        {quiz.questions.map((q, idx) => (
          <div key={q.id}>
            <p className="text-sm font-medium mb-3">
              <span className="text-zinc-500 mr-2">{idx + 1}.</span>
              {q.question}
            </p>

            {q.type === "MULTIPLE_CHOICE" && q.options && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswer(q.id, opt)}
                      className="accent-sage-500"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-white transition">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "TRUE_FALSE" && (
              <div className="space-y-2">
                {["True", "False"].map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name={q.id}
                      value={opt.toLowerCase()}
                      checked={answers[q.id] === opt.toLowerCase()}
                      onChange={() => setAnswer(q.id, opt.toLowerCase())}
                      className="accent-sage-500"
                    />
                    <span className="text-sm text-zinc-300 group-hover:text-white transition">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "MULTIPLE_SELECT" && q.options && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-500 mb-1">Select all that apply</p>
                {q.options.map((opt) => {
                  const selected = ((answers[q.id] as string[]) ?? []).includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleMultiSelect(q.id, opt)}
                        className="accent-sage-500"
                      />
                      <span className="text-sm text-zinc-300 group-hover:text-white transition">{opt}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {q.type === "SHORT_ANSWER" && (
              <textarea
                value={(answers[q.id] as string) ?? ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
                rows={4}
                placeholder="Write your answer..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/50 resize-none"
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-sage-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-sage-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Submitting…" : "Submit Quiz"}
      </button>
    </div>
  );
}
