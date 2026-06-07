"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

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
    color: "text-sage-400",
    border: "border-sage-500/40 hover:border-sage-500",
    badge: "bg-sage-500/10 text-sage-400 border-sage-500/30",
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
    color: "text-blue-400",
    border: "border-blue-500/40 hover:border-blue-500",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
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
    color: "text-amber-400",
    border: "border-amber-500/40 hover:border-amber-500",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [selected, setSelected] = useState<Role | null>(null);
  const [name, setName] = useState(user?.fullName ?? "");
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
      if (!res.ok) throw new Error("Failed");

      // Refresh Clerk session in background — dashboard reads role from DB, not Clerk metadata
      user?.reload().catch(() => null);
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-sage-500 font-semibold mb-3">Welcome to Sage Forge</p>
          <h1 className="text-3xl font-bold text-white mb-3">How will you use the platform?</h1>
          <p className="text-zinc-400 text-sm max-w-lg mx-auto leading-relaxed">
            Choose your role so we can personalise your experience. You can change this any time in settings.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelected(r.id)}
              className={`text-left rounded-xl border p-5 transition-all ${selected === r.id ? r.border + " bg-white/5 ring-1 ring-white/10" : "border-white/10 hover:border-white/20"}`}
            >
              <span className={`inline-block text-xs font-bold uppercase tracking-widest border rounded px-2 py-0.5 mb-3 ${r.badge}`}>
                {r.title}
              </span>
              <p className="text-sm text-zinc-300 font-medium mb-1">{r.subtitle}</p>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">{r.description}</p>
              <ul className="space-y-1.5">
                {r.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                    <span className={`mt-0.5 shrink-0 w-1 h-1 rounded-full ${selected === r.id ? r.color.replace("text-", "bg-") : "bg-zinc-600"}`} />
                    {f}
                  </li>
                ))}
              </ul>
              {selected === r.id && (
                <div className={`mt-4 text-xs font-bold uppercase tracking-wider ${r.color}`}>
                  Selected ✓
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Name input + continue */}
        <div className="max-w-sm mx-auto">
          <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">Display Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should we address you?"
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/60 mb-4"
          />
          {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
          <button
            onClick={handleContinue}
            disabled={!selected || saving}
            className="w-full rounded-lg bg-sage-500 px-6 py-3 text-sm font-bold text-black hover:bg-sage-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? "Setting up your account…" : "Continue →"}
          </button>
          <p className="text-xs text-zinc-600 text-center mt-3">
            You can switch roles anytime from your profile settings.
          </p>
        </div>
      </div>
    </main>
  );
}
