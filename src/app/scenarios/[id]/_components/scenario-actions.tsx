"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import type { ScenarioVisibility } from "@/lib/scenario-sharing";

const VISIBILITY_OPTIONS: { value: ScenarioVisibility; label: string; help: string }[] = [
  { value: "PRIVATE", label: "Private", help: "Only you can open it." },
  { value: "UNLISTED", label: "Unlisted", help: "Anyone with the link, never listed." },
  { value: "COMMUNITY", label: "Community", help: "Listed publicly in the gallery." },
];

export function ScenarioActions({
  scenarioId,
  creatorId,
  isAuthor,
  initiallyFollowing,
  canClone,
  canEdit,
  visibility,
}: {
  scenarioId: string;
  creatorId: string;
  isAuthor: boolean;
  initiallyFollowing: boolean;
  canClone: boolean;
  canEdit: boolean;
  visibility: ScenarioVisibility;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(initiallyFollowing);
  const [vis, setVis] = useState<ScenarioVisibility>(visibility);
  const [error, setError] = useState<string | null>(null);

  const working = busy || pending;

  async function toggleFollow() {
    setBusy(true);
    setError(null);
    // Optimistic: following is low-stakes and the button should feel instant.
    const next = !following;
    setFollowing(next);
    try {
      const res = await fetch(`/api/creators/${creatorId}/follow`, {
        method: next ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setFollowing(!next);
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not update follow");
      }
    } catch {
      setFollowing(!next);
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function clone() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/clone`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Could not clone");
        return;
      }
      router.push(`/scenarios/${body.id}`);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function changeVisibility(next: ScenarioVisibility) {
    const previous = vis;
    setVis(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/visibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      if (!res.ok) {
        setVis(previous);
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not change visibility");
        return;
      }
      startTransition(() => router.refresh());
    } catch {
      setVis(previous);
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!isAuthor && (
        <Button variant="secondary" onClick={toggleFollow} disabled={working}>
          {following ? "Following" : "Follow creator"}
        </Button>
      )}

      {canClone && (
        <Button variant="secondary" onClick={clone} disabled={working}>
          {working ? "Cloning…" : "Clone"}
        </Button>
      )}

      {canEdit && (
        <>
          <select
            value={vis}
            onChange={(e) => changeVisibility(e.target.value as ScenarioVisibility)}
            disabled={working}
            title={VISIBILITY_OPTIONS.find((o) => o.value === vis)?.help}
            className="rounded-md border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Link
            href="/scenarios/builder"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
          >
            Builder
          </Link>
        </>
      )}

      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </div>
  );
}
