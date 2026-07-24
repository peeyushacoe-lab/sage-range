"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Company = { id: string; name: string };
type Artifact = { id: string; type: string; title: string; content: string; order: number; tactic: string | null };
type Hint = { id: string; level: number; pointCost: number; text: string };
type Task = { id: string; order: number; title: string; prompt: string; answerType: string; correctAnswer: string; options: string[]; points: number; hints: Hint[] };

type SimMeta = {
  slug: string; codename: string; title: string; companyId: string; briefing: string;
  difficulty: string; estimatedMinutes: number; points: number; randomized: boolean; published: boolean;
};

const ARTIFACT_TYPES = ["EVENT_LOG", "SYSMON_LOG", "DEFENDER_LOG", "PCAP_SUMMARY", "EMAIL", "MEMORY_DUMP", "REGISTRY", "TIMELINE", "FILE_LISTING"];
const TACTICS = ["INITIAL_ACCESS", "PERSISTENCE", "PRIVILEGE_ESCALATION", "LATERAL_MOVEMENT", "COMMAND_AND_CONTROL", "EXFILTRATION", "IMPACT"];

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-sage-500/50 placeholder-zinc-700";
const LABEL = "block text-[11px] text-zinc-500 mb-1 font-medium uppercase tracking-wider";
const CARD = "rounded-xl border border-white/8 bg-zinc-900/40 p-5";

export function EditIncidentClient({
  sim, companies, artifacts, tasks,
}: { sim: SimMeta; companies: Company[]; artifacts: Artifact[]; tasks: Task[] }) {
  const router = useRouter();
  const [meta, setMeta] = useState(sim);
  const [savingMeta, setSavingMeta] = useState(false);

  async function saveMeta() {
    setSavingMeta(true);
    await fetch(`/api/admin/incidents/${sim.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        codename: meta.codename, title: meta.title, companyId: meta.companyId, briefing: meta.briefing,
        difficulty: meta.difficulty, estimatedMinutes: Number(meta.estimatedMinutes), points: Number(meta.points),
        randomized: meta.randomized, published: meta.published,
      }),
    });
    setSavingMeta(false);
    router.refresh();
  }

  return (
    <div className="p-8 max-w-4xl space-y-8">
      <div>
        <Link href="/admin/incidents" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-4 block">
          ← All Simulations
        </Link>
        <h1 className="text-2xl font-bold text-white mb-1">{sim.title}</h1>
        <p className="text-zinc-500 text-sm font-mono">{sim.slug}</p>
      </div>

      {/* Metadata */}
      <div className={CARD}>
        <h2 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Metadata</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Title</label>
              <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Codename</label>
              <input value={meta.codename} onChange={(e) => setMeta({ ...meta, codename: e.target.value })} className={INPUT} />
            </div>
          </div>
          <div>
            <label className={LABEL}>Company</label>
            <select value={meta.companyId} onChange={(e) => setMeta({ ...meta, companyId: e.target.value })} className={INPUT}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Briefing</label>
            <textarea value={meta.briefing} onChange={(e) => setMeta({ ...meta, briefing: e.target.value })} className={INPUT} rows={4} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={LABEL}>Difficulty</label>
              <select value={meta.difficulty} onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })} className={INPUT}>
                {["EASY", "MEDIUM", "HARD", "INSANE"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Est. minutes</label>
              <input type="number" value={meta.estimatedMinutes} onChange={(e) => setMeta({ ...meta, estimatedMinutes: Number(e.target.value) })} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Points</label>
              <input type="number" value={meta.points} onChange={(e) => setMeta({ ...meta, points: Number(e.target.value) })} className={INPUT} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" checked={meta.randomized} onChange={(e) => setMeta({ ...meta, randomized: e.target.checked })} />
              Randomized ({"{{TOKEN}}"} placeholders)
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-400">
              <input type="checkbox" checked={meta.published} onChange={(e) => setMeta({ ...meta, published: e.target.checked })} />
              Published
            </label>
          </div>
          <button onClick={() => void saveMeta()} disabled={savingMeta} className="bg-sage-500 hover:bg-sage-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition">
            {savingMeta ? "Saving…" : "Save metadata"}
          </button>
        </div>
      </div>

      <ArtifactsSection slug={sim.slug} initial={artifacts} />
      <TasksSection slug={sim.slug} initial={tasks} />
    </div>
  );
}

function ArtifactsSection({ slug, initial }: { slug: string; initial: Artifact[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: "EVENT_LOG", title: "", content: "", order: initial.length + 1, tactic: "" });

  async function add() {
    setSaving(true);
    const res = await fetch(`/api/admin/incidents/${slug}/artifacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, order: Number(form.order), tactic: form.tactic || null }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ type: "EVENT_LOG", title: "", content: "", order: initial.length + 2, tactic: "" });
      setShowForm(false);
      router.refresh();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/incidents/${slug}/artifacts?artifactId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Artifacts ({initial.length})</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-xs text-sage-400 hover:text-sage-300">
          {showForm ? "Cancel" : "+ Add artifact"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 mb-5 rounded-lg border border-white/10 p-4 bg-zinc-950/50">
          <div className="grid grid-cols-3 gap-3">
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={INPUT}>
              {ARTIFACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className={INPUT} placeholder="Order" />
            <select value={form.tactic} onChange={(e) => setForm({ ...form, tactic: e.target.value })} className={INPUT}>
              <option value="">No MITRE tactic</option>
              {TACTICS.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT} placeholder="Artifact title" />
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className={`${INPUT} font-mono`} rows={6} placeholder="Artifact content (supports {{TOKEN}} placeholders if randomized)" />
          <button onClick={() => void add()} disabled={saving || !form.title || !form.content} className="bg-sage-500 hover:bg-sage-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition">
            {saving ? "Adding…" : "Add artifact"}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {initial.map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/6 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-zinc-200">
                <span className="text-zinc-600 font-mono mr-2">#{a.order}</span>{a.title}
              </p>
              <p className="text-xs text-zinc-600">{a.type}{a.tactic ? ` · ${a.tactic.replace(/_/g, " ")}` : ""}</p>
            </div>
            <button onClick={() => void remove(a.id)} className="text-xs text-zinc-600 hover:text-red-400 shrink-0">Delete</button>
          </div>
        ))}
        {initial.length === 0 && <p className="text-sm text-zinc-600">No artifacts yet.</p>}
      </div>
    </div>
  );
}

