"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Sheet = { id: string; title: string; description: string | null; content: string; order: number; published: boolean; courseId: string | null };

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700";

export default function CheatSheetsAdminPage() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [form, setForm] = useState({ title: "", description: "", content: "" });
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    void fetch("/api/admin/academy/cheatsheets").then(r => r.json()).then((d: Sheet[]) => setSheets(d));
  }, []);

  async function add() {
    if (!form.title || !form.content) return;
    setAdding(true);
    const res = await fetch("/api/admin/academy/cheatsheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order: sheets.length }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      setSheets(s => [...s, { id: data.id, ...form, description: form.description || null, published: true, courseId: null, order: sheets.length }]);
      setForm({ title: "", description: "", content: "" });
    }
    setAdding(false);
  }

  async function save(id: string) {
    await fetch(`/api/admin/academy/cheatsheets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    setSheets(s => s.map(x => x.id === id ? { ...x, content: editContent } : x));
    setEditId(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this cheat sheet?")) return;
    await fetch(`/api/admin/academy/cheatsheets/${id}`, { method: "DELETE" });
    setSheets(s => s.filter(x => x.id !== id));
  }

  return (
    <div className="p-8 space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/academy" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-1 block">← Academy</Link>
          <h1 className="text-2xl font-bold text-white">Cheat Sheets</h1>
        </div>
      </div>

      <div className="space-y-4">
        {sheets.map(sheet => (
          <div key={sheet.id} className="rounded-xl border border-white/8 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-zinc-200">{sheet.title}</h3>
              <div className="flex gap-3">
                <button onClick={() => { setEditId(sheet.id); setEditContent(sheet.content); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition">Edit</button>
                <button onClick={() => void remove(sheet.id)} className="text-xs text-red-500/60 hover:text-red-400 transition">Delete</button>
              </div>
            </div>
            {sheet.description && <p className="text-xs text-zinc-500 mb-2">{sheet.description}</p>}
            {editId === sheet.id ? (
              <div className="space-y-2 mt-3">
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={12} className={`${INPUT} resize-y font-mono text-xs`} />
                <div className="flex gap-2">
                  <button onClick={() => void save(sheet.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition">Save</button>
                  <button onClick={() => setEditId(null)} className="text-xs text-zinc-500 hover:text-zinc-300 transition">Cancel</button>
                </div>
              </div>
            ) : (
              <pre className="text-xs text-zinc-400 font-mono whitespace-pre-wrap line-clamp-4 mt-2">{sheet.content}</pre>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-5 space-y-3">
        <h2 className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Add Cheat Sheet</h2>
        <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={INPUT} placeholder="Title — e.g. Linux Commands" />
        <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={INPUT} placeholder="Short description (optional)" />
        <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={10} className={`${INPUT} resize-y font-mono text-xs`} placeholder={"# Quick Reference\n\nls -la\ncd /path\nchmod 755 file"} />
        <button onClick={() => void add()} disabled={adding || !form.title || !form.content} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
          {adding ? "Adding…" : "Add Cheat Sheet"}
        </button>
      </div>
    </div>
  );
}
