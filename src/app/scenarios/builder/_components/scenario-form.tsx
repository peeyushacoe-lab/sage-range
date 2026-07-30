"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
const PERSONAS = [
  { id: "ransomware_gang",  label: "Ransomware Gang",    color: "text-danger",    badge: "border-danger-edge bg-danger-wash text-danger" },
  { id: "nation_state_apt", label: "Nation-State APT",   color: "text-accent", badge: "border-accent-edge bg-accent-wash text-accent" },
  { id: "insider",          label: "Malicious Insider",  color: "text-warn",  badge: "border-warn-edge bg-warn-wash text-warn" },
  { id: "hacktivist",       label: "Hacktivist",         color: "text-cyan-400",   badge: "border-cyan-500/40 bg-cyan-500/8 text-cyan-400" },
  { id: "cybercriminal",    label: "Cybercriminal",      color: "text-sev-high", badge: "border-sev-high-edge bg-sev-high-wash text-sev-high" },
];

const ARCHETYPES = [
  { id: "FINANCIAL_SERVICES", label: "Financial Services" },
  { id: "HEALTHCARE",         label: "Healthcare" },
  { id: "STARTUP",            label: "Startup / Tech" },
  { id: "GOVERNMENT",         label: "Government" },
  { id: "RETAIL",             label: "Retail" },
  { id: "TECHNOLOGY",         label: "Technology" },
];

const TEMPLATES = [
  { slug: "phishing-to-ransomware",  label: "Phishing → Ransomware",    stages: ["Phishing", "Compromise", "Lateral Movement", "Domain Takeover", "Exfiltration", "Ransomware"] },
  { slug: "insider-threat",          label: "Insider Threat",            stages: ["Suspicious Access", "Privilege Abuse", "Data Staging", "Active Exfil", "Breach"] },
  { slug: "cloud-misconfiguration",  label: "Cloud Misconfiguration",    stages: ["Discovery", "Credential Theft", "Lateral Movement", "Data Exfil"] },
  { slug: "supply-chain-attack",     label: "Supply Chain Attack",       stages: ["Detection", "Scope Analysis", "Vendor Notification", "Patch", "Customer Notification"] },
  { slug: "data-breach",             label: "Data Breach (SQL Injection)", stages: ["Detection", "Containment", "Forensics", "Regulatory Notification", "Customer Notification"] },
];

const DIFFICULTY_STYLES: Record<string, string> = {
  EASY:   "border-ok-edge text-ok",
  MEDIUM: "border-warn-edge text-warn",
  HARD:   "border-sev-high-edge text-sev-high",
  INSANE: "border-danger-edge text-danger",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-ink-2 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-surface-1 border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-ok-edge focus:ring-1 focus:ring-ok"
    />
  );
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full bg-surface-1 border border-edge rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-3 focus:outline-none focus:border-ok-edge focus:ring-1 focus:ring-ok resize-none"
    />
  );
}

