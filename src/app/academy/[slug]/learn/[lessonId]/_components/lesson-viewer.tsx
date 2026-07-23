"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type KCOption = { id: string; text: string };
type Block = {
  id: string;
  order: number;
  type: "TEXT" | "CODE" | "IMAGE" | "CALLOUT" | "KNOWLEDGE_CHECK";
  content: Record<string, unknown>;
};
type Flashcard = { id: string; front: string; back: string };
type Lesson = { id: string; title: string; durationMin: number; blocks: Block[]; flashcards: Flashcard[] };
type ModuleItem = { id: string; title: string; quizId: string | null; lessons: { id: string; title: string; durationMin: number; completed: boolean }[] };

export function LessonViewer({
  courseSlug, courseTitle, lesson, modules, prevLesson, next, alreadyCompleted, initialNote, userXp,
}: {
  courseSlug: string;
  courseTitle: string;
  lesson: Lesson;
  modules: ModuleItem[];
  prevLesson: { id: string; title: string } | null;
  next: { href: string; label: string } | null;
  alreadyCompleted: boolean;
  initialNote: string;
  userXp?: number;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [note, setNote] = useState(initialNote);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [xpBurst, setXpBurst] = useState<number | null>(null);
  const [currentXp, setCurrentXp] = useState(userXp ?? 0);
  const mainRef = useRef<HTMLDivElement>(null);

  // Total lessons for progress bar
  const allLessons = modules.flatMap(m => m.lessons);
  const lessonIndex = allLessons.findIndex(l => l.id === lesson.id);
  const completedCount = allLessons.filter(l => l.completed).length;
  const progress = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

  async function markComplete() {
    if (completed || completing) return;
    setCompleting(true);
    await fetch(`/api/academy/lessons/${lesson.id}/complete`, { method: "POST" });
    setCompleted(true);
    setCompleting(false);
    setXpBurst(25);
    setCurrentXp(x => x + 25);
    setTimeout(() => {
      setXpBurst(null);
      router.refresh();
    }, 2500);
  }

  const saveNote = useCallback(async () => {
    setNoteSaving(true);
    await fetch(`/api/academy/notes/${lesson.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note }),
    });
    setNoteSaved(true);
    setNoteSaving(false);
    setTimeout(() => setNoteSaved(false), 2000);
  }, [lesson.id, note]);

  // Count knowledge check blocks for progress through lesson
  const kcBlocks = lesson.blocks.filter(b => b.type === "KNOWLEDGE_CHECK");
  const contentBlocks = lesson.blocks.filter(b => b.type !== "KNOWLEDGE_CHECK");

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* XP burst overlay */}
      {xpBurst !== null && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="xp-burst text-emerald-400 font-black text-6xl animate-xp-pop">
            +{xpBurst} XP
          </div>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 border-r border-white/8 bg-zinc-900/60 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-white/6">
            <div className="flex items-center justify-between mb-2">
              <Link href={`/academy/${courseSlug}`} className="text-[11px] text-zinc-500 hover:text-zinc-300 transition block truncate">
                ← {courseTitle}
              </Link>
              <Link href="/dashboard" className="text-[10px] text-zinc-600 hover:text-emerald-400 transition shrink-0 border border-white/8 rounded px-2 py-0.5 ml-2">
                Vault
              </Link>
            </div>
            {/* Course progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] text-zinc-600 tabular-nums">{progress}%</span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {modules.map(mod => (
              <div key={mod.id} className="mb-3">
                <p className="px-4 py-1 text-[10px] text-zinc-600 uppercase tracking-wider font-mono">{mod.title}</p>
                {mod.lessons.map((l, i) => (
                  <Link
                    key={l.id}
                    href={`/academy/${courseSlug}/learn/${l.id}`}
                    className={`flex items-center gap-2 px-4 py-1.5 text-[11px] transition ${l.id === lesson.id ? "text-white bg-white/6" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/3"}`}
                  >
                    <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center text-[8px] ${l.completed ? "bg-emerald-500 border-emerald-500 text-black" : l.id === lesson.id ? "border-white/40" : "border-zinc-700"}`}>
                      {l.completed ? "✓" : <span className="text-zinc-600">{i + 1}</span>}
                    </span>
                    <span className="truncate leading-tight">{l.title}</span>
                  </Link>
                ))}
                {mod.quizId && (
                  <Link href={`/academy/${courseSlug}/quiz/${mod.id}`} className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-zinc-600 hover:text-amber-400 transition">
                    <span className="w-4 h-4 rounded border border-amber-600/30 flex-shrink-0 text-[8px] text-amber-500 flex items-center justify-center">Q</span>
                    <span>Module Quiz</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* XP display at bottom of sidebar */}
          <div className="px-4 py-3 border-t border-white/6">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">XP</span>
              <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min((currentXp % 500) / 5, 100)}%` }} />
              </div>
              <span className="text-[10px] text-amber-400 font-mono font-semibold tabular-nums">{currentXp.toLocaleString()}</span>
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-2.5 border-b border-white/8 bg-zinc-900/40 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-zinc-600 hover:text-zinc-300 transition text-xs px-2 py-1 rounded border border-white/8">
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <h1 className="font-semibold text-sm text-zinc-200 truncate max-w-md">{lesson.title}</h1>
            <span className="hidden sm:inline text-[10px] text-zinc-600 bg-zinc-900 border border-white/6 px-2 py-0.5 rounded">{lesson.durationMin} min</span>
            {kcBlocks.length > 0 && (
              <span className="hidden sm:inline text-[10px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">
                {kcBlocks.length} challenge{kcBlocks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNoteOpen(o => !o)}
              className={`text-[11px] px-3 py-1.5 rounded-lg border transition ${noteOpen ? "text-amber-400 border-amber-500/30 bg-amber-500/10" : "text-zinc-500 border-white/8 hover:text-zinc-300"}`}
            >
              Notes
            </button>
            {lessonIndex > 0 && (
              <span className="text-[10px] text-zinc-600 hidden sm:inline">
                {lessonIndex + 1} / {allLessons.length}
              </span>
            )}
            {!completed ? (
              <button
                onClick={() => void markComplete()}
                disabled={completing}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
              >
                {completing ? "Marking…" : "Mark Complete +25 XP"}
              </button>
            ) : (
              <span className="text-xs text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg bg-emerald-500/10 font-semibold">
                ✓ Complete
              </span>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Lesson body */}
          <main ref={mainRef} className="flex-1 overflow-y-auto px-8 py-8 max-w-3xl mx-auto w-full">
            <div className="space-y-5">
              {lesson.blocks.map(block => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>

            {/* Flashcards */}
            {lesson.flashcards.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-mono">Flashcards</h2>
                  <span className="text-[10px] text-zinc-600">— click to flip</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {lesson.flashcards.map((card, i) => (
                    <div
                      key={card.id}
                      onClick={() => { if (activeCard === i) { setCardFlipped(f => !f); } else { setActiveCard(i); setCardFlipped(false); } }}
                      className={`w-72 min-w-[18rem] h-44 cursor-pointer rounded-xl border transition-all flex items-center justify-center p-5 text-center select-none ${activeCard === i ? "border-purple-500/40 bg-purple-500/8" : "border-white/8 bg-zinc-900/60 hover:border-white/20"}`}
                    >
                      {activeCard === i && cardFlipped ? (
                        <div>
                          <p className="text-[10px] text-zinc-600 mb-2 uppercase tracking-wider">Answer</p>
                          <p className="text-sm text-zinc-300 leading-relaxed">{card.back}</p>
                        </div>
                      ) : (
                        <div>
                          {activeCard === i && <p className="text-[10px] text-purple-400 mb-2 uppercase tracking-wider">Click to reveal</p>}
                          <p className="text-sm font-semibold text-zinc-200">{card.front}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed state — encourage next */}
            {completed && next && (
              <div className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-400 mb-0.5">Lesson complete!</p>
                  <p className="text-xs text-zinc-500">Ready for the next challenge?</p>
                </div>
                <Link
                  href={next.href}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2 rounded-xl transition"
                >
                  Next: {next.label} →
                </Link>
              </div>
            )}

            {/* Prev / Next */}
            <div className="mt-8 pt-6 border-t border-white/6 flex items-center justify-between">
              {prevLesson ? (
                <Link href={`/academy/${courseSlug}/learn/${prevLesson.id}`} className="text-sm text-zinc-500 hover:text-white transition">
                  ← {prevLesson.title}
                </Link>
              ) : <div />}
              {next && !completed && (
                <Link href={next.href} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-semibold px-4 py-2 rounded-xl transition">
                  Skip to next →
                </Link>
              )}
            </div>
          </main>

          {/* Notes panel */}
          {noteOpen && (
            <aside className="w-72 shrink-0 border-l border-white/8 bg-zinc-900/60 flex flex-col p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">My Notes</p>
                {noteSaved && <span className="text-[10px] text-emerald-400">Saved ✓</span>}
              </div>
              <textarea
                value={note}
                onChange={e => { setNote(e.target.value); setNoteSaved(false); }}
                onBlur={() => void saveNote()}
                placeholder="Your notes for this lesson…"
                className="flex-1 bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-xs text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-emerald-500/40 leading-relaxed"
              />
              <button onClick={() => void saveNote()} disabled={noteSaving} className="mt-3 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition">
                {noteSaving ? "Saving…" : "Save Note"}
              </button>
            </aside>
          )}
        </div>
      </div>

      <style>{`
        @keyframes xp-pop {
          0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
          20%  { opacity: 1; transform: scale(1.1) translateY(0); }
          70%  { opacity: 1; transform: scale(1) translateY(-10px); }
          100% { opacity: 0; transform: scale(0.9) translateY(-40px); }
        }
        .animate-xp-pop { animation: xp-pop 2.2s ease-out forwards; }
      `}</style>
    </div>
  );
}

const CALLOUT_STYLE: Record<string, string> = {
  info:    "border-blue-500/30 bg-blue-500/8 text-blue-300",
  warning: "border-amber-500/30 bg-amber-500/8 text-amber-300",
  tip:     "border-emerald-500/30 bg-emerald-500/8 text-emerald-300",
  danger:  "border-red-500/30 bg-red-500/8 text-red-300",
  important: "border-purple-500/30 bg-purple-500/8 text-purple-300",
};

const CALLOUT_ICON: Record<string, string> = {
  info: "ℹ", warning: "⚠", tip: "✓", danger: "✕", important: "★",
};

function BlockRenderer({ block }: { block: Block }) {
  const c = block.content;

  if (block.type === "TEXT") {
    return (
      <div className="space-y-3">
        {String(c.text ?? "").split("\n\n").map((para, i) => (
          <p key={i} className="text-zinc-300 leading-relaxed text-[15px]"
            dangerouslySetInnerHTML={{ __html: renderInline(para) }}
          />
        ))}
      </div>
    );
  }

  if (block.type === "CODE") {
    const lang = c.language ? String(c.language) : null;
    const caption = c.caption ? String(c.caption) : null;
    return (
      <div className="rounded-xl bg-zinc-900 border border-white/8 overflow-hidden">
        <div className="px-4 py-2 border-b border-white/6 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-mono uppercase">{lang ?? "code"}</span>
          {caption && <span className="text-[10px] text-zinc-600">{caption}</span>}
        </div>
        <pre className="px-5 py-4 text-sm text-zinc-300 font-mono leading-relaxed overflow-x-auto">
          <code>{String(c.code ?? "")}</code>
        </pre>
      </div>
    );
  }

  if (block.type === "IMAGE") {
    const caption = c.caption ? String(c.caption) : null;
    return (
      <figure className="rounded-xl overflow-hidden border border-white/8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={String(c.url ?? "")} alt={String(c.alt ?? "")} className="w-full object-cover" />
        {caption && <figcaption className="text-xs text-zinc-500 text-center py-2 px-4">{caption}</figcaption>}
      </figure>
    );
  }

  if (block.type === "KNOWLEDGE_CHECK") {
    return <KnowledgeCheckBlock content={c} />;
  }

  // CALLOUT
  const variant = String(c.variant ?? "info");
  const calloutTitle = c.title ? String(c.title) : null;
  const style = CALLOUT_STYLE[variant] ?? CALLOUT_STYLE.info;
  const icon = CALLOUT_ICON[variant] ?? "ℹ";
  return (
    <div className={`rounded-xl border px-5 py-4 ${style}`}>
      <div className="flex items-start gap-3">
        <span className="text-base mt-0.5 flex-shrink-0">{icon}</span>
        <div>
          {calloutTitle && <p className="font-semibold text-sm mb-1">{calloutTitle}</p>}
          <p className="text-sm leading-relaxed">{String(c.text ?? "")}</p>
        </div>
      </div>
    </div>
  );
}

function KnowledgeCheckBlock({ content }: { content: Record<string, unknown> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const question = String(content.question ?? "");
  const options = (content.options as KCOption[] | undefined) ?? [];
  const correct = String(content.correct ?? "");
  const explanation = content.explanation ? String(content.explanation) : null;

  const isCorrect = selected === correct;

  function choose(id: string) {
    if (revealed) return;
    setSelected(id);
  }

  function reveal() {
    if (!selected) return;
    setRevealed(true);
  }

  return (
    <div className="rounded-xl border border-purple-500/25 bg-purple-500/6 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-purple-500/15">
        <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">Knowledge Check</span>
        <span className="text-[10px] text-purple-500/60">— choose the best answer</span>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm font-medium text-zinc-200 mb-4 leading-relaxed">{question}</p>
        <div className="space-y-2">
          {options.map(opt => {
            let cls = "border-white/8 bg-zinc-900/40 text-zinc-400 hover:border-purple-500/40 hover:text-zinc-200";
            if (revealed) {
              if (opt.id === correct) cls = "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
              else if (opt.id === selected) cls = "border-red-500/50 bg-red-500/10 text-red-300";
              else cls = "border-white/6 bg-transparent text-zinc-600";
            } else if (selected === opt.id) {
              cls = "border-purple-500/60 bg-purple-500/12 text-white";
            }
            return (
              <button
                key={opt.id}
                onClick={() => choose(opt.id)}
                disabled={revealed}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border text-sm transition-all ${cls}`}
              >
                <span className="font-mono font-bold w-5 flex-shrink-0 text-[11px] mt-0.5">{opt.id}.</span>
                <span className="leading-relaxed">{opt.text}</span>
                {revealed && opt.id === correct && <span className="ml-auto text-emerald-400 flex-shrink-0">✓</span>}
                {revealed && opt.id === selected && opt.id !== correct && <span className="ml-auto text-red-400 flex-shrink-0">✗</span>}
              </button>
            );
          })}
        </div>

        {!revealed && (
          <button
            onClick={reveal}
            disabled={!selected}
            className="mt-4 w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
          >
            {selected ? "Check Answer" : "Select an answer first"}
          </button>
        )}

        {revealed && (
          <div className={`mt-4 rounded-lg px-4 py-3 border text-sm ${isCorrect ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-300" : "border-red-500/30 bg-red-500/8 text-red-300"}`}>
            <p className="font-semibold mb-1">{isCorrect ? "Correct!" : "Not quite."}</p>
            {explanation && <p className="text-xs leading-relaxed opacity-90">{explanation}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function renderInline(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-zinc-800 text-emerald-400 px-1.5 py-0.5 rounded text-[13px] font-mono">$1</code>');
}
