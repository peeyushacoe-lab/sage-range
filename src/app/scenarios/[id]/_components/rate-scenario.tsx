"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export function RateScenario({
  scenarioId,
  initialStars,
  initialReview,
}: {
  scenarioId: string;
  initialStars: number;
  initialReview: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stars, setStars] = useState(initialStars);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(initialReview);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const working = busy || pending;
  const shown = hover || stars;

  async function submit() {
    if (stars < 1) {
      setError("Pick a star rating first");
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/scenarios/${scenarioId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars, review: review.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "Could not save your rating");
        return;
      }
      setSaved(true);
      startTransition(() => router.refresh());
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4 p-5">
      <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">
        {initialStars > 0 ? "Update your rating" : "Rate this scenario"}
      </p>

      <div className="mb-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => setStars(n)}
            disabled={working}
            className={`transition-colors ${
              n <= shown ? "text-amber-400" : "text-zinc-700 hover:text-zinc-500"
            }`}
          >
            <Icon name="star" size={22} />
          </button>
        ))}
        {stars > 0 && <span className="ml-2 font-mono text-sm text-zinc-400">{stars}/5</span>}
      </div>

      <textarea
        value={review}
        onChange={(e) => setReview(e.target.value)}
        placeholder="What worked, what did not? (optional)"
        maxLength={2000}
        className="min-h-[80px] w-full rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
      />

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={submit} disabled={working}>
          {working ? "Saving…" : initialStars > 0 ? "Update" : "Submit rating"}
        </Button>
        {saved && <span className="text-xs text-emerald-400">Saved</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </Card>
  );
}
