"use client";

import { useState } from "react";
import Link from "next/link";

type LabType = "CTF" | "BLUE_TEAM" | "RED_TEAM";
type Difficulty = "EASY" | "MEDIUM" | "HARD" | "INSANE";

type Lab = {
  slug: string; title: string; description: string;
  type: LabType; difficulty: Difficulty; category: string; points: number; published: boolean;
};
type FlagItem = { id: string; value: string; points: number; caseSensitive: boolean };
type HintRow  = { text: string; pointCost: number; status: "idle" | "saving" | "saved" | "error" };

export function EditLabClient({
  lab,
  flags: initFlags,
  stages: initStages,
  hints: initHints,
}: {
  lab: Lab;
  flags: FlagItem[];
  stages: string[];
  hints: Record<string, { level: number; text: string; pointCost: number }[]>;
}) {
  // ── Metadata ─────────────────────────────────────────────────────────────────
  const [meta, setMeta] = useState<Lab>(lab);
  const [metaStatus, setMetaStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function setField<K extends keyof Lab>(k: K, v: Lab[K]) {
    setMeta(m => ({ ...m, [k]: v }));
    setMetaStatus("idle");
  }

  async function saveMeta() {
    setMetaStatus("saving");
    const res = await fetch(`/api/admin/labs/${lab.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...meta, points: Number(meta.points) }),
    });
    setMetaStatus(res.ok ? "saved" : "error");
  }

  async function deleteLab() {
    if (!confirm(`Delete "${meta.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/labs/${lab.slug}`, { method: "DELETE" });
    if (res.ok) { window.location.href = "/admin/labs"; return; }
    const data = await res.json() as { error?: string };
    alert(data.error === "has_attempts" ? "Cannot delete — this lab has student attempts." : "Delete failed.");
  }

  // ── Flags ─────────────────────────────────────────────────────────────────────
  const [flags, setFlags] = useState<FlagItem[]>(initFlags);
  const [newFlag, setNewFlag] = useState({ value: "", points: 100, caseSensitive: true });
  const [flagAdding, setFlagAdding] = useState(false);

  async function addFlag() {
    if (!newFlag.value.trim()) return;
    setFlagAdding(true);
    const res = await fetch(`/api/admin/labs/${lab.slug}/flags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newFlag, points: Number(newFlag.points) }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      setFlags(f => [...f, { id: data.id, ...newFlag, points: Number(newFlag.points) }]);
      setNewFlag({ value: "", points: 100, caseSensitive: true });
    }
    setFlagAdding(false);
  }

  async function removeFlag(flagId: string) {
    await fetch(`/api/admin/labs/${lab.slug}/flags?flagId=${flagId}`, { method: "DELETE" });
    setFlags(f => f.filter(x => x.id !== flagId));
  }

  // ── Hints & Stages ────────────────────────────────────────────────────────────
  const [stages, setStages] = useState<string[]>(initStages);
  const [newStage, setNewStage] = useState("");

  const [hintForm, setHintForm] = useState<Record<string, Record<number, HintRow>>>(() => {
    const out: Record<string, Record<number, HintRow>> = {};
    for (const stage of initStages) {
      out[stage] = {};
      for (let lvl = 1; lvl <= 3; lvl++) {
        const ex = initHints[stage]?.find(h => h.level === lvl);
        out[stage][lvl] = { text: ex?.text ?? "", pointCost: ex?.pointCost ?? lvl * 10, status: "idle" };
      }
    }
    return out;
  });

  function updateHint(stage: string, level: number, patch: Partial<HintRow>) {
    setHintForm(prev => ({
      ...prev,
      [stage]: { ...prev[stage], [level]: { ...prev[stage][level], ...patch } },
    }));
  }

  function addStage() {
    const s = newStage.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!s || stages.includes(s)) return;
    setStages(prev => [...prev, s]);
    setHintForm(prev => ({
      ...prev,
      [s]: {
        1: { text: "", pointCost: 10, status: "idle" },
        2: { text: "", pointCost: 20, status: "idle" },
        3: { text: "", pointCost: 30, status: "idle" },
      },
    }));
    setNewStage("");
  }

  async function saveHint(stage: string, level: number) {
    const entry = hintForm[stage]?.[level];
    if (!entry?.text.trim()) return;
    updateHint(stage, level, { status: "saving" });
    const res = await fetch("/api/admin/hints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labSlug: lab.slug, stage, level, text: entry.text, pointCost: entry.pointCost }),
    });
    updateHint(stage, level, { status: res.ok ? "saved" : "error" });
  }

  async function deleteHint(stage: string, level: number) {
    updateHint(stage, level, { text: "", status: "saving" });
    const params = new URLSearchParams({ labSlug: lab.slug, stage, level: String(level) });
    await fetch(`/api/admin/hints?${params}`, { method: "DELETE" });
    updateHint(stage, level, { text: "", status: "idle" });
  }

  return (
    <div className="p-8 space-y-10 max-w-3xl">
      {/* Header */}
      <div>
        <Link href="/admin/labs" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-3 block">
          ← All Labs
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{meta.title || "Untitled Lab"}</h1>
            <p className="text-zinc-600 text-sm font-mono mt-0.5">{lab.slug}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/labs/${lab.slug}`}
              className="text-xs text-zinc-500 border border-white/8 rounded-lg px-3 py-1.5 hover:text-zinc-300 transition"
            >
              Version history
            </Link>
            <button
              onClick={() => void deleteLab()}
              className="text-xs text-red-500/70 hover:text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 transition"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <Section title="Lab Details">
        <div className="space-y-4">
          <Field label="Title">
            <input value={meta.title} onChange={e => setField("title", e.target.value)} className={INPUT} />
          </Field>
          <Field label="Description">
            <textarea
              value={meta.description}
              onChange={e => setField("description", e.target.value)}
              rows={4}
              className={`${INPUT} resize-none`}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={meta.type} onChange={e => setField("type", e.target.value as LabType)} className={INPUT}>
                <option value="CTF">CTF</option>
                <option value="BLUE_TEAM">Blue Team</option>
                <option value="RED_TEAM">Red Team</option>
              </select>
            </Field>
            <Field label="Difficulty">
              <select value={meta.difficulty} onChange={e => setField("difficulty", e.target.value as Difficulty)} className={INPUT}>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
                <option value="INSANE">Insane</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <input value={meta.category} onChange={e => setField("category", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Points">
              <input type="number" min={1} max={10000} value={meta.points} onChange={e => setField("points", Number(e.target.value))} className={INPUT} />
            </Field>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => void saveMeta()}
              disabled={metaStatus === "saving"}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition"
            >
              {metaStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
            {metaStatus === "saved" && <span className="text-xs text-emerald-400">Saved ✓</span>}
            {metaStatus === "error" && <span className="text-xs text-red-400">Save failed</span>}
          </div>
        </div>
      </Section>

      {/* Flags */}
      <Section title="Flags">
        <div className="space-y-2 mb-4">
          {flags.length === 0 && <p className="text-sm text-zinc-600 italic">No flags yet.</p>}
          {flags.map(flag => (
            <div key={flag.id} className="flex items-center gap-3 bg-zinc-900/60 rounded-lg px-4 py-2.5 border border-white/6">
              <span className="flex-1 font-mono text-sm text-zinc-200 truncate">{flag.value}</span>
              <span className="text-xs text-zinc-500 tabular-nums shrink-0">{flag.points} pts</span>
              {!flag.caseSensitive && <span className="text-[10px] text-zinc-600 shrink-0">case-insensitive</span>}
              <button onClick={() => void removeFlag(flag.id)} className="text-[10px] text-red-500/70 hover:text-red-400 transition shrink-0">
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 space-y-3">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Add Flag</p>
          <div className="flex gap-3">
            <input
              value={newFlag.value}
              onChange={e => setNewFlag(f => ({ ...f, value: e.target.value }))}
              className={`${INPUT} flex-1 font-mono`}
              placeholder="SAGE{flag_value_here}"
            />
            <input
              type="number"
              min={0}
              max={10000}
              value={newFlag.points}
              onChange={e => setNewFlag(f => ({ ...f, points: Number(e.target.value) }))}
              className={`${INPUT} w-24`}
              title="Points"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newFlag.caseSensitive}
                onChange={e => setNewFlag(f => ({ ...f, caseSensitive: e.target.checked }))}
                className="rounded border-zinc-700"
              />
              Case sensitive
            </label>
            <button
              onClick={() => void addFlag()}
              disabled={flagAdding || !newFlag.value.trim()}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition"
            >
              {flagAdding ? "Adding…" : "Add flag"}
            </button>
          </div>
        </div>
      </Section>

      {/* Hints */}
      <Section title="Hints">
        <div className="space-y-6">
          {stages.map(stage => (
            <div key={stage} className="rounded-xl border border-white/8 bg-zinc-900/40 p-5 space-y-4">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-mono">{stage}</p>
              {([1, 2, 3] as const).map(lvl => {
                const entry = hintForm[stage]?.[lvl] ?? { text: "", pointCost: lvl * 10, status: "idle" };
                return (
                  <div key={lvl} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-zinc-400">Hint {lvl}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-zinc-600">Cost:</span>
                          <input
                            type="number"
                            min={0}
                            max={200}
                            value={entry.pointCost}
                            onChange={e => updateHint(stage, lvl, { pointCost: Number(e.target.value) })}
                            className="w-14 bg-zinc-800 border border-white/8 rounded px-2 py-0.5 text-xs text-zinc-300 text-center"
                          />
                          <span className="text-[10px] text-zinc-600">pts</span>
                        </div>
                        {entry.status === "saved" && <span className="text-[10px] text-emerald-400">Saved ✓</span>}
                        {entry.status === "error"  && <span className="text-[10px] text-red-400">Error</span>}
                        {entry.status === "saving" && <span className="text-[10px] text-zinc-500">Saving…</span>}
                      </div>
                      <div className="flex gap-2">
                        {entry.text && (
                          <button onClick={() => void deleteHint(stage, lvl)} className="text-[10px] text-red-500/70 hover:text-red-400 transition">
                            Remove
                          </button>
                        )}
                        <button
                          onClick={() => void saveHint(stage, lvl)}
                          disabled={!entry.text.trim() || entry.status === "saving"}
                          className="text-[10px] border border-zinc-700 rounded px-2 py-0.5 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition disabled:opacity-40"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={entry.text}
                      onChange={e => updateHint(stage, lvl, { text: e.target.value, status: "idle" })}
                      placeholder={`Hint level ${lvl} — nudge toward the answer, not the answer itself`}
                      rows={2}
                      className="w-full bg-zinc-800/60 border border-white/8 rounded-lg p-3 text-xs text-zinc-300 placeholder-zinc-700 resize-none focus:outline-none focus:border-emerald-500/40 font-mono leading-relaxed"
                    />
                  </div>
                );
              })}
            </div>
          ))}

          <div className="flex gap-3">
            <input
              value={newStage}
              onChange={e => setNewStage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStage(); } }}
              className={`${INPUT} flex-1 font-mono`}
              placeholder="Stage name — e.g. task_1 or reconnaissance"
            />
            <button
              onClick={addStage}
              disabled={!newStage.trim()}
              className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shrink-0"
            >
              Add stage
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700";

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
