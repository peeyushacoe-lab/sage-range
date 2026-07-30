"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type Company = { id: string; name: string; slug: string };

const INPUT = "w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-sage-500/50 placeholder-zinc-700";
const LABEL = "block text-xs text-zinc-400 mb-1.5 font-medium uppercase tracking-wider";

export default function NewIncidentPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [newCompany, setNewCompany] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", codename: "", companyId: "",
    briefing: "", difficulty: "MEDIUM" as "EASY" | "MEDIUM" | "HARD" | "INSANE",
    estimatedMinutes: 90, points: 1000, randomized: false,
  });
  const [companyForm, setCompanyForm] = useState({
    name: "", slug: "", industry: "TECHNOLOGY", description: "", employeeCount: 500,
  });

  const [slugEdited, setSlugEdited] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/companies").then((r) => r.json()).then((d) => {
      setCompanies(d.companies ?? []);
      if (d.companies?.length) setForm((f) => ({ ...f, companyId: d.companies[0].id }));
    }).catch(() => null);
  }, []);

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({
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
      let companyId = form.companyId;

      if (newCompany) {
        const cRes = await fetch("/api/admin/companies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...companyForm, employeeCount: Number(companyForm.employeeCount) }),
        });
        const cData = await cRes.json() as { id?: string; error?: string };
        if (!cRes.ok || !cData.id) {
          setError(cData.error === "slug_taken" ? "Company slug already in use." : "Failed to create company.");
          setSaving(false);
          return;
        }
        companyId = cData.id;
      }

      if (!companyId) {
        setError("Select or create a company first.");
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          companyId,
          estimatedMinutes: Number(form.estimatedMinutes),
          points: Number(form.points),
        }),
      });
      const data = await res.json() as { slug?: string; error?: string };
      if (!res.ok) {
        setError(data.error === "slug_taken" ? "That slug is already in use." : "Failed to create simulation. Check all fields.");
        return;
      }
      router.push(`/admin/incidents/${data.slug}/edit`);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href="/admin/incidents" className="text-xs text-zinc-600 hover:text-zinc-400 transition mb-4 block">
        ← All Simulations
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">New Boss Fight Simulation</h1>
      <p className="text-zinc-500 text-sm mb-8">You'll add artifacts, tasks, and hints after creating the shell.</p>

      <form onSubmit={(e) => void submit(e)} className="space-y-5">
        <div>
          <label className={LABEL}>Title</label>
          <input required value={form.title} onChange={(e) => handleChange("title", e.target.value)} className={INPUT} placeholder="e.g. Ransomware at Finance Department" />
        </div>
        <div>
          <label className={LABEL}>Codename</label>
          <input required value={form.codename} onChange={(e) => handleChange("codename", e.target.value)} className={INPUT} placeholder="e.g. Operation Midnight Ledger" />
        </div>
        <div>
          <label className={LABEL}>Slug</label>
          <input required value={form.slug} onChange={(e) => { setSlugEdited(true); handleChange("slug", e.target.value); }} className={`${INPUT} font-mono`} placeholder="fin-2026-005-ransomware" />
        </div>

        <div className="border-t border-white/10 pt-5">
          <div className="flex items-center justify-between mb-3">
            <label className={LABEL + " mb-0"}>Company</label>
            <button type="button" onClick={() => setNewCompany((v) => !v)} className="text-xs text-sage-400 hover:text-sage-300">
              {newCompany ? "Use existing company" : "+ Create new company"}
            </button>
          </div>

          {!newCompany ? (
            <select value={form.companyId} onChange={(e) => handleChange("companyId", e.target.value)} className={INPUT}>
              {companies.length === 0 && <option value="">No companies yet — create one</option>}
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <div className="space-y-3 rounded-lg border border-white/10 p-4 bg-zinc-900/50">
              <input required value={companyForm.name} onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value, slug: slugify(e.target.value) }))} className={INPUT} placeholder="Company name" />
              <input required value={companyForm.slug} onChange={(e) => setCompanyForm((f) => ({ ...f, slug: e.target.value }))} className={`${INPUT} font-mono`} placeholder="company-slug" />
              <select value={companyForm.industry} onChange={(e) => setCompanyForm((f) => ({ ...f, industry: e.target.value }))} className={INPUT}>
                {["FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "GOVERNMENT", "TECHNOLOGY"].map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <textarea required value={companyForm.description} onChange={(e) => setCompanyForm((f) => ({ ...f, description: e.target.value }))} className={INPUT} rows={2} placeholder="Short company description" />
              <input required type="number" value={companyForm.employeeCount} onChange={(e) => setCompanyForm((f) => ({ ...f, employeeCount: Number(e.target.value) }))} className={INPUT} placeholder="Employee count" />
            </div>
          )}
        </div>

        <div>
          <label className={LABEL}>Briefing (shown to students before they start)</label>
          <textarea required value={form.briefing} onChange={(e) => handleChange("briefing", e.target.value)} className={INPUT} rows={4} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL}>Difficulty</label>
            <select value={form.difficulty} onChange={(e) => handleChange("difficulty", e.target.value as typeof form.difficulty)} className={INPUT}>
              {["EASY", "MEDIUM", "HARD", "INSANE"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL}>Est. minutes</label>
            <input type="number" value={form.estimatedMinutes} onChange={(e) => handleChange("estimatedMinutes", Number(e.target.value))} className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Points</label>
            <input type="number" value={form.points} onChange={(e) => handleChange("points", Number(e.target.value))} className={INPUT} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" checked={form.randomized} onChange={(e) => handleChange("randomized", e.target.checked)} />
          Randomized — artifacts/tasks may use {"{{TOKEN}}"} placeholders (usernames, IPs, dates, attacker aliases)
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" disabled={saving} className="bg-sage-500 hover:bg-sage-400 disabled:opacity-50 text-black font-semibold px-5 py-2.5 rounded-lg text-sm transition">
          {saving ? "Creating…" : "Create simulation"}
        </button>
      </form>
    </div>
  );
}
