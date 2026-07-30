"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
const SKILL_OPTIONS = [
  "Network Security", "Incident Response", "Malware Analysis", "OSINT",
  "Penetration Testing", "Digital Forensics", "Threat Intelligence",
  "SOC Operations", "Cloud Security", "Web Application Security",
  "Active Directory", "Reverse Engineering", "CTF", "Red Team", "Blue Team",
];

export default function CompleteProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    university: "",
    bio: "",
    linkedIn: "",
    github: "",
    skills: [] as string[],
  });

  function toggleSkill(skill: string) {
    setForm((f) => ({
      ...f,
      skills: f.skills.includes(skill)
        ? f.skills.filter((s) => s !== skill)
        : f.skills.length < 8 ? [...f.skills, skill] : f.skills,
    }));
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "me",
          university: form.university || undefined,
          bio: form.bio || undefined,
          linkedIn: form.linkedIn || undefined,
          github: form.github || undefined,
          skills: form.skills,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");

      // Mark profile as complete
      await fetch("/api/user/complete-profile", { method: "POST" });

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. You can skip and update your profile later.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    await fetch("/api/user/complete-profile", { method: "POST" }).catch(() => null);
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-ok-wash blur-3xl animate-orb-drift pointer-events-none" />

      <div className="relative z-10 w-full max-w-lg">

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-3 mb-10">
          {[
            { n: 1, label: "Role" },
            { n: 2, label: "Profile" },
            { n: 3, label: "Dashboard" },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
              <div className="flex flex-col items-center gap-1">
                <div className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  s.n < 2 ? "border-ok-edge bg-accent-fill text-white" :
                  s.n === 2 ? "border-ok-edge bg-ok-wash text-ok animate-glow-pulse" :
                  "border-edge-strong bg-surface-1 text-ink-3"
                }`}>
                  {s.n < 2 ? <Icon name="check" size={13} /> : s.n}
                </div>
                <span className={`text-[10px] font-mono uppercase tracking-wider ${s.n === 2 ? "text-ok" : "text-ink-3"}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && <div className={`w-12 h-px mb-4 ${s.n < 2 ? "bg-ok-wash" : "bg-surface-2"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-edge bg-surface-1 backdrop-blur p-8 animate-scale-in">
          <div className="mb-8">
            <p className="text-xs text-ink-3 font-mono uppercase tracking-widest mb-2">Step 2 of 3</p>
            <h1 className="text-2xl font-bold text-ink">Build your analyst profile</h1>
            <p className="text-ink-3 text-sm mt-1">
              Recruiters and instructors see this. Takes 60 seconds.
            </p>
          </div>

          <div className="space-y-5">
            {/* University */}
            <div>
              <label className="block text-xs text-ink-2 uppercase tracking-widest font-mono mb-2">
                University / Organisation
              </label>
              <input
                type="text"
                value={form.university}
                onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
                placeholder="e.g. University of Edinburgh"
                className="input-field"
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs text-ink-2 uppercase tracking-widest font-mono mb-2">
                Short bio <span className="text-ink-3">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="e.g. Final-year Computer Science student focused on threat intelligence and incident response..."
                className="input-field resize-none"
                maxLength={300}
              />
              <p className="text-[10px] text-ink-3 mt-1 text-right font-mono">{form.bio.length}/300</p>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-xs text-ink-2 uppercase tracking-widest font-mono mb-2">
                Your skills <span className="text-ink-3">(pick up to 8)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SKILL_OPTIONS.map((skill) => {
                  const selected = form.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        selected
                          ? "border-ok-edge bg-ok-wash text-ok"
                          : "border-edge bg-surface-2/50 text-ink-3 hover:border-edge-strong hover:text-ink-2"
                      }`}
                    >
                      {selected && <span className="mr-1"><Icon name="check" size={14} className="inline-block shrink-0" /></span>}{skill}
                    </button>
                  );
                })}
              </div>
              {form.skills.length === 8 && (
                <p className="text-[10px] text-warn mt-2 font-mono">Max 8 skills selected</p>
              )}
            </div>

            {/* Social links */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-ink-2 uppercase tracking-widest font-mono mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={form.linkedIn}
                  onChange={(e) => setForm((f) => ({ ...f, linkedIn: e.target.value }))}
                  placeholder="https://linkedin.com/in/..."
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-ink-2 uppercase tracking-widest font-mono mb-2">GitHub</label>
                <input
                  type="url"
                  value={form.github}
                  onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))}
                  placeholder="https://github.com/..."
                  className="input-field text-xs"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 text-xs text-danger bg-danger-wash rounded-lg px-3 py-2 border border-danger-edge">{error}</p>
          )}

          <div className="flex items-center gap-3 mt-8">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-glow flex-1 rounded-xl bg-accent-fill px-6 py-3 text-sm font-bold text-white disabled:opacity-50 transition-all"
            >
              {saving ? "Saving…" : "Complete Profile →"}
            </button>
            <button
              onClick={handleSkip}
              className="rounded-xl border border-edge px-5 py-3 text-sm text-ink-3 hover:text-ink-2 hover:border-edge-strong transition-all"
            >
              Skip
            </button>
          </div>

          <p className="text-xs text-ink-3 text-center mt-4">
            You can update everything anytime from your profile page.
          </p>
        </div>
      </div>
    </main>
  );
}
