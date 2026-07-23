"use client";

import { useState } from "react";
import Link from "next/link";

type Category = "FUNDAMENTALS"|"BLUE_TEAM"|"RED_TEAM"|"FORENSICS"|"SECURITY_ENGINEERING"|"NETWORKING"|"CLOUD";
type Difficulty = "EASY"|"MEDIUM"|"HARD"|"INSANE";

type Course = {
  id: string; slug: string; title: string; subtitle: string; description: string;
  category: Category; difficulty: Difficulty; estimatedHrs: number; thumbnail: string;
  published: boolean; order: number; objectives: string[]; prerequisites: string[];
};

type ModuleRow = {
  id: string; title: string; description: string; order: number;
  published: boolean; lessonCount: number; hasQuiz: boolean;
};

const CATEGORIES = [
  { value: "FUNDAMENTALS",         label: "Cybersecurity Fundamentals" },
  { value: "BLUE_TEAM",            label: "Blue Team" },
  { value: "RED_TEAM",             label: "Red Team" },
  { value: "FORENSICS",            label: "Digital Forensics" },
  { value: "SECURITY_ENGINEERING", label: "Security Engineering" },
  { value: "NETWORKING",           label: "Networking" },
  { value: "CLOUD",                label: "Cloud Security" },
];

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700";

export function EditCourseClient({ course: init, modules: initModules }: { course: Course; modules: ModuleRow[] }) {
  const [course, setCourse] = useState(init);
  const [metaStatus, setMetaStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [modules, setModules] = useState(initModules);
  const [newMod, setNewMod] = useState({ title: "", description: "" });
  const [addingMod, setAddingMod] = useState(false);

  function setField<K extends keyof Course>(k: K, v: Course[K]) {
    setCourse(p => ({ ...p, [k]: v }));
    setMetaStatus("idle");
  }

  async function saveMeta() {
    setMetaStatus("saving");
    const res = await fetch(`/api/admin/academy/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...course,
        estimatedHrs: Number(course.estimatedHrs),
        order: Number(course.order),
      }),
    });
    setMetaStatus(res.ok ? "saved" : "error");
  }

  async function deleteCourse() {
    if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/academy/courses/${course.id}`, { method: "DELETE" });
    if (res.ok) { window.location.href = "/admin/academy"; return; }
    const data = await res.json() as { error?: string };
    alert(data.error === "has_enrollments" ? "Cannot delete — students are enrolled." : "Delete failed.");
  }

  async function addModule() {
    if (!newMod.title.trim()) return;
    setAddingMod(true);
    const order = modules.length;
    const res = await fetch(`/api/admin/academy/courses/${course.id}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newMod, order }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      setModules(m => [...m, { id: data.id, title: newMod.title, description: newMod.description, order, published: false, lessonCount: 0, hasQuiz: false }]);
      setNewMod({ title: "", description: "" });
    }
    setAddingMod(false);
  }

  async function deleteModule(id: string) {
    if (!confirm("Delete this module and all its lessons?")) return;
    await fetch(`/api/admin/academy/modules/${id}`, { method: "DELETE" });
    setModules(m => m.filter(x => x.id !== id));
  }

  return (
    <div className="p-8 space-y-10 max-w-3xl">
      <div>
        <Link href="/admin/academy" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-3 block">← Academy</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{course.title || "Untitled Course"}</h1>
            <p className="text-zinc-600 text-sm font-mono mt-0.5">{course.slug}</p>
          </div>
          <button onClick={() => void deleteCourse()} className="text-xs text-red-500/70 hover:text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 transition shrink-0">
            Delete
          </button>
        </div>
      </div>

      {/* Course Metadata */}
      <Section title="Course Details">
        <div className="space-y-4">
          <Field label="Title"><input value={course.title} onChange={e => setField("title", e.target.value)} className={INPUT} /></Field>
          <Field label="Subtitle">
            <input value={course.subtitle} onChange={e => setField("subtitle", e.target.value)} className={INPUT} placeholder="One-liner for the course card" />
          </Field>
          <Field label="Description">
            <textarea value={course.description} onChange={e => setField("description", e.target.value)} rows={4} className={`${INPUT} resize-none`} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={course.category} onChange={e => setField("category", e.target.value as Category)} className={INPUT}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Difficulty">
              <select value={course.difficulty} onChange={e => setField("difficulty", e.target.value as Difficulty)} className={INPUT}>
                {["EASY","MEDIUM","HARD","INSANE"].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Estimated Hours">
              <input type="number" min={0} value={course.estimatedHrs} onChange={e => setField("estimatedHrs", Number(e.target.value))} className={INPUT} />
            </Field>
            <Field label="Display Order">
              <input type="number" min={0} value={course.order} onChange={e => setField("order", Number(e.target.value))} className={INPUT} />
            </Field>
          </div>
          <Field label="Learning Objectives (one per line)">
            <textarea
              value={course.objectives.join("\n")}
              onChange={e => setField("objectives", e.target.value.split("\n"))}
              rows={4}
              className={`${INPUT} resize-none`}
            />
          </Field>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
              <input type="checkbox" checked={course.published} onChange={e => setField("published", e.target.checked)} className="rounded border-zinc-700" />
              Published (visible to students)
            </label>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => void saveMeta()} disabled={metaStatus === "saving"} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
              {metaStatus === "saving" ? "Saving…" : "Save Changes"}
            </button>
            {metaStatus === "saved" && <span className="text-xs text-emerald-400">Saved ✓</span>}
            {metaStatus === "error"  && <span className="text-xs text-red-400">Save failed</span>}
          </div>
        </div>
      </Section>

      {/* Modules */}
      <Section title="Modules">
        <div className="space-y-2 mb-4">
          {modules.length === 0 && <p className="text-sm text-zinc-600 italic">No modules yet.</p>}
          {modules.map((mod, i) => (
            <div key={mod.id} className="flex items-center gap-3 bg-zinc-900/60 rounded-lg px-4 py-3 border border-white/6">
              <span className="text-xs text-zinc-600 w-5 tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{mod.title}</p>
                <p className="text-xs text-zinc-600">{mod.lessonCount} lesson{mod.lessonCount !== 1 ? "s" : ""}{mod.hasQuiz ? " · quiz" : ""}</p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${mod.published ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 bg-zinc-800"}`}>
                {mod.published ? "Live" : "Draft"}
              </span>
              <Link href={`/admin/academy/${course.id}/modules/${mod.id}/lessons`} className="text-xs text-zinc-500 hover:text-emerald-400 transition">
                Edit
              </Link>
              <button onClick={() => void deleteModule(mod.id)} className="text-[10px] text-red-500/60 hover:text-red-400 transition">
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-white/8 bg-zinc-900/30 p-4 space-y-3">
          <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Add Module</p>
          <input value={newMod.title} onChange={e => setNewMod(p => ({ ...p, title: e.target.value }))} className={INPUT} placeholder="Module title" />
          <input value={newMod.description} onChange={e => setNewMod(p => ({ ...p, description: e.target.value }))} className={INPUT} placeholder="Short description (optional)" />
          <button onClick={() => void addModule()} disabled={addingMod || !newMod.title.trim()} className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition">
            {addingMod ? "Adding…" : "Add Module"}
          </button>
        </div>
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
