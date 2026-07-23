"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "FUNDAMENTALS",         label: "Cybersecurity Fundamentals" },
  { value: "BLUE_TEAM",            label: "Blue Team" },
  { value: "RED_TEAM",             label: "Red Team" },
  { value: "FORENSICS",            label: "Digital Forensics" },
  { value: "SECURITY_ENGINEERING", label: "Security Engineering" },
  { value: "NETWORKING",           label: "Networking" },
  { value: "CLOUD",                label: "Cloud Security" },
];

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "INSANE"];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700";

export default function NewCoursePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: "", title: "", subtitle: "", description: "",
    category: "FUNDAMENTALS", difficulty: "EASY",
    estimatedHrs: 0, objectives: "", order: 0,
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(key: string, value: string | number) {
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === "title" && !slugEdited ? { slug: slugify(String(value)) } : {}),
    }));
  }

  async function submit() {
    setStatus("saving");
    setErrorMsg("");
    const res = await fetch("/api/admin/academy/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        estimatedHrs: Number(form.estimatedHrs),
        order: Number(form.order),
        objectives: form.objectives.split("\n").map(s => s.trim()).filter(Boolean),
      }),
    });
    if (res.ok) {
      const data = await res.json() as { id: string };
      router.push(`/admin/academy/${data.id}/edit`);
      return;
    }
    const data = await res.json() as { error?: string };
    setErrorMsg(data.error === "slug_taken" ? "That slug is already taken." : "Something went wrong.");
    setStatus("error");
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <a href="/admin/academy" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-3 block">← Academy</a>
        <h1 className="text-2xl font-bold text-white">New Course</h1>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Title</label>
          <input value={form.title} onChange={e => handleChange("title", e.target.value)} className={INPUT} placeholder="SOC Analyst Fundamentals" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Slug</label>
          <input
            value={form.slug}
            onChange={e => { setSlugEdited(true); handleChange("slug", e.target.value); }}
            className={`${INPUT} font-mono`}
            placeholder="soc-analyst-fundamentals"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Subtitle <span className="text-zinc-700 normal-case">(optional)</span></label>
          <input value={form.subtitle} onChange={e => handleChange("subtitle", e.target.value)} className={INPUT} placeholder="Short one-liner shown on the course card" />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Description</label>
          <textarea value={form.description} onChange={e => handleChange("description", e.target.value)} rows={4} className={`${INPUT} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Category</label>
            <select value={form.category} onChange={e => handleChange("category", e.target.value)} className={INPUT}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Difficulty</label>
            <select value={form.difficulty} onChange={e => handleChange("difficulty", e.target.value)} className={INPUT}>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Estimated Hours</label>
            <input type="number" min={0} value={form.estimatedHrs} onChange={e => handleChange("estimatedHrs", Number(e.target.value))} className={INPUT} />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Display Order</label>
            <input type="number" min={0} value={form.order} onChange={e => handleChange("order", Number(e.target.value))} className={INPUT} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider">Learning Objectives <span className="text-zinc-700 normal-case">(one per line)</span></label>
          <textarea value={form.objectives} onChange={e => handleChange("objectives", e.target.value)} rows={4} className={`${INPUT} resize-none`} placeholder={"Understand how a SOC operates\nAnalyse security alerts\nRespond to common incident types"} />
        </div>

        {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

        <button
          onClick={() => void submit()}
          disabled={status === "saving" || !form.title || !form.slug || !form.description}
          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
        >
          {status === "saving" ? "Creating…" : "Create Course"}
        </button>
      </div>
    </div>
  );
}
