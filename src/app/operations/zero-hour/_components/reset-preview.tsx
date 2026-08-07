"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Discard a preview run and start over.
 *
 * Only rendered for allowlisted accounts, and the endpoint re-checks both the
 * allowlist and the run's preview flag — this button is a convenience, not the
 * guard.
 */
export function ResetPreview() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ozh/preview/reset", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(body.error ?? "Could not reset");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={reset} disabled={busy}>
        {busy ? "Discarding…" : "Discard this run and start again"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
