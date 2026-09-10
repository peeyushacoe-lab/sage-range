"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function StartMission({ slug, resuming }: { slug: string; resuming: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/missions/${slug}/start`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not start the investigation");
      setBusy(false);
      return;
    }
    router.push(`/missionanalyst/${slug}/investigate`);
  }

  return (
    <div>
      <Button onClick={go} disabled={busy}>
        {busy ? "Loading scene…" : resuming ? "Resume investigation" : "Enter the scene"}
      </Button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
