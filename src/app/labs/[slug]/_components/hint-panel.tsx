"use client";

import { useState } from "react";

type HintSlot = {
  level: number;
  pointCost: number;
  text: string | null;
  unlocked: boolean;
};

export function HintPanel({ labId, stage }: { labId: string; stage: string }) {
  const [open, setOpen] = useState(false);
  const [hints, setHints] = useState<HintSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [buying, setBuying] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  async function loadHints() {
    if (hints.length > 0) { setOpen(true); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/labs/hint?labId=${encodeURIComponent(labId)}&stage=${encodeURIComponent(stage)}`);
      if (res.ok) {
        const data = (await res.json()) as { hints: HintSlot[] };
        setHints(data.hints);
      }
    } finally {
      setLoading(false);
      setOpen(true);
    }
  }

  function toggle() {
    if (!open) {
      void loadHints();
    } else {
      setOpen(false);
    }
  }

  async function buyHint(level: number) {
    setBuying(level);
    setErrors((p) => ({ ...p, [level]: "" }));
    try {
      const res = await fetch("/api/labs/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labId, stage, level }),
      });
      const data = (await res.json()) as { text?: string; error?: string; needed?: number };
      if (!res.ok) {
        const msg = data.needed
          ? `Not enough points (need ${data.needed} pts)`
          : (data.error ?? "Failed to buy hint");
        setErrors((p) => ({ ...p, [level]: msg }));
      } else if (data.text) {
        setHints((prev) =>
          prev.map((h) =>
            h.level === level ? { ...h, text: data.text!, unlocked: true } : h
          )
        );
      }
    } finally {
      setBuying(null);
    }
  }

  return (
    <div className="mt-4 border-t border-edge-subtle pt-3">
      <button
        type="button"
        onClick={toggle}
        className="text-xs text-ink-3 hover:text-ink-2 transition-colors"
      >
        {open ? "Hints ▴" : "Hints ▾"}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {loading && <p className="text-xs text-ink-3 font-mono">Loading hints…</p>}
          {hints.map((hint) => (
            <div key={hint.level}>
              {hint.unlocked && hint.text ? (
                <div className="rounded bg-surface-2 p-3">
                  <p className="text-xs text-ink-3 mb-1">Hint {hint.level}</p>
                  <p className="text-xs text-ink-2 font-mono">{hint.text}</p>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded bg-surface-1 border border-edge-subtle px-3 py-2">
                  <span className="text-xs text-ink-3">
                    Hint {hint.level} — costs {hint.pointCost} pts
                  </span>
                  <button
                    type="button"
                    disabled={buying === hint.level}
                    onClick={() => void buyHint(hint.level)}
                    className="text-xs border border-edge-strong rounded px-2 py-0.5 text-ink-2 hover:border-edge-strong hover:text-ink transition-colors disabled:opacity-50"
                  >
                    {buying === hint.level ? "…" : "Buy"}
                  </button>
                </div>
              )}
              {errors[hint.level] && (
                <p className="text-xs text-danger font-mono mt-1">{errors[hint.level]}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