export function ScenarioForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD" | "INSANE">("MEDIUM");
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [personaId, setPersonaId] = useState("ransomware_gang");
  const [archetypeId, setArchetypeId] = useState("FINANCIAL_SERVICES");
  const [templateSlug, setTemplateSlug] = useState("phishing-to-ransomware");
  const [objectives, setObjectives] = useState(["", ""]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [realWorldAnalogue, setRealWorldAnalogue] = useState("");
  const [publishNow, setPublishNow] = useState(false);

  function addObjective() { if (objectives.length < 8) setObjectives([...objectives, ""]); }
  function removeObjective(i: number) { setObjectives(objectives.filter((_, idx) => idx !== i)); }
  function updateObjective(i: number, v: string) { const n = [...objectives]; n[i] = v; setObjectives(n); }

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !tags.includes(tag) && tags.length < 12) setTags([...tags, tag]);
    setTagInput("");
  }
  function removeTag(t: string) { setTags(tags.filter((x) => x !== t)); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validObjectives = objectives.filter((o) => o.trim().length >= 5);
    if (!title.trim() || !subtitle.trim() || briefing.trim().length < 20) {
      setError("Title, subtitle, and briefing (20+ chars) are required.");
      return;
    }
    if (validObjectives.length < 1) {
      setError("Add at least one learning objective (5+ characters).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim(),
          briefing: briefing.trim(),
          difficulty,
          estimatedMinutes,
          personaId,
          archetypeId,
          templateSlug,
          learningObjectives: validObjectives,
          tags,
          realWorldAnalogue: realWorldAnalogue.trim() || undefined,
          published: publishNow,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to save scenario.");
        return;
      }
      const { id } = await res.json();
      setSuccess(`Scenario saved! ID: custom_${id}`);
      if (publishNow) {
        setTimeout(() => router.push("/simulation/new"), 1200);
      }
    } finally {
      setSaving(false);
    }
  }

  const selectedPersona = PERSONAS.find((p) => p.id === personaId)!;
  const selectedTemplate = TEMPLATES.find((t) => t.slug === templateSlug)!;

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Left — form */}
      <div className="space-y-6">
        {error && <div className="rounded-lg border border-danger-edge bg-danger-wash px-4 py-3 text-sm text-danger">{error}</div>}
        {success && <div className="rounded-lg border border-ok-edge bg-ok-wash px-4 py-3 text-sm text-ok">{success}</div>}

        <Field label="Scenario Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Operation Nightfall" maxLength={120} required />
        </Field>

        <Field label="Subtitle (threat description)">
          <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Ransomware targeting a financial institution" maxLength={200} required />
        </Field>

        <Field label="Briefing (2-3 sentences shown to students)">
          <Textarea
            value={briefing}
            onChange={(e) => setBriefing(e.target.value)}
            placeholder="Threat intelligence has flagged... Your SOC has detected..."
            rows={4}
            required
          />
          <p className="text-[11px] text-ink-3">{briefing.length} chars (min 20)</p>
        </Field>

        {/* Difficulty + Duration */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Difficulty">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="w-full bg-surface-1 border border-edge rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ok-edge"
            >
              {["EASY", "MEDIUM", "HARD", "INSANE"].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Est. Duration (min)">
            <Input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
              min={5} max={240}
            />
          </Field>
        </div>

        {/* Persona */}
        <Field label="Threat Actor Persona">
          <div className="grid grid-cols-1 gap-2">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersonaId(p.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                  personaId === p.id
                    ? `${p.badge} border-opacity-60`
                    : "border-edge text-ink-3 hover:border-edge-strong hover:text-ink-2"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${personaId === p.id ? p.color.replace("text-", "bg-") : "bg-surface-3"}`} />
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Industry */}
        <Field label="Target Industry">
          <div className="grid grid-cols-2 gap-2">
            {ARCHETYPES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setArchetypeId(a.id)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors ${
                  archetypeId === a.id
                    ? "border-ok-edge bg-ok-wash text-ok"
                    : "border-edge text-ink-3 hover:border-edge-strong hover:text-ink-2"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Template */}
        <Field label="Simulation Engine Template">
          <p className="text-xs text-ink-3 mb-2">The template drives the AI mechanics — your narrative wraps around it.</p>
          <div className="space-y-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => setTemplateSlug(t.slug)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  templateSlug === t.slug
                    ? "border-info-edge bg-info-wash text-info"
                    : "border-edge text-ink-3 hover:border-edge-strong hover:text-ink-2"
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <span className="ml-2 text-xs opacity-60">{t.stages.join(" → ")}</span>
              </button>
            ))}
          </div>
        </Field>

        {/* Learning Objectives */}
        <Field label="Learning Objectives">
          <div className="space-y-2">
            {objectives.map((obj, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={obj}
                  onChange={(e) => updateObjective(i, e.target.value)}
                  placeholder={`Objective ${i + 1}`}
                />
                {objectives.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeObjective(i)}
                    className="shrink-0 px-2 text-ink-3 hover:text-danger transition-colors"
                    aria-label="Remove"
                  >
                    <Icon name="close" size={14} className="inline-block shrink-0" />
                  </button>
                )}
              </div>
            ))}
            {objectives.length < 8 && (
              <button
                type="button"
                onClick={addObjective}
                className="text-xs text-ink-3 hover:text-ok transition-colors"
              >
                + Add objective
              </button>
            )}
          </div>
        </Field>

        {/* Tags */}
        <Field label="Tags (optional)">
          <div className="flex gap-2 flex-wrap mb-2">
            {tags.map((t) => (
              <span key={t} className="flex items-center gap-1 text-xs border border-edge rounded px-2 py-0.5 text-ink-2">
                {t}
                <button type="button" onClick={() => removeTag(t)} className="text-ink-3 hover:text-danger"><Icon name="close" size={14} className="inline-block shrink-0" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(tagInput); } }}
              placeholder="phishing, healthcare…  (Enter to add)"
            />
            <button type="button" onClick={() => addTag(tagInput)} className="shrink-0 px-3 py-2 text-xs border border-edge rounded-lg text-ink-2 hover:text-ink hover:border-edge-strong">
              Add
            </button>
          </div>
        </Field>

        {/* Real-world analogue */}
        <Field label="Real-World Analogue (optional)">
          <Input
            value={realWorldAnalogue}
            onChange={(e) => setRealWorldAnalogue(e.target.value)}
            placeholder="e.g. Colonial Pipeline 2021 / Change Healthcare 2024"
            maxLength={200}
          />
        </Field>

        {/* Publish toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setPublishNow(!publishNow)}
            className={`relative w-10 h-5 rounded-full transition-colors ${publishNow ? "bg-ok" : "bg-surface-3"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${publishNow ? "translate-x-5" : ""}`} />
          </div>
          <span className="text-sm text-ink-2">Publish immediately (students can deploy it)</span>
        </label>

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-accent-fill px-6 py-3 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving…" : publishNow ? "Save & Publish Scenario" : "Save as Draft"}
        </button>
      </div>

      {/* Right — live preview */}
      <div className="sticky top-6">
        <p className="text-[10px] uppercase tracking-widest text-ink-3 font-semibold mb-3">Live Preview</p>
        <div className="rounded-xl border border-edge bg-surface-1 p-5 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${selectedPersona.badge}`}>
              {selectedPersona.label}
            </span>
            <span className={`text-xs font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${DIFFICULTY_STYLES[difficulty]}`}>
              {difficulty}
            </span>
            <span className="text-xs text-ink-3">{estimatedMinutes} min</span>
            {realWorldAnalogue && (
              <span className="ml-auto text-[10px] text-ink-3 font-mono italic">↗ {realWorldAnalogue}</span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white">{title || <span className="text-ink-3 italic">Scenario Title</span>}</h3>
          <p className={`text-xs font-medium ${selectedPersona.color}`}>{subtitle || <span className="text-ink-3 italic">Subtitle</span>}</p>
          <p className="text-ink-2 text-sm leading-relaxed">{briefing || <span className="text-ink-3 italic">Briefing will appear here…</span>}</p>

          {objectives.filter((o) => o.trim().length >= 5).length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1.5">Learning Objectives</p>
              <ul className="space-y-0.5">
                {objectives.filter((o) => o.trim()).map((o, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-ink-2">
                    <span className={`mt-0.5 shrink-0 w-1 h-1 rounded-full ${selectedPersona.color.replace("text-", "bg-")}`} />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2 border-t border-edge-subtle">
            <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Engine</p>
            <p className="text-xs text-ink-3">
              {selectedTemplate.label} — {selectedTemplate.stages.join(" → ")}
            </p>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {tags.map((t) => (
                <span key={t} className="text-[10px] border border-edge rounded px-1.5 py-0.5 text-ink-3">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
