"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { REPORT_REASONS, REPORT_REASON_LABEL, type ScenarioReportReason } from "@/lib/scenario-sharing";

/**
 * Report a scenario to moderators.
 *
 * Deliberately understated — a prominent report button invites misuse — but
 * always reachable, since a gallery of user-written content with no reporting
 * path has no way to correct itself.
 */
export function ReportScenario({
  scenarioId,
  alreadyReported,
}: {
  scenarioId: string;
  alreadyReported: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ScenarioReportReason>("INAPPROPRIATE");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(alreadyReported);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not submit the report");
        return;
      }
      setDone(true);
      setOpen(false);
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  if (done && !open) {
    return (
      <p className="text-xs text-zinc-600">
        Reported — thank you. A moderator will review this.{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="underline hover:text-zinc-400"
        >
          Update
        </button>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-zinc-600 underline transition-colors hover:text-red-400"
      >
        Report this scenario
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900/50 p-4">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
        Report this scenario
      </p>

      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as ScenarioReportReason)}
        className="w-full rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
      >
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {REPORT_REASON_LABEL[r]}
          </option>
        ))}
      </select>

      <textarea
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Anything else the moderator should know (optional)"
        maxLength={2000}
        className="mt-2 min-h-[70px] w-full rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
      />

      <div className="mt-3 flex items-center gap-2">
        <Button variant="danger" onClick={submit} disabled={busy}>
          {busy ? "Sending…" : "Submit report"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
