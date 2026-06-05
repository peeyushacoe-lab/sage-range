"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Project = { name: string; description: string; url: string };

type Initial = {
  displayName: string; university: string; linkedIn: string; github: string;
  bio: string; skills: string[]; cvUrl: string;
  company: string; jobTitle: string; website: string;
  projects: Project[];
  expertise: string[];
  hiringFor: string[];
};

const STUDENT_SKILLS = [
  "CTF", "Web Security", "Network Security", "Forensics", "Malware Analysis",
  "Penetration Testing", "OSINT", "Reverse Engineering", "Cloud Security",
  "SOC Operations", "Threat Intelligence", "Incident Response", "SIEM",
  "Python", "Bash/Linux", "Active Directory", "MITRE ATT&CK",
];

const INSTRUCTOR_EXPERTISE = [
  "Web Security", "Network Security", "Digital Forensics", "Malware Analysis",
  "Penetration Testing", "Cloud Security", "SOC Operations", "Cryptography",
  "Reverse Engineering", "Threat Intelligence", "Incident Response",
  "CTF Design", "Security Architecture", "OSINT",
];

const HIRING_ROLES = [
  "SOC Analyst", "Threat Hunter", "Penetration Tester", "Incident Responder",
  "Security Engineer", "Cloud Security Engineer", "Malware Analyst",
  "Security Architect", "Red Team Operator", "DFIR Analyst", "GRC Analyst",
];

function ChipSelector({
  label, options, selected, onChange, color = "sage",
}: {
  label: string; options: string[]; selected: string[];
  onChange: (v: string[]) => void; color?: string;
}) {
  const colors: Record<string, string> = {
    sage:   "border-sage-500/60 bg-sage-500/10 text-sage-400",
    blue:   "border-blue-500/60 bg-blue-500/10 text-blue-400",
    amber:  "border-amber-500/60 bg-amber-500/10 text-amber-400",
  };
  const active = colors[color] ?? colors.sage;
  return (
    <div>
      <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onChange(on ? selected.filter((x) => x !== o) : [...selected, o])}
              className={`text-xs border rounded-full px-3 py-1 transition-all ${on ? active : "border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300"}`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", rows,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; rows?: number;
}) {
  const base = "w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition";
  return (
    <div>
      <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
      {rows ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className={`${base} resize-none`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} className={base} />
      )}
    </div>
  );
}

