"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type FormState = {
  title: string;
  slug: string;
  description: string;
  type: "CTF" | "BLUE_TEAM" | "RED_TEAM";
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  category: string;
  points: number;
};

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500/50 placeholder-zinc-700";
const LABEL = "block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider";

export default function NewLabPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    title: "", slug: "", description: "",
    type: "CTF", difficulty: "MEDIUM", category: "", points: 100,
  });
  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(key: keyof FormState, value: string | number) {
    setForm(prev => ({
      ...prev,
      [key]: value,
      ...(key === "title" && !slugEdited ? { slug: slugify(String(value)) } : {}),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, points: Number(form.points) }),
      });
      const data = await res.json() as { slug?: string; error?: string };
      if (!res.ok) {
        setError(data.error === "slug_taken" ? "That slug is already in use — try a different one." : "Failed to create lab. Check all fields.");
        return;
      }
      router.push(`/admin/labs/${data.slug}/edit`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/admin/labs" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-4 block">
        ← All Labs
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">New Lab</h1>
      <p className="text-zinc-500 text-sm mb-8">You can add flags and hints after creating the lab.</p>

      <form onSubmit={e => void submit(e)} className="space-y-5">
        <div>
          <label className={LABEL}>Title</label>
          <input
            required
            value={form.title}
            onChange={e => handleChange("title", e.target.value)}
            className={INPUT}
            placeholder="e.g. SQL Injection 101"
          />
        </div>

        <div>
          <label className={LABEL}>Slug</label>
          <input
            required
            value={form.slug}
            onChange={e => {
              setSlugEdited(true);
              handleChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            className={`${INPUT} font-mono`}
            placeholder="sql-injection-101"
          />
          <p className="text-[11px] text-zinc-600 mt-1">URL-safe, lowercase, hyphens only. Auto-generated from title.</p>
        </div>

        <div>
          <label className={LABEL}>Description</label>
          <textarea
            required
            value={form.description}
            onChange={e => handleChange("description", e.target.value)}
            rows={4}
            className={`${INPUT} resize-none`}
            placeholder="What will students learn and do in this lab?"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Type</label>
            <select
              value={form.type}
              onChange={e => handleChange("type", e.target.value)}
              className={INPUT}
            >
              <option value="CTF">CTF</option>
              <option value="BLUE_TEAM">Blue Team</option>
              <option value="RED_TEAM">Red Team</option>
            </select>
          </div>
          <div>
            <label className={LABEL}>Difficulty</label>
            <select
              value={form.difficulty}
              onChange={e => handleChange("difficulty", e.target.value)}
              className={INPUT}
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="INSANE">Insane</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Category</label>
            <input
              required
              value={form.category}
              onChange={e => handleChange("category", e.target.value)}
              className={INPUT}
              placeholder="e.g. Web Security"
            />
          </div>
          <div>
            <label className={LABEL}>Points</label>
            <input
              type="number"
              required
              min={1}
              max={10000}
              value={form.points}
              onChange={e => handleChange("points", Number(e.target.value))}
              className={INPUT}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>}

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
          >
            {saving ? "Creating…" : "Create Lab →"}
          </button>
        </div>
      </form>
    </div>
  );
}
