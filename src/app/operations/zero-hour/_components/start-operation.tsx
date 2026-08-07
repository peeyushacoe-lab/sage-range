"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * The one-way door.
 *
 * Starting spends the intern's single attempt and starts the three-hour clock,
 * so a first click asks for confirmation rather than acting. Resuming an
 * existing run skips the confirmation — the clock is already running and
 * making them confirm again only wastes it.
 */
export function StartOperation({ resuming }: { resuming: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/ozh/start", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not start the operation");
      setBusy(false);
      return;
    }
    router.push("/operations/zero-hour/console");
  }

  if (resuming) {
    return (
      <div className="w-full text-center">
        <Button size="lg" onClick={go} disabled={busy} className="w-full sm:w-auto">
          {busy ? "Opening console…" : "Resume operation"}
        </Button>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  if (!confirming) {
    return (
      <Button size="lg" onClick={() => setConfirming(true)} className="w-full sm:w-auto">
        Start Operation
      </Button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center">
      <p className="text-sm font-semibold text-red-300">This cannot be undone.</p>
      <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-zinc-400">
        Your three-hour clock starts the moment you confirm, and this is your only attempt.
        Closing the tab does not pause it.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
          Not yet
        </Button>
        <Button variant="danger" size="sm" onClick={go} disabled={busy}>
          {busy ? "Starting…" : "Start the clock"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
