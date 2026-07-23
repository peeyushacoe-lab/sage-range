"use client";

import { useState } from "react";
import Link from "next/link";

type Lesson = { id: string; title: string; summary: string; order: number; published: boolean; durationMin: number; blockCount: number; cardCount: number };
type QuizQuestion = { id: string; type: string; question: string; options: unknown; correctAnswer: unknown; explanation: string; order: number };
type Quiz = { id: string; title: string; description: string; passMark: number; questions: QuizQuestion[] };

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700";
const QTYPES = ["MULTIPLE_CHOICE","MULTIPLE_SELECT","FILL_BLANK","TRUE_FALSE","MATCH_PAIRS"];

export function ModuleLessonsClient({ courseId, courseTitle, module: initMod, lessons: initLessons, quiz: initQuiz }: {
  courseId: string; courseTitle: string;
  module: { id: string; title: string; description: string; order: number; published: boolean };
  lessons: Lesson[];
  quiz: Quiz | null;
}) {
  const [mod, setMod] = useState(initMod);
  const [modStatus, setModStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [lessons, setLessons] = useState(initLessons);
  const [newLesson, setNewLesson] = useState({ title: "", summary: "", durationMin: 5 });
  const [addingLesson, setAddingLesson] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(initQuiz);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [newQ, setNewQ] = useState({ type: "MULTIPLE_CHOICE", question: "", optionsText: "", correctAnswer: "", explanation: "" });
  const [addingQ, setAddingQ] = useState(false);

  async function saveMod() {
    setModStatus("saving");
    const res = await fetch(`/api/admin/academy/modules/${mod.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mod),
    });
    setModStatus(res.ok ? "saved" : "error");
  }

  async function addLesson() {
    if (!newLesson.title.trim()) return;
    setAddingLesson(true);
    const order = lessons.length;
    const res = await fetch(`/api/admin/academy/modules/${mod.id}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newLesson, order, durationMin: Number(newLesson.durationMin) }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      setLessons(l => [...l, { id: data.id, ...newLesson, durationMin: Number(newLesson.durationMin), order, published: false, blockCount: 0, cardCount: 0 }]);
      setNewLesson({ title: "", summary: "", durationMin: 5 });
    }
    setAddingLesson(false);
  }

  async function deleteLesson(id: string) {
    if (!confirm("Delete this lesson and all its content?")) return;
    await fetch(`/api/admin/academy/lessons/${id}`, { method: "DELETE" });
    setLessons(l => l.filter(x => x.id !== id));
  }

  async function createQuiz() {
    setCreatingQuiz(true);
    const res = await fetch(`/api/admin/academy/modules/${mod.id}/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `${mod.title} Quiz`, passMark: 70 }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      setQuiz({ id: data.id, title: `${mod.title} Quiz`, description: "", passMark: 70, questions: [] });
    }
    setCreatingQuiz(false);
  }

  function parseOptions(text: string): { id: string; text: string }[] {
    return text.split("\n").map((t, i) => ({ id: String(i), text: t.trim() })).filter(o => o.text);
  }

  async function addQuestion() {
    if (!quiz || !newQ.question.trim()) return;
    setAddingQ(true);
    const opts = ["MULTIPLE_CHOICE","MULTIPLE_SELECT","MATCH_PAIRS"].includes(newQ.type) ? parseOptions(newQ.optionsText) : null;
    const ca = newQ.type === "MULTIPLE_SELECT" ? newQ.correctAnswer.split(",").map(s => s.trim()) : newQ.correctAnswer.trim();
    const order = quiz.questions.length;
    const res = await fetch(`/api/admin/academy/quiz/${quiz.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: newQ.type, question: newQ.question, options: opts, correctAnswer: ca, explanation: newQ.explanation || undefined, order }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      setQuiz(q => q ? { ...q, questions: [...q.questions, { id: data.id, type: newQ.type, question: newQ.question, options: opts, correctAnswer: ca, explanation: newQ.explanation, order }] } : q);
      setNewQ({ type: "MULTIPLE_CHOICE", question: "", optionsText: "", correctAnswer: "", explanation: "" });
    }
    setAddingQ(false);
  }

  async function deleteQuestion(qId: string) {
    await fetch(`/api/admin/academy/questions/${qId}`, { method: "DELETE" });
    setQuiz(q => q ? { ...q, questions: q.questions.filter(x => x.id !== qId) } : q);
  }

  return (
    <div className="p-8 space-y-10 max-w-3xl">
      <div>
        <Link href={`/admin/academy/${courseId}/edit`} className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-1 block">← {courseTitle}</Link>
        <h1 className="text-2xl font-bold text-white">{mod.title}</h1>
      </div>

      {/* Module details */}
      <Section title="Module Details">
        <div className="space-y-4">
          <Field label="Title"><input value={mod.title} onChange={e => setMod(m => ({ ...m, title: e.target.value }))} className={INPUT} /></Field>
          <Field label="Description">
            <textarea value={mod.description} onChange={e => setMod(m => ({ ...m, description: e.target.value }))} rows={2} className={`${INPUT} resize-none`} />
          </Field>
          <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
            <input type="checkbox" checked={mod.published} onChange={e => setMod(m => ({ ...m, published: e.target.checked }))} className="rounded border-zinc-700" />
            Published
          </label>
          <div className="flex items-center gap-4">
            <button onClick={() => void saveMod()} disabled={modStatus === "saving"} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
              {modStatus === "saving" ? "Saving…" : "Save Module"}
            </button>
            {modStatus === "saved" && <span className="text-xs text-emerald-400">Saved ✓</span>}
          </div>
        </div>
      </Section>

      {/* Lessons */}
      <Section title="Lessons">
        <div className="space-y-2 mb-4">
          {lessons.length === 0 && <p className="text-sm text-zinc-600 italic">No lessons yet.</p>}
          {lessons.map((l, i) => (
            <div key={l.id} className="flex items-center gap-3 bg-zinc-900/60 rounded-lg px-4 py-3 border border-white/6">
              <span className="text-xs text-zinc-600 w-5 tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{l.title}</p>
                <p className="text-xs text-zinc-600">{l.durationMin} min · {l.blockCount} block{l.blockCount !== 1 ? "s" : ""} · {l.cardCount} flashcard{l.cardCount !== 1 ? "s" : ""}</p>
              </div>
              <Link href={`/admin/academy/${courseId}/modules/${mod.id}/lessons/${l.id}/edit`} className="text-xs text-zinc-500 hover:text-emerald-400 transition">Edit</Link>
              <button onClick={() => void deleteLesson(l.id)} className="text-[10px] text-red-500/60 hover:text-red-400 transition">Remove</button>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 space-y-3">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Add Lesson</p>
          <input value={newLesson.title} onChange={e => setNewLesson(p => ({ ...p, title: e.target.value }))} className={INPUT} placeholder="Lesson title" />
          <input value={newLesson.summary} onChange={e => setNewLesson(p => ({ ...p, summary: e.target.value }))} className={INPUT} placeholder="Brief summary (optional)" />
          <div className="flex gap-3 items-center">
            <input type="number" min={1} value={newLesson.durationMin} onChange={e => setNewLesson(p => ({ ...p, durationMin: Number(e.target.value) }))} className="w-20 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
            <span className="text-xs text-zinc-600">minutes</span>
            <button onClick={() => void addLesson()} disabled={addingLesson || !newLesson.title.trim()} className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition ml-auto">
              {addingLesson ? "Adding…" : "Add Lesson"}
            </button>
          </div>
        </div>
      </Section>

      {/* Quiz */}
      <Section title="Module Quiz">
        {!quiz ? (
          <div className="text-center py-8 rounded-xl border border-white/8 bg-zinc-900/20">
            <p className="text-sm text-zinc-500 mb-4">No quiz for this module yet.</p>
            <button onClick={() => void createQuiz()} disabled={creatingQuiz} className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
              {creatingQuiz ? "Creating…" : "Create Quiz"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>{quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} · Pass mark: {quiz.passMark}%</span>
            </div>
            <div className="space-y-2">
              {quiz.questions.map((q, i) => (
                <div key={q.id} className="bg-zinc-900/60 rounded-lg px-4 py-3 border border-white/6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 mb-1">{i + 1}. {q.type.replace("_", " ")}</p>
                      <p className="text-sm text-zinc-200">{q.question}</p>
                    </div>
                    <button onClick={() => void deleteQuestion(q.id)} className="text-[10px] text-red-500/60 hover:text-red-400 transition shrink-0">Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 space-y-3">
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Add Question</p>
              <select value={newQ.type} onChange={e => setNewQ(p => ({ ...p, type: e.target.value }))} className={INPUT}>
                {QTYPES.map(t => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
              </select>
              <textarea value={newQ.question} onChange={e => setNewQ(p => ({ ...p, question: e.target.value }))} rows={2} className={`${INPUT} resize-none`} placeholder="Question text" />
              {["MULTIPLE_CHOICE","MULTIPLE_SELECT","MATCH_PAIRS"].includes(newQ.type) && (
                <textarea value={newQ.optionsText} onChange={e => setNewQ(p => ({ ...p, optionsText: e.target.value }))} rows={4} className={`${INPUT} resize-none font-mono text-xs`} placeholder={"Option A\nOption B\nOption C\nOption D"} />
              )}
              <input value={newQ.correctAnswer} onChange={e => setNewQ(p => ({ ...p, correctAnswer: e.target.value }))} className={INPUT} placeholder={newQ.type === "MULTIPLE_SELECT" ? "0,2 (indices, comma-separated)" : newQ.type === "TRUE_FALSE" ? "true or false" : "Correct answer (or option index)"} />
              <input value={newQ.explanation} onChange={e => setNewQ(p => ({ ...p, explanation: e.target.value }))} className={INPUT} placeholder="Explanation (shown after answering)" />
              <button onClick={() => void addQuestion()} disabled={addingQ || !newQ.question.trim()} className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">
                {addingQ ? "Adding…" : "Add Question"}
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono mb-4 pb-2 border-b border-white/6">{title}</h2>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
