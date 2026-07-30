"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { Icon } from "@/components/ui/icon";
type Role = "STUDENT" | "INSTRUCTOR" | "RECRUITER";

const ROLES: Array<{
  id: Role;
  title: string;
  subtitle: string;
  description: string;
  features: string[];
  color: string;
  border: string;
  badge: string;
}> = [
  {
    id: "STUDENT",
    title: "Student / Analyst",
    subtitle: "I want to train and prove my skills",
    description:
      "Access live incident simulations, CTF labs, learning paths, and earn certifications that recruiters can verify.",
    features: [
      "14+ hands-on labs (CTF, Blue Team, Red Team)",
      "AI-driven incident simulations",
      "MITRE ATT&CK skill tracking",
      "Shareable performance certificates",
      "Recruiter-visible score profile",
    ],
    color: "text-ok",
    border: "border-ok-edge hover:border-ok-edge",
    badge: "bg-ok-wash text-ok border-ok-edge",
  },
  {
    id: "INSTRUCTOR",
    title: "Instructor / Educator",
    subtitle: "I want to run exercises for my class or team",
    description:
      "Create classrooms, assign labs and simulations, grade students, and get class-wide analytics on skill gaps.",
    features: [
      "Classroom creation with join codes",
      "Assign labs and simulation scenarios",
      "Student progress and grade tracking",
      "Class-wide MITRE coverage analytics",
      "Curriculum gap recommendations",
    ],
    color: "text-info",
    border: "border-info-edge hover:border-info-edge",
    badge: "bg-info-wash text-info border-info-edge",
  },
  {
    id: "RECRUITER",
    title: "Recruiter / Hiring Manager",
    subtitle: "I want to assess and hire cybersecurity talent",
    description:
      "Run 45-minute live assessments, get automated scoring, and see exactly what candidates can and can't do — verified by simulation.",
    features: [
      "Candidate simulation assessment scores",
      "EXCEPTIONAL / STRONG / ADEQUATE ratings",
      "MITRE ATT&CK skill coverage per candidate",
      "Decision speed and response quality metrics",
      "Candidate bookmarking and job postings",
    ],
    color: "text-warn",
    border: "border-warn-edge hover:border-warn-edge",
    badge: "bg-warn-wash text-warn border-warn-edge",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selected, setSelected] = useState<Role | null>(null);
  const [name, setName] = useState(session?.user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selected) return;
    if (!name.trim()) { setError("Enter your name to continue."); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected, displayName: name.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string; detail?: string };
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      router.push("/complete-profile");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(`Failed: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-surface-0 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-3">Welcome to Sage Vault</p>
          <h1 className="text-3xl font-bold text-white mb-3">How will you use the platform?</h1>
          <p className="text-ink-2 text-sm max-w-lg mx-auto leading-relaxed">
            Choose your role so we can personalise your experience. You can change this any time in settings.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`text-left rounded-xl border p-5 transition-all ${selected === r.id ? r.border + " bg-surface-2 ring-1 ring-white/10" : "border-edge hover:border-edge-strong"}`}
            >
              <span className={`inline-block text-xs font-bold uppercase tracking-widest border rounded px-2 py-0.5 mb-3 ${r.badge}`}>
                {r.title}
              </span>
              <p className="text-sm text-ink-2 font-medium mb-1">{r.subtitle}</p>
              <p className="text-xs text-ink-3 leading-relaxed mb-4">{r.description}</p>
              <ul className="space-y-1.5">
                {r.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-ink-2">
                    <span className={`mt-0.5 shrink-0 w-1 h-1 rounded-full ${selected === r.id ? r.color.replace("text-", "bg-") : "bg-surface-3"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              {selected === r.id && (
                <div className={`mt-4 text-xs font-bold uppercase tracking-wider ${r.color}`}>
                  Selected <Icon name="check" size={14} className="inline-block shrink-0" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Name input + continue */}
        <div className="max-w-sm mx-auto">
          <label className="block text-xs text-ink-3 uppercase tracking-wider mb-1.5">Display Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should we address you?"
            className="w-full rounded-lg border border-edge bg-surface-1 px-4 py-2.5 text-sm text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge mb-4"
          />
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="w-full rounded-lg bg-accent-fill px-6 py-3 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? "Setting up your account…" : "Continue →"}
          </button>
          <p className="text-xs text-ink-3 text-center mt-3">
            You can switch roles anytime from your profile settings.
          </p>
        </div>
      </div>
    </main>
  );
}
