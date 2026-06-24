"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type QuestionType = "MULTIPLE_CHOICE" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER";

interface Question {
  id?: string;
  type: QuestionType;
  question: string;
  options: string[] | null;
  correctAnswer: string | string[];
  explanation: string | null;
  order: number;
}

interface ExistingQuiz {
  id: string;
  title: string;
  description: string | null;
  passMark: number;
  questions: Question[];
}

interface Props {
  moduleId: string;
  existingQuiz: ExistingQuiz | null;
}

const BLANK_QUESTION = (): Question => ({
  type: "MULTIPLE_CHOICE",
  question: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  explanation: null,
  order: 0,
});

export function QuizBuilder({ moduleId, existingQuiz }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(existingQuiz?.title ?? "");
  const [description, setDescription] = useState(existingQuiz?.description ?? "");
  const [passMark, setPassMark] = useState(existingQuiz?.passMark ?? 70);
  const [questions, setQuestions] = useState<Question[]>(
    existingQuiz?.questions ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const addQuestion = () => {
    setQuestions((qs) => [...qs, { ...BLANK_QUESTION(), order: qs.length }]);
  };

  const updateQuestion = (idx: number, partial: Partial<Question>) => {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...partial } : q)));
  };

  const removeQuestion = (idx: number) => {
    setQuestions((qs) => qs.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i })));
  };

  const setOption = (qIdx: number, oIdx: number, value: string) => {
    setQuestions((qs) =>
      qs.map((q, i) => {
        if (i !== qIdx) return q;
        const opts = [...(q.options ?? ["", "", "", ""])];
        opts[oIdx] = value;
        return { ...q, options: opts };
      })
    );
  };

  const save = async () => {
    if (!title.trim()) { setError("Quiz title required"); return; }
    if (questions.some((q) => !q.question.trim())) { setError("All questions need text"); return; }
    setLoading(true);
    setError(null);
    try {
      const endpoint = existingQuiz
        ? `/api/admin/modules/${moduleId}/quiz`
        : `/api/admin/modules/${moduleId}/quiz`;
      const method = existingQuiz ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null, passMark, questions }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Failed"); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch { setError("Failed"); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-xl border border-white/8 p-5 space-y-6">
      {/* Quiz meta */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Quiz Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Module 1 Knowledge Check" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider block mb-1">Pass Mark (%)</label>
          <input type="number" min={0} max={100} value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, idx) => (
          <div key={idx} className="rounded-lg border border-white/8 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-zinc-500 font-mono">Q{idx + 1}</span>
              <div className="flex gap-1 flex-wrap">
                {(["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT", "SHORT_ANSWER"] as QuestionType[]).map((t) => (
                  <button key={t} onClick={() => updateQuestion(idx, { type: t, correctAnswer: t === "MULTIPLE_SELECT" ? [] : "", options: t === "TRUE_FALSE" ? ["true", "false"] : t === "SHORT_ANSWER" ? null : ["", "", "", ""] })} className={`rounded px-2 py-0.5 text-xs transition ${q.type === t ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400" : "border border-white/8 text-zinc-600 hover:text-zinc-300"}`}>
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
              <button onClick={() => removeQuestion(idx)} className="text-xs text-zinc-600 hover:text-red-400 transition ml-auto shrink-0">✕</button>
            </div>

            <textarea value={q.question} onChange={(e) => updateQuestion(idx, { question: e.target.value })} rows={2} placeholder="Question text..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50 resize-none" />

            {q.type === "MULTIPLE_CHOICE" && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-600">Options (mark correct with radio)</p>
                {(q.options ?? ["", "", "", ""]).map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${idx}`} checked={q.correctAnswer === opt && opt !== ""} onChange={() => updateQuestion(idx, { correctAnswer: opt })} className="accent-emerald-500 shrink-0" />
                    <input value={opt} onChange={(e) => setOption(idx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className="flex-1 rounded-lg border border-white/8 bg-white/5 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
                  </div>
                ))}
              </div>
            )}

            {q.type === "TRUE_FALSE" && (
              <div className="flex gap-3">
                {["true", "false"].map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name={`correct-${idx}`} checked={q.correctAnswer === opt} onChange={() => updateQuestion(idx, { correctAnswer: opt })} className="accent-emerald-500" />
                    <span className="text-sm text-zinc-300 capitalize">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === "MULTIPLE_SELECT" && (
              <div className="space-y-2">
                <p className="text-xs text-zinc-600">Options (check all correct)</p>
                {(q.options ?? ["", "", "", ""]).map((opt, oIdx) => {
                  const selected = ((q.correctAnswer as string[]) ?? []).includes(opt);
                  return (
                    <div key={oIdx} className="flex items-center gap-2">
                      <input type="checkbox" checked={selected && opt !== ""} onChange={() => {
                        const curr = (q.correctAnswer as string[]) ?? [];
                        const next = selected ? curr.filter((c) => c !== opt) : [...curr, opt];
                        updateQuestion(idx, { correctAnswer: next });
                      }} className="accent-emerald-500 shrink-0" />
                      <input value={opt} onChange={(e) => setOption(idx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} className="flex-1 rounded-lg border border-white/8 bg-white/5 px-2 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
                    </div>
                  );
                })}
              </div>
            )}

            {q.type === "SHORT_ANSWER" && (
              <p className="text-xs text-zinc-500 italic">Short answer questions are manually reviewed by mentors.</p>
            )}

            <div>
              <label className="text-xs text-zinc-600 block mb-1">Explanation (shown after answer)</label>
              <input value={q.explanation ?? ""} onChange={(e) => updateQuestion(idx, { explanation: e.target.value || null })} placeholder="Why is this the correct answer?" className="w-full rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
        ))}
      </div>

      <button onClick={addQuestion} className="text-xs text-zinc-500 hover:text-emerald-400 border border-dashed border-white/10 hover:border-emerald-500/30 rounded-lg px-4 py-2.5 transition w-full text-left">
        + Add question
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button onClick={save} disabled={loading} className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${saved ? "bg-emerald-500/25 border border-emerald-500/40 text-emerald-400" : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"}`}>
        {loading ? "Saving…" : saved ? "Saved ✓" : existingQuiz ? "Update Quiz" : "Create Quiz"}
      </button>
    </div>
  );
}
