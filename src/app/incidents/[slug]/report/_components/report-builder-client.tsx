"use client";

import { useState } from "react";
import Link from "next/link";

type FormState = {
  executiveSummary: string;
  incidentTimeline: string;
  technicalFindings: string;
  mitreMapping: string;
  indicatorsOfCompromise: string;
  businessImpact: string;
  containmentActions: string;
  recommendations: string;
};

const SECTIONS: { key: keyof FormState; label: string; help: string; rows: number }[] = [
  {
    key: "executiveSummary",
    label: "Executive Summary",
    help: "Two or three sentences a non-technical executive could read and understand what happened, how bad it was, and where things stand.",
    rows: 4,
  },
  {
    key: "incidentTimeline",
    label: "Incident Timeline",
    help: "Chronological sequence of events from initial compromise to containment, with approximate timestamps.",
    rows: 6,
  },
  {
    key: "technicalFindings",
    label: "Technical Findings",
    help: "What the investigation uncovered: patient zero, method of entry, tools used, lateral movement, persistence mechanisms.",
    rows: 6,
  },
  {
    key: "mitreMapping",
    label: "MITRE ATT&CK Mapping",
    help: "List the tactics and techniques observed (e.g. Initial Access — T1566 Phishing).",
    rows: 4,
  },
  {
    key: "indicatorsOfCompromise",
    label: "Indicators of Compromise",
    help: "Domains, IPs, file hashes, and account names tied to this incident — the artifacts a defender would block or hunt for.",
    rows: 4,
  },
  {
    key: "businessImpact",
    label: "Business Impact",
    help: "Systems affected, data at risk, downtime, and estimated cost or exposure to the organization.",
    rows: 4,
  },
  {
    key: "containmentActions",
    label: "Containment Actions",
    help: "What was done (or should be done) to isolate affected hosts, revoke credentials, and stop the spread.",
    rows: 4,
  },
  {
    key: "recommendations",
    label: "Recommendations",
    help: "Concrete follow-up actions to prevent recurrence — detection gaps to close, controls to add, processes to fix.",
    rows: 4,
  },
];

const EMPTY: FormState = {
  executiveSummary: "",
  incidentTimeline: "",
  technicalFindings: "",
  mitreMapping: "",
  indicatorsOfCompromise: "",
  businessImpact: "",
  containmentActions: "",
  recommendations: "",
};

export function ReportBuilderClient({
  simulationId,
  simulationSlug,
  title,
  company,
  timelineHint,
  existing,
}: {
  simulationId: string;
  simulationSlug: string;
  title: string;
  company: { name: string; industry: string; employeeCount: number };
  timelineHint: string | null;
  existing: (FormState & { submitted: boolean }) | null;
}) {
  const [form, setForm] = useState<FormState>(existing ?? EMPTY);
  const [submitted, setSubmitted] = useState(!!existing?.submitted);
  const [saving, setSaving] = useState<"draft" | "final" | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const filledCount = SECTIONS.filter((s) => form[s.key].trim().length > 0).length;
  const complete = filledCount === SECTIONS.length;

  function update(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(mode: "draft" | "final") {
    setSaving(mode);
    setError(null);
    try {
      const res = await fetch("/api/incidents/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simulationId, ...form, submit: mode === "final" }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error === "incomplete" ? "Fill in every section before submitting the final report." : "Something went wrong saving your report.");
        return;
      }
      setSavedAt(new Date());
      if (mode === "final") setSubmitted(true);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 print:max-w-none">
      <header className="mb-6 print:mb-4">
        <h1 className="text-2xl font-bold">Executive Report Builder</h1>
        <p className="text-zinc-500 text-sm mt-1">{title}</p>
        <p className="text-zinc-400 text-xs mt-2">
          {company.name} · {company.industry.toLowerCase()} · {company.employeeCount.toLocaleString()} employees
        </p>
        {submitted && (
          <span className="inline-block mt-3 rounded-full bg-sage-500/15 border border-sage-500/30 text-sage-400 text-xs font-medium px-3 py-1">
            Submitted
          </span>
        )}
      </header>

      {timelineHint && (
        <div className="mb-6 print:hidden">
          <button
            onClick={() => setShowHint((v) => !v)}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline decoration-dotted"
          >
            {showHint ? "Hide" : "Show"} raw timeline artifact for reference
          </button>
          {showHint && (
            <pre className="mt-2 rounded-lg border border-white/8 bg-zinc-900/50 p-4 text-[11px] text-zinc-400 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {timelineHint}
            </pre>
          )}
        </div>
      )}

      <div className="space-y-5">
        {SECTIONS.map((s) => (
          <div key={s.key}>
            <label className="block text-sm font-semibold text-zinc-200 mb-1">{s.label}</label>
            <p className="text-xs text-zinc-500 mb-2">{s.help}</p>
            <textarea
              value={form[s.key]}
              onChange={(e) => update(s.key, e.target.value)}
              rows={s.rows}
              disabled={submitted}
              className="w-full rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/50 disabled:opacity-70 print:border-none print:bg-transparent print:px-0"
              placeholder={`Write your ${s.label.toLowerCase()}…`}
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {!submitted ? (
        <div className="mt-8 flex items-center gap-3 print:hidden">
          <button
            onClick={() => save("draft")}
            disabled={saving !== null}
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-white/30 transition disabled:opacity-50"
          >
            {saving === "draft" ? "Saving…" : "Save Draft"}
          </button>
          <button
            onClick={() => save("final")}
            disabled={saving !== null || !complete}
            title={!complete ? "Fill in every section first" : undefined}
            className="rounded-lg bg-sage-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition disabled:opacity-40"
          >
            {saving === "final" ? "Submitting…" : `Submit Final Report (${filledCount}/${SECTIONS.length})`}
          </button>
          {savedAt && !submitted && (
            <span className="text-xs text-zinc-500">Draft saved {savedAt.toLocaleTimeString()}</span>
          )}
        </div>
      ) : (
        <div className="mt-8 flex items-center gap-3 print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-white/30 transition"
          >
            Print / Save as PDF
          </button>
          <Link
            href="/incidents"
            className="rounded-lg bg-sage-500 px-6 py-2.5 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition"
          >
            Back to Incident Simulations
          </Link>
        </div>
      )}
    </div>
  );
}