function TasksSection({ slug, initial }: { slug: string; initial: Task[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    order: initial.length + 1, title: "", prompt: "", answerType: "FREE_TEXT", correctAnswer: "", optionsText: "", points: 100,
  });

  async function add() {
    setSaving(true);
    const options = form.answerType === "RADIO"
      ? form.optionsText.split("\n").map((s) => s.trim()).filter(Boolean)
      : [];
    const res = await fetch(`/api/admin/incidents/${slug}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: Number(form.order), title: form.title, prompt: form.prompt, answerType: form.answerType,
        correctAnswer: form.correctAnswer, options, points: Number(form.points),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setForm({ order: initial.length + 2, title: "", prompt: "", answerType: "FREE_TEXT", correctAnswer: "", optionsText: "", points: 100 });
      setShowForm(false);
      router.refresh();
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/incidents/${slug}/tasks?taskId=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tasks ({initial.length})</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-xs text-sage-400 hover:text-sage-300">
          {showForm ? "Cancel" : "+ Add task"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-3 mb-5 rounded-lg border border-white/10 p-4 bg-zinc-950/50">
          <div className="grid grid-cols-3 gap-3">
            <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className={INPUT} placeholder="Order" />
            <select value={form.answerType} onChange={(e) => setForm({ ...form, answerType: e.target.value })} className={INPUT}>
              <option value="FREE_TEXT">Free text</option>
              <option value="RADIO">Multiple choice</option>
            </select>
            <input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} className={INPUT} placeholder="Points" />
          </div>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT} placeholder="Task title" />
          <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} className={INPUT} rows={3} placeholder="Prompt shown to the student" />
          {form.answerType === "RADIO" && (
            <textarea value={form.optionsText} onChange={(e) => setForm({ ...form, optionsText: e.target.value })} className={INPUT} rows={3} placeholder={"One option per line — the correct answer below must match one of these exactly"} />
          )}
          <input value={form.correctAnswer} onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })} className={`${INPUT} font-mono`} placeholder="Correct answer (case-insensitive match for free text)" />
          <button onClick={() => void add()} disabled={saving || !form.title || !form.prompt || !form.correctAnswer} className="bg-sage-500 hover:bg-sage-400 disabled:opacity-50 text-black font-semibold px-4 py-2 rounded-lg text-sm transition">
            {saving ? "Adding…" : "Add task"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {initial.map((t) => (
          <TaskRow key={t.id} slug={slug} task={t} onDelete={() => void remove(t.id)} />
        ))}
        {initial.length === 0 && <p className="text-sm text-zinc-600">No tasks yet — this simulation is unplayable until at least one task exists.</p>}
      </div>
    </div>
  );
}

function TaskRow({ slug, task, onDelete }: { slug: string; task: Task; onDelete: () => void }) {
  const router = useRouter();
  const [showHintForm, setShowHintForm] = useState(false);
  const [hintForm, setHintForm] = useState({ level: task.hints.length + 1, pointCost: 10, text: "" });
  const [saving, setSaving] = useState(false);

  async function addHint() {
    setSaving(true);
    const res = await fetch(`/api/admin/incidents/${slug}/tasks/${task.id}/hints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: Number(hintForm.level), pointCost: Number(hintForm.pointCost), text: hintForm.text }),
    });
    setSaving(false);
    if (res.ok) {
      setHintForm({ level: task.hints.length + 2, pointCost: 10, text: "" });
      setShowHintForm(false);
      router.refresh();
    }
  }

  async function removeHint(hintId: string) {
    await fetch(`/api/admin/incidents/${slug}/tasks/${task.id}/hints?hintId=${hintId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-white/6 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-200">
            <span className="text-zinc-600 font-mono mr-2">#{task.order}</span>{task.title}
            <span className="text-xs text-zinc-600 ml-2">· {task.points} pts · {task.answerType}</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">{task.prompt}</p>
          <p className="text-xs text-sage-500/70 font-mono mt-1">answer: {task.correctAnswer}</p>
        </div>
        <button onClick={onDelete} className="text-xs text-zinc-600 hover:text-red-400 shrink-0">Delete</button>
      </div>

      <div className="mt-2 pl-4 border-l border-white/6 space-y-1.5">
        {task.hints.map((h) => (
          <div key={h.id} className="flex items-center justify-between gap-2">
            <p className="text-xs text-amber-400/80">Hint {h.level} (-{h.pointCost} pts): {h.text}</p>
            <button onClick={() => void removeHint(h.id)} className="text-[10px] text-zinc-600 hover:text-red-400 shrink-0">Remove</button>
          </div>
        ))}
        {!showHintForm ? (
          <button onClick={() => setShowHintForm(true)} className="text-[11px] text-sage-400 hover:text-sage-300">+ Add hint</button>
        ) : (
          <div className="flex items-center gap-2 pt-1">
            <input type="number" value={hintForm.level} onChange={(e) => setHintForm({ ...hintForm, level: Number(e.target.value) })} className={`${INPUT} w-16`} placeholder="Lvl" />
            <input type="number" value={hintForm.pointCost} onChange={(e) => setHintForm({ ...hintForm, pointCost: Number(e.target.value) })} className={`${INPUT} w-20`} placeholder="Cost" />
            <input value={hintForm.text} onChange={(e) => setHintForm({ ...hintForm, text: e.target.value })} className={INPUT} placeholder="Hint text" />
            <button onClick={() => void addHint()} disabled={saving || !hintForm.text} className="text-xs bg-sage-500 hover:bg-sage-400 disabled:opacity-50 text-black font-semibold px-3 py-2 rounded-lg shrink-0">
              Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
