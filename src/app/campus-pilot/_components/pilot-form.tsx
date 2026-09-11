"use client";

import { useState, type FormEvent } from "react";

const STUDENT_RANGES = ["Under 25", "25–100", "100–500", "500+"];

export function PilotForm() {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      universityName: String(form.get("universityName") ?? ""),
      contactName: String(form.get("contactName") ?? ""),
      contactEmail: String(form.get("contactEmail") ?? ""),
      contactRole: String(form.get("contactRole") ?? ""),
      department: String(form.get("department") ?? ""),
      studentEstimate: String(form.get("studentEstimate") ?? ""),
      country: String(form.get("country") ?? ""),
      message: String(form.get("message") ?? ""),
      heardFrom: String(form.get("heardFrom") ?? ""),
      website: String(form.get("website") ?? ""), // honeypot
    };

    const res = await fetch("/api/partners/campus-pilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // The API now returns a specific, field-level message (e.g. "Enter
      // your full name") rather than a bare "invalid_input" — show that
      // directly instead of a generic failure the form gave no way to act on.
      setError(typeof err.error === "string" ? err.error : "Something went wrong — please try again.");
      setBusy(false);
      return;
    }

    setSubmitted(true);
    setBusy(false);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-10 text-center">
        <p className="mb-2 text-3xl">✓</p>
        <h2 className="mb-2 text-xl font-bold text-zinc-100">You&apos;re on the list</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Thanks for applying to the Campus Pilot Program. Our team will review your submission and reach out to
          the email you provided within a few business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
      {/* Honeypot field — hidden from real users via CSS, not `display:none`/`hidden`
          attribute (some bots skip those specifically), left focusable-but-invisible. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="University / Institution" name="universityName" required minLength={2} placeholder="e.g. State University" full />
        <Field label="Your name" name="contactName" required minLength={2} placeholder="Jane Smith" />
        <Field label="Your email" name="contactEmail" type="email" required placeholder="jane@university.edu" />
        <Field label="Your role" name="contactRole" required minLength={2} placeholder="Professor, IT Director, ..." />
        <Field label="Department" name="department" placeholder="Computer Science (optional)" />

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Estimated students</label>
          <select
            name="studentEstimate"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200"
            defaultValue=""
          >
            <option value="">Select…</option>
            {STUDENT_RANGES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <Field label="Country" name="country" placeholder="Optional" />

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
            What are you hoping to run? <span className="font-normal text-zinc-600">(optional)</span>
          </label>
          <textarea
            name="message"
            rows={4}
            placeholder="A course, a club, a bootcamp cohort — whatever context helps us understand your program."
            className="w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
        </div>

        <Field label="How did you hear about us?" name="heardFrom" placeholder="Optional" full />
      </div>

      {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Submitting…" : "Apply for the pilot"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
  placeholder,
  full,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label className="mb-1.5 block text-xs font-semibold text-zinc-400">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600"
      />
    </div>
  );
}