export function ProfileFormClient({ userId, role, initial }: {
  userId: string;
  role: string;
  initial: Initial;
}) {
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function set(key: keyof Omit<Initial, "skills" | "projects" | "expertise" | "hiringFor">) {
    return (v: string) => setForm((p) => ({ ...p, [key]: v }));
  }

  function setProjects(projects: Project[]) { setForm((p) => ({ ...p, projects })); }
  function addProject() { setProjects([...form.projects, { name: "", description: "", url: "" }]); }
  function removeProject(i: number) { setProjects(form.projects.filter((_, idx) => idx !== i)); }
  function updateProject(i: number, key: keyof Project, v: string) {
    setProjects(form.projects.map((p, idx) => idx === i ? { ...p, [key]: v } : p));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        displayName: form.displayName,
        university: form.university,
        linkedIn: form.linkedIn,
        github: form.github,
        bio: form.bio,
        skills: form.skills,
        cvUrl: form.cvUrl,
        company: form.company,
        jobTitle: form.jobTitle,
        website: form.website,
        profileExtra: {
          projects: form.projects,
          expertise: form.expertise,
          hiringFor: form.hiringFor,
        },
      }),
    });
    if (res.ok) {
      setSaved(true);
      startTransition(() => router.refresh());
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError("Failed to save. Please try again.");
    }
  }

  const inputBase = "w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition";

  return (
    <form onSubmit={save} className="space-y-6">
      {/* Common fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Display Name" value={form.displayName} onChange={set("displayName")} placeholder="How should we address you?" />
        {role === "STUDENT" && (
          <Field label="University / Institution" value={form.university} onChange={set("university")} placeholder="e.g. University of Edinburgh" />
        )}
        {(role === "RECRUITER" || role === "INSTRUCTOR") && (
          <Field label="Job Title" value={form.jobTitle} onChange={set("jobTitle")} placeholder={role === "RECRUITER" ? "e.g. Talent Acquisition Manager" : "e.g. Senior Lecturer"} />
        )}
      </div>

      <Field label="Bio" value={form.bio} onChange={set("bio")}
        placeholder={role === "STUDENT" ? "Tell us about yourself — your interests, goals, and cybersecurity journey." : role === "RECRUITER" ? "What kinds of candidates are you looking for? Describe your team and hiring philosophy." : "Your teaching background, research interests, and what you bring to students."}
        rows={3} />

      {/* Role-specific fields */}
      {role === "STUDENT" && (
        <>
          <ChipSelector label="Cybersecurity Skills" options={STUDENT_SKILLS} selected={form.skills} onChange={(v) => setForm((p) => ({ ...p, skills: v }))} color="sage" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="CV / Resume Link" value={form.cvUrl} onChange={set("cvUrl")} placeholder="https://drive.google.com/..." />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Projects</label>
              <button type="button" onClick={addProject} className="text-xs text-sage-400 hover:text-sage-300 transition">+ Add project</button>
            </div>
            <div className="space-y-3">
              {form.projects.map((p, i) => (
                <div key={i} className="rounded-lg border border-white/8 p-4 space-y-2 relative">
                  <button type="button" onClick={() => removeProject(i)} className="absolute top-3 right-3 text-zinc-600 hover:text-red-400 text-xs transition">✕</button>
                  <input value={p.name} onChange={(e) => updateProject(i, "name", e.target.value)}
                    placeholder="Project name" className={inputBase} />
                  <textarea value={p.description} onChange={(e) => updateProject(i, "description", e.target.value)}
                    placeholder="Short description" rows={2} className={`${inputBase} resize-none`} />
                  <input value={p.url} onChange={(e) => updateProject(i, "url", e.target.value)}
                    placeholder="GitHub or demo URL (optional)" className={inputBase} />
                </div>
              ))}
              {form.projects.length === 0 && (
                <p className="text-xs text-zinc-600 italic">No projects added yet. Showcase your work to recruiters.</p>
              )}
            </div>
          </div>
        </>
      )}

      {role === "RECRUITER" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company" value={form.company} onChange={set("company")} placeholder="e.g. CrowdStrike" />
            <Field label="Company Website" value={form.website} onChange={set("website")} placeholder="https://..." />
          </div>
          <ChipSelector label="Roles You're Hiring For" options={HIRING_ROLES} selected={form.hiringFor} onChange={(v) => setForm((p) => ({ ...p, hiringFor: v }))} color="amber" />
        </>
      )}

      {role === "INSTRUCTOR" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Institution / Company" value={form.company} onChange={set("company")} placeholder="e.g. University of Edinburgh" />
            <Field label="Website" value={form.website} onChange={set("website")} placeholder="https://..." />
          </div>
          <ChipSelector label="Areas of Expertise" options={INSTRUCTOR_EXPERTISE} selected={form.expertise} onChange={(v) => setForm((p) => ({ ...p, expertise: v }))} color="blue" />
          <Field label="University / Department" value={form.university} onChange={set("university")} placeholder="e.g. School of Informatics" />
        </>
      )}

      {/* Social links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="LinkedIn" value={form.linkedIn} onChange={set("linkedIn")} placeholder="https://linkedin.com/in/..." />
        {(role === "STUDENT") && (
          <Field label="GitHub" value={form.github} onChange={set("github")} placeholder="https://github.com/..." />
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={isPending}
        className="rounded-lg bg-zinc-100 text-zinc-900 px-5 py-2.5 text-sm font-bold hover:bg-white disabled:opacity-50 transition">
        {saved ? "Saved ✓" : isPending ? "Saving…" : "Save Profile"}
      </button>
    </form>
  );
}
