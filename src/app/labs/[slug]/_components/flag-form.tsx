"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result =
  | { kind: "idle" }
  | { kind: "correct"; points: number; alreadySolved: boolean }
  | { kind: "wrong" }
  | { kind: "error"; message: string };

export function FlagForm({ labSlug, alreadySolved }: { labSlug: string; alreadySolved: boolean }) {
  const [flag, setFlag] = useState("");
  const [result, setResult] = useState<Result>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!flag.trim()) return;

    setResult({ kind: "idle" });

    try {
      const res = await fetch("/api/labs/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labSlug, flag }),
      });

      if (!res.ok) {
        setResult({ kind: "error", message: `Server returned ${res.status}` });
        return;
      }

      const data = (await res.json()) as
        | { correct: true; points?: number; alreadySolved?: boolean }
        | { correct: false };

      if (data.correct) {
        setResult({
          kind: "correct",
          points: "points" in data && typeof data.points === "number" ? data.points : 0,
          alreadySolved: "alreadySolved" in data && data.alreadySolved === true,
        });
        startTransition(() => router.refresh());
      } else {
        setResult({ kind: "wrong" });
      }
    } catch (err) {
      setResult({ kind: "error", message: err instanceof Error ? err.message : "Network error" });
    }
  }

  if (alreadySolved && result.kind === "idle") {
    return (
      <div className="rounded-lg border border-sage-500/30 bg-sage-500/5 p-4 text-sm">
        <p className="text-sage-500 font-medium">✓ Solved</p>
        <p className="text-zinc-400 mt-1">You&apos;ve already captured this flag.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm font-medium">Submit flag</label>
      <div className="flex gap-2">
        <input
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
          placeholder="SAGE{...}"
          className="flex-1 rounded bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono focus:outline-none focus:border-sage-500"
        />
        <button
          type="submit"
          disabled={isPending || !flag.trim()}
          className="rounded bg-sage-500 px-4 py-2 text-sm font-medium text-black hover:bg-sage-700 hover:text-white disabled:opacity-50"
        >
          {isPending ? "Checking..." : "Submit"}
        </button>
      </div>

      {result.kind === "correct" && (
        <p className="text-sm text-sage-500">
          {result.alreadySolved
            ? "Correct — already counted."
            : `✓ Correct! +${result.points} points.`}
        </p>
      )}
      {result.kind === "wrong" && (
        <p className="text-sm text-red-400">✗ Not quite. Keep digging.</p>
      )}
      {result.kind === "error" && (
        <p className="text-sm text-red-400">{result.message}</p>
      )}
    </form>
  );
}
