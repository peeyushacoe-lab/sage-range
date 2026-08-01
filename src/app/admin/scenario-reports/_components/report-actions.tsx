"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Uphold, dismiss, or restore.
 *
 * A resolution note is required when upholding: the author is shown it on
 * their scenario, and "removed, no reason given" is not a moderation decision
 * anyone can act on.
 */
export function ReportActions({
  reportId,
  alreadyTakenDown,
}: {
  reportId: string;
  alreadyTakenDown: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);

  const working = busy || pending;

  async function act(action: "UPHOLD" | "DISMISS" | "RESTORE") {
    if (action === "UPHOLD" && !resolution.trim()) {
      setError("Give a reason — the author is shown this.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/scenario-reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, resolution: resolution.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not apply that decision");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="Reason shown to the author (required to remove)"
        maxLength={2000}
        className="min-h-[60px] w-full rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button variant="danger" onClick={() => act("UPHOLD")} disabled={working}>
          {working ? "…" : "Remove scenario"}
        </Button>
        <Button variant="secondary" onClick={() => act("DISMISS")} disabled={working}>
          Dismiss report
        </Button>
        {alreadyTakenDown && (
          <Button variant="ghost" onClick={() => act("RESTORE")} disabled={working}>
            Restore
          </Button>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
