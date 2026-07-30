"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/icon";
import { NoCopy } from "@/components/ui/no-copy";
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
    <div className="flex h-screen bg-surface-0 text-white overflow-hidden">
      {/* XP burst overlay */}
      {xpBurst !== null && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="xp-burst text-ok font-black text-6xl animate-xp-pop">
            +{xpBurst} XP
          </div>
        </div>
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 border-r border-edge bg-surface-1 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-edge-subtle">
            <div className="flex items-center justify-between mb-2">
              <Link href={`/academy/${courseSlug}`} className="text-[11px] text-ink-3 hover:text-ink-2 transition block truncate">
                ← {courseTitle}
              </Link>
              <Link href="/dashboard" className="text-[10px] text-ink-3 hover:text-ok transition shrink-0 border border-edge rounded px-2 py-0.5 ml-2">
                Vault
              </Link>
            </div>
            {/* Course progress bar */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-ok rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[10px] text-ink-3 tabular-nums">{progress}%</span>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-2">
            {modules.map(mod => (
              <div key={mod.id} className="mb-3">
                <p className="px-4 py-1 text-[10px] text-ink-3 uppercase tracking-wider font-mono">{mod.title}</p>
                {mod.lessons.map((l, i) => (
                  <Link
                    key={l.id}
                    href={`/academy/${courseSlug}/learn/${l.id}`}
                    className={`flex items-center gap-2 px-4 py-1.5 text-[11px] transition ${l.id === lesson.id ? "text-white bg-surface-2" : "text-ink-3 hover:text-ink hover:bg-surface-2"}`}
                  >
                    <span className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center text-[8px] ${l.completed ? "bg-accent-fill border-ok-edge text-white" : l.id === lesson.id ? "border-edge-strong" : "border-edge-strong"}`}>
                      {l.completed ? <Icon name="check" size={13} /> : <span className="text-ink-3">{i + 1}</span>}
                    </span>
                    <span className="truncate leading-tight">{l.title}</span>
                  </Link>
                ))}
                {mod.quizId && (
                  <Link href={`/academy/${courseSlug}/quiz/${mod.id}`} className="flex items-center gap-2 px-4 py-1.5 text-[11px] text-ink-3 hover:text-warn transition">
                    <span className="w-4 h-4 rounded border border-warn-edge flex-shrink-0 text-[8px] text-warn flex items-center justify-center">Q</span>
                    <span>Module Quiz</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* XP display at bottom of sidebar */}
          <div className="px-4 py-3 border-t border-edge-subtle">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-ink-3">XP</span>
              <div className="flex-1 h-1 bg-surface-2 rounded-full overflow-hidden">
                <div className="h-full bg-warn rounded-full transition-all" style={{ width: `${Math.min((currentXp % 500) / 5, 100)}%` }} />
              </div>
              <span className="text-[10px] text-warn font-mono font-semibold tabular-nums">{currentXp.toLocaleString()}</span>
            </div>
          </div>
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-2.5 border-b border-edge bg-surface-1 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="text-ink-3 hover:text-ink-2 transition text-xs px-2 py-1 rounded border border-edge">
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <h1 className="font-semibold text-sm text-ink truncate max-w-md">{lesson.title}</h1>
            <span className="hidden sm:inline text-[10px] text-ink-3 bg-surface-1 border border-edge-subtle px-2 py-0.5 rounded">{lesson.durationMin} min</span>
            {kcBlocks.length > 0 && (
              <span className="hidden sm:inline text-[10px] text-accent bg-accent-wash border border-accent-edge px-2 py-0.5 rounded">
                {kcBlocks.length} challenge{kcBlocks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNoteOpen(o => !o)}
              className={`text-[11px] px-3 py-1.5 rounded-lg border transition ${noteOpen ? "text-warn border-warn-edge bg-warn-wash" : "text-ink-3 border-edge hover:text-ink-2"}`}
            >
              Notes
            </button>
            {lessonIndex > 0 && (
              <span className="text-[10px] text-ink-3 hidden sm:inline">
                {lessonIndex + 1} / {allLessons.length}
              </span>
            )}
            {!completed ? (
              <button
                onClick={() => void markComplete()}
                disabled={completing}
                className="bg-ok hover:bg-ok-wash disabled:opacity-50 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
              >
                {completing ? "Marking…" : "Mark Complete +25 XP"}
              </button>
            ) : (
              <span className="text-xs text-ok border border-ok-edge px-3 py-1.5 rounded-lg bg-ok-wash font-semibold">
                <Icon name="check" size={14} className="inline-block shrink-0" /> Complete
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
                  <h2 className="text-xs uppercase tracking-widest text-ink-3 font-mono">Flashcards</h2>
                  <span className="text-[10px] text-ink-3">— click to flip</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {lesson.flashcards.map((card, i) => (
                    <div
                      key={card.id}
                      onClick={() => { if (activeCard === i) { setCardFlipped(f => !f); } else { setActiveCard(i); setCardFlipped(false); } }}
                      className={`w-72 min-w-[18rem] h-44 cursor-pointer rounded-xl border transition-all flex items-center justify-center p-5 text-center select-none ${activeCard === i ? "border-accent-edge bg-accent-wash" : "border-edge bg-surface-1 hover:border-edge-strong"}`}
                    >
                      {activeCard === i && cardFlipped ? (
                        <div>
                          <p className="text-[10px] text-ink-3 mb-2 uppercase tracking-wider">Answer</p>
                          <p className="text-sm text-ink-2 leading-relaxed">{card.back}</p>
                        </div>
                      ) : (
                        <div>
                          {activeCard === i && <p className="text-[10px] text-ink-3 mb-2 uppercase tracking-wider">Click to reveal</p>}
                          <p className="text-sm font-semibold text-ink">{card.front}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed state — encourage next */}
            {completed && next && (
              <div className="mt-8 rounded-xl border border-ok-edge bg-ok-wash p-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-ok mb-0.5">Lesson complete!</p>
                  <p className="text-xs text-ink-3">Ready for the next challenge?</p>
                </div>
                <Link
                  href={next.href}
                  className="bg-ok hover:bg-ok-wash text-white text-xs font-semibold px-5 py-2 rounded-xl transition"
                >
                  Next: {next.label} →
                </Link>
              </div>
            )}

            {/* Prev / Next */}
            <div className="mt-8 pt-6 border-t border-edge-subtle flex items-center justify-between">
              {prevLesson ? (
                <Link href={`/academy/${courseSlug}/learn/${prevLesson.id}`} className="text-sm text-ink-3 hover:text-white transition">
                  ← {prevLesson.title}
                </Link>
              ) : <div />}
              {next && !completed && (
                <Link href={next.href} className="bg-surface-2 hover:bg-surface-3 text-ink text-sm font-semibold px-4 py-2 rounded-xl transition">
                  Skip to next →
                </Link>
              )}
            </div>
          </main>

          {/* Notes panel */}
          {noteOpen && (
            <aside className="w-72 shrink-0 border-l border-edge bg-surface-1 flex flex-col p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-ink-2 font-semibold uppercase tracking-wider">My Notes</p>
                {noteSaved && <span className="text-[10px] text-ok">Saved <Icon name="check" size={14} className="inline-block shrink-0" /></span>}
              </div>
              <textarea
                value={note}
                onChange={e => { setNote(e.target.value); setNoteSaved(false); }}
                onBlur={() => void saveNote()}
                placeholder="Your notes for this lesson…"
                className="flex-1 bg-surface-2/60 border border-edge rounded-lg p-3 text-xs text-ink-2 placeholder-ink-3 resize-none focus:outline-none focus:border-ok-edge leading-relaxed"
              />
              <button onClick={() => void saveNote()} disabled={noteSaving} className="mt-3 bg-surface-3 hover:bg-surface-3 disabled:opacity-40 text-white text-xs font-semibold py-1.5 rounded-lg transition">
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
  info:    "border-info-edge bg-info-wash text-info",
  warning: "border-warn-edge bg-warn-wash text-warn",
  tip:     "border-ok-edge bg-ok-wash text-ok",
  danger:  "border-danger-edge bg-danger-wash text-danger",
  important: "border-accent-edge bg-accent-wash text-accent",
};

const CALLOUT_ICON: Record<string, IconName> = {
  info: "info", warning: "warning", tip: "check", danger: "close", important: "star",
};

function BlockRenderer({ block }: { block: Block }) {
  const c = block.content;

  if (block.type === "TEXT") {
    return (
      <div className="space-y-3">
        {String(c.text ?? "").split("\n\n").map((para, i) => (
          <p key={i} className="text-ink-2 leading-relaxed text-[15px]"
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
      <div className="rounded-xl bg-surface-1 border border-edge overflow-hidden">
        <div className="px-4 py-2 border-b border-edge-subtle flex items-center justify-between">
          <span className="text-[10px] text-ink-3 font-mono uppercase">{lang ?? "code"}</span>
          {caption && <span className="text-[10px] text-ink-3">{caption}</span>}
        </div>
        <pre className="px-5 py-4 text-sm text-ink-2 font-mono leading-relaxed overflow-x-auto">
          <code>{String(c.code ?? "")}</code>
        </pre>
      </div>
    );
  }

  if (block.type === "IMAGE") {
    const caption = c.caption ? String(c.caption) : null;
    return (
      <figure className="rounded-xl overflow-hidden border border-edge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={String(c.url ?? "")} alt={String(c.alt ?? "")} className="w-full object-cover" />
        {caption && <figcaption className="text-xs text-ink-3 text-center py-2 px-4">{caption}</figcaption>}
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
  const icon = CALLOUT_ICON[variant] ?? "info";
  return (
    <div className={`rounded-xl border px-5 py-4 ${style}`}>
      <div className="flex items-start gap-3">
        <Icon name={icon} size={16} className="mt-0.5 flex-shrink-0" />
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
    <NoCopy className="rounded-xl border border-accent-edge bg-accent-wash overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-accent-edge">
        <span className="text-accent text-xs font-bold uppercase tracking-wider">Knowledge Check</span>
        <span className="text-[10px] text-accent/60">— choose the best answer</span>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm font-medium text-ink mb-4 leading-relaxed">{question}</p>
        <div className="space-y-2">
          {options.map(opt => {
            let cls = "border-edge bg-surface-1 text-ink-2 hover:border-accent-edge hover:text-ink";
            if (revealed) {
              if (opt.id === correct) cls = "border-ok-edge bg-ok-wash text-ok";
              else if (opt.id === selected) cls = "border-danger-edge bg-danger-wash text-danger";
              else cls = "border-edge-subtle bg-transparent text-ink-3";
            } else if (selected === opt.id) {
              cls = "border-accent-edge bg-accent-wash text-white";
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
                {revealed && opt.id === correct && <span className="ml-auto text-ok flex-shrink-0"><Icon name="check" size={14} className="inline-block shrink-0" /></span>}
                {revealed && opt.id === selected && opt.id !== correct && <span className="ml-auto text-danger flex-shrink-0"><Icon name="cross" size={14} className="inline-block shrink-0" /></span>}
              </button>
            );
          })}
        </div>

        {!revealed && (
          <button
            onClick={reveal}
            disabled={!selected}
            className="mt-4 w-full py-2 rounded-lg bg-accent hover:bg-accent-wash disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
          >
            {selected ? "Check Answer" : "Select an answer first"}
          </button>
        )}

        {revealed && (
          <div className={`mt-4 rounded-lg px-4 py-3 border text-sm ${isCorrect ? "border-ok-edge bg-ok-wash text-ok" : "border-danger-edge bg-danger-wash text-danger"}`}>
            <p className="font-semibold mb-1">{isCorrect ? "Correct!" : "Not quite."}</p>
            {explanation && <p className="text-xs leading-relaxed opacity-90">{explanation}</p>}
          </div>
        )}
      </div>
    </NoCopy>
  );
}

function renderInline(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-surface-2 text-ok px-1.5 py-0.5 rounded text-[13px] font-mono">$1</code>');
}
