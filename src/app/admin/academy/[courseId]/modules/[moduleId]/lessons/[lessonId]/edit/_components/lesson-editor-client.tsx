"use client";

import { useState } from "react";
import Link from "next/link";

type BlockType = "TEXT" | "CODE" | "IMAGE" | "CALLOUT" | "KNOWLEDGE_CHECK";
type Block = { id: string; type: BlockType; order: number; content: Record<string, unknown> };
type Flashcard = { id: string; front: string; back: string; order: number };
type Lesson = { id: string; title: string; summary: string; order: number; published: boolean; durationMin: number };
type KCOption = { id: string; text: string };

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700";
const CALLOUT_VARIANTS = ["info", "warning", "tip", "danger", "important"];

export function LessonEditorClient({ courseId, moduleId, lesson: initLesson, moduleTitle, blocks: initBlocks, flashcards: initCards }: {
  courseId: string; moduleId: string; moduleTitle: string;
  lesson: Lesson; blocks: Block[]; flashcards: Flashcard[];
}) {
  const [lesson, setLesson] = useState(initLesson);
  const [metaStatus, setMetaStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [blocks, setBlocks] = useState<Block[]>(initBlocks);
  const [blockStatus, setBlockStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [addType, setAddType] = useState<BlockType>("TEXT");
  const [cards, setCards] = useState<Flashcard[]>(initCards);
  const [newCard, setNewCard] = useState({ front: "", back: "" });
  const [addingCard, setAddingCard] = useState(false);

  async function saveMeta() {
    setMetaStatus("saving");
    const res = await fetch(`/api/admin/academy/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: lesson.title, summary: lesson.summary, published: lesson.published, durationMin: Number(lesson.durationMin) }),
    });
    setMetaStatus(res.ok ? "saved" : "error");
  }

  async function saveBlocks() {
    setBlockStatus("saving");
    const res = await fetch(`/api/admin/academy/lessons/${lesson.id}/blocks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(blocks.map((b, i) => ({ ...b, order: i }))),
    });
    if (res.ok) {
      const refreshRes = await fetch(`/api/admin/academy/lessons/${lesson.id}`);
      if (refreshRes.ok) {
        const data = await refreshRes.json() as { blocks: Block[] };
        setBlocks(data.blocks.map(b => ({ ...b, type: b.type as BlockType, content: b.content as Record<string, unknown> })));
      }
    }
    setBlockStatus(res.ok ? "saved" : "error");
  }

  function addBlock() {
    const newBlock: Block = {
      id: `new-${Date.now()}`,
      type: addType,
      order: blocks.length,
      content: addType === "TEXT"    ? { text: "" }
              : addType === "CODE"   ? { language: "bash", code: "" }
              : addType === "IMAGE"  ? { url: "", alt: "", caption: "" }
              : addType === "KNOWLEDGE_CHECK" ? { question: "", options: [{ id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" }], correct: "A", explanation: "" }
              : { variant: "info", title: "", text: "" },
    };
    setBlocks(b => [...b, newBlock]);
  }

  function updateBlock(id: string, content: Record<string, unknown>) {
    setBlocks(b => b.map(x => x.id === id ? { ...x, content } : x));
    setBlockStatus("idle");
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    setBlockStatus("idle");
  }

  function removeBlock(id: string) {
    setBlocks(b => b.filter(x => x.id !== id));
    setBlockStatus("idle");
  }

  async function addFlashcard() {
    if (!newCard.front.trim() || !newCard.back.trim()) return;
    setAddingCard(true);
    const res = await fetch(`/api/admin/academy/lessons/${lesson.id}/flashcards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ front: newCard.front, back: newCard.back, order: cards.length }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      setCards(c => [...c, { id: data.id, front: newCard.front, back: newCard.back, order: cards.length }]);
      setNewCard({ front: "", back: "" });
    }
    setAddingCard(false);
  }

  async function deleteFlashcard(id: string) {
    await fetch(`/api/admin/academy/flashcards/${id}`, { method: "DELETE" });
    setCards(c => c.filter(x => x.id !== id));
  }

  return (
    <div className="p-8 space-y-10 max-w-3xl">
      <div>
        <Link href={`/admin/academy/${courseId}/modules/${moduleId}/lessons`} className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-1 block">← {moduleTitle}</Link>
        <h1 className="text-2xl font-bold text-white">{lesson.title}</h1>
      </div>

      {/* Lesson meta */}
      <Section title="Lesson Details">
        <div className="space-y-3">
          <Field label="Title"><input value={lesson.title} onChange={e => setLesson(l => ({ ...l, title: e.target.value }))} className={INPUT} /></Field>
          <Field label="Summary">
            <input value={lesson.summary} onChange={e => setLesson(l => ({ ...l, summary: e.target.value }))} className={INPUT} placeholder="One-line summary shown in the lesson list" />
          </Field>
          <div className="flex items-center gap-6">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Duration (min)</label>
              <input type="number" min={1} value={lesson.durationMin} onChange={e => setLesson(l => ({ ...l, durationMin: Number(e.target.value) }))} className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none mt-4">
              <input type="checkbox" checked={lesson.published} onChange={e => setLesson(l => ({ ...l, published: e.target.checked }))} className="rounded border-zinc-700" />
              Published
            </label>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => void saveMeta()} disabled={metaStatus === "saving"} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
              {metaStatus === "saving" ? "Saving…" : "Save"}
            </button>
            {metaStatus === "saved" && <span className="text-xs text-emerald-400">Saved ✓</span>}
          </div>
        </div>
      </Section>

      {/* Content Blocks */}
      <Section title="Lesson Content">
        <div className="space-y-4 mb-4">
          {blocks.length === 0 && <p className="text-sm text-zinc-600 italic">No content blocks yet. Add your first block below.</p>}
          {blocks.map((block, i) => (
            <div key={block.id} className="rounded-xl border border-white/8 bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-500 font-mono uppercase">{block.type}</span>
                <div className="flex gap-2">
                  {i > 0 && <button onClick={() => moveBlock(block.id, -1)} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5">↑</button>}
                  {i < blocks.length - 1 && <button onClick={() => moveBlock(block.id, 1)} className="text-[10px] text-zinc-600 hover:text-zinc-300 px-1.5">↓</button>}
                  <button onClick={() => removeBlock(block.id)} className="text-[10px] text-red-500/60 hover:text-red-400">Remove</button>
                </div>
              </div>
              <BlockEditor block={block} onChange={c => updateBlock(block.id, c)} />
            </div>
          ))}
        </div>

        <div className="flex gap-3 items-center mb-3">
          <select value={addType} onChange={e => setAddType(e.target.value as BlockType)} className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none">
            <option value="TEXT">Text</option>
            <option value="CODE">Code Block</option>
            <option value="IMAGE">Image</option>
            <option value="CALLOUT">Callout</option>
            <option value="KNOWLEDGE_CHECK">Knowledge Check</option>
          </select>
          <button onClick={addBlock} className="bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition">
            + Add Block
          </button>
        </div>

        <div className="flex items-center gap-4 pt-2 border-t border-white/6">
          <button onClick={() => void saveBlocks()} disabled={blockStatus === "saving"} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
            {blockStatus === "saving" ? "Saving…" : "Save All Blocks"}
          </button>
          {blockStatus === "saved" && <span className="text-xs text-emerald-400">Saved ✓</span>}
          {blockStatus === "error"  && <span className="text-xs text-red-400">Save failed</span>}
        </div>
      </Section>

      {/* Flashcards */}
      <Section title="Flashcards">
        <div className="space-y-2 mb-4">
          {cards.length === 0 && <p className="text-sm text-zinc-600 italic">No flashcards yet.</p>}
          {cards.map(card => (
            <div key={card.id} className="flex items-start gap-3 bg-zinc-900/60 rounded-lg px-4 py-3 border border-white/6">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 mb-0.5 font-mono">Front</p>
                <p className="text-sm text-zinc-200">{card.front}</p>
                <p className="text-xs text-zinc-400 mt-2 mb-0.5 font-mono">Back</p>
                <p className="text-sm text-zinc-300">{card.back}</p>
              </div>
              <button onClick={() => void deleteFlashcard(card.id)} className="text-[10px] text-red-500/60 hover:text-red-400 transition shrink-0 mt-1">Remove</button>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 space-y-3">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Add Flashcard</p>
          <input value={newCard.front} onChange={e => setNewCard(p => ({ ...p, front: e.target.value }))} className={INPUT} placeholder="Front — the question or term" />
          <textarea value={newCard.back} onChange={e => setNewCard(p => ({ ...p, back: e.target.value }))} rows={3} className={`${INPUT} resize-none`} placeholder="Back — the answer or definition" />
          <button onClick={() => void addFlashcard()} disabled={addingCard || !newCard.front.trim() || !newCard.back.trim()} className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">
            {addingCard ? "Adding…" : "Add Flashcard"}
          </button>
        </div>
      </Section>
    </div>
  );
}

function BlockEditor({ block, onChange }: { block: Block; onChange: (c: Record<string, unknown>) => void }) {
  const c = block.content;
  if (block.type === "TEXT") return (
    <textarea
      value={String(c.text ?? "")}
      onChange={e => onChange({ ...c, text: e.target.value })}
      rows={6}
      placeholder="Lesson text. Use blank lines for paragraphs. **bold** and `code` are supported."
      className="w-full bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-700 resize-y focus:outline-none focus:border-emerald-500/40 leading-relaxed"
    />
  );
  if (block.type === "CODE") return (
    <div className="space-y-2">
      <input
        value={String(c.language ?? "bash")}
        onChange={e => onChange({ ...c, language: e.target.value })}
        className="w-32 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none font-mono"
        placeholder="language"
      />
      <textarea
        value={String(c.code ?? "")}
        onChange={e => onChange({ ...c, code: e.target.value })}
        rows={6}
        className="w-full bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-700 resize-y focus:outline-none focus:border-emerald-500/40 font-mono leading-relaxed"
        placeholder="# your code here"
      />
    </div>
  );
  if (block.type === "IMAGE") return (
    <div className="space-y-2">
      <input value={String(c.url ?? "")} onChange={e => onChange({ ...c, url: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none" placeholder="Image URL" />
      <input value={String(c.alt ?? "")} onChange={e => onChange({ ...c, alt: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none" placeholder="Alt text" />
      <input value={String(c.caption ?? "")} onChange={e => onChange({ ...c, caption: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none" placeholder="Caption (optional)" />
    </div>
  );
  if (block.type === "KNOWLEDGE_CHECK") {
    const options = (Array.isArray(c.options) ? c.options : []) as KCOption[];
    const setOptText = (id: string, text: string) =>
      onChange({ ...c, options: options.map(o => o.id === id ? { ...o, text } : o) });
    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Question</label>
          <textarea value={String(c.question ?? "")} onChange={e => onChange({ ...c, question: e.target.value })} rows={2} className="w-full bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-purple-500/40" placeholder="The multiple-choice question" />
        </div>
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Options — select the radio to mark the correct one</label>
          <div className="space-y-2">
            {options.map(o => (
              <div key={o.id} className="flex items-center gap-2">
                <input type="radio" name={`kc-${block.id}`} checked={c.correct === o.id} onChange={() => onChange({ ...c, correct: o.id })} className="accent-emerald-500" />
                <span className="text-xs text-zinc-500 font-mono w-4">{o.id}</span>
                <input value={o.text} onChange={e => setOptText(o.id, e.target.value)} className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none focus:border-purple-500/40" placeholder={`Option ${o.id}`} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Explanation (shown after answering)</label>
          <textarea value={String(c.explanation ?? "")} onChange={e => onChange({ ...c, explanation: e.target.value })} rows={2} className="w-full bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-purple-500/40" placeholder="Why the correct answer is right" />
        </div>
      </div>
    );
  }
  // CALLOUT
  return (
    <div className="space-y-2">
      <select value={String(c.variant ?? "info")} onChange={e => onChange({ ...c, variant: e.target.value })} className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-zinc-300 focus:outline-none">
        {CALLOUT_VARIANTS.map(v => <option key={v} value={v}>{v}</option>)}
      </select>
      <input value={String(c.title ?? "")} onChange={e => onChange({ ...c, title: e.target.value })} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none" placeholder="Callout title (optional)" />
      <textarea value={String(c.text ?? "")} onChange={e => onChange({ ...c, text: e.target.value })} rows={3} className="w-full bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-sm text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-emerald-500/40" placeholder="Callout body text" />
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
