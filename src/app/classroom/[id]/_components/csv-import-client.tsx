"use client";

import { useState } from "react";

export function CsvImportClient({ classroomId }: { classroomId: string }) {
  const [open, setOpen] = useState(false);
  const [emailsText, setEmailsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ enrolled: number; notFound: number; errors: string[] } | null>(null);

  async function handleImport() {
    const emails = emailsText
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter(Boolean);
    if (emails.length === 0) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/classroom/${classroomId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json() as { enrolled: number; notFound: number; errors: string[] };
      setResult(data);
      if (data.enrolled > 0) setEmailsText("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-semibold text-ink-2 hover:text-white transition"
      >
        <span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        Bulk Import Students
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-edge p-4 space-y-3">
          <textarea
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            placeholder="Paste emails, one per line"
            rows={5}
            className="w-full rounded-lg bg-surface-1 border border-edge px-3 py-2 text-sm text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge resize-y"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={loading || !emailsText.trim()}
              className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white disabled:opacity-40 transition"
            >
              {loading ? "Importing…" : "Import"}
            </button>
            {result && (
              <p className="text-sm text-ink-2">
                Enrolled {result.enrolled} student{result.enrolled !== 1 ? "s" : ""}.
                {result.notFound > 0 && (
                  <span className="text-ink-3"> {result.notFound} email{result.notFound !== 1 ? "s" : ""} not found (they must sign up first).</span>
                )}
                {result.errors.length > 0 && (
                  <span className="text-danger"> {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}.</span>
                )}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
