"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Triggers a fresh skill-gap analysis for the current user.
 *
 * The endpoint is a POST because it writes a snapshot; on success we refresh
 * the server component rather than mirroring the returned figures into local
 * state, so the page keeps a single source of truth.
 */
export function AnalyseGapButton({
  slug,
  hasSnapshot,
}: {
  slug: string;
  hasSnapshot: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/career/roles/${slug}/gap`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Analysis failed");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  const running = busy || pending;

  return (
    <div className="text-right">
      <Button onClick={run} disabled={running}>
        {running ? "Analysing…" : hasSnapshot ? "Re-analyse" : "Analyse my readiness"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
