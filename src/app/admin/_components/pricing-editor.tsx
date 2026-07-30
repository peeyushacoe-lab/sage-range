"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanRow } from "@/lib/plan-pricing";

const DESCRIPTIONS: Record<string, string> = {
  STUDENT:    "Free forever — labs, paths & community.",
  INSTRUCTOR: "Classrooms, assignments & analytics.",
  RECRUITER:  "Talent search, assessments & bookmarks.",
};

export function PricingEditor({ initialPlans }: { initialPlans: PlanRow[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState(
    initialPlans.map((p) => ({ ...p, displayPrice: (p.priceAmt / 100).toFixed(2) }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function setPrice(role: string, val: string) {
    setPlans((prev) =>
      prev.map((p) => (p.role === role ? { ...p, displayPrice: val } : p))
    );
    setSaved(false);
    setError("");
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    const updates = plans.map((p) => ({
      role: p.role,
      priceAmt: Math.round(parseFloat(p.displayPrice || "0") * 100),
    }));

    if (updates.some((u) => isNaN(u.priceAmt) || u.priceAmt < 0)) {
      setError("All prices must be valid non-negative numbers.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Save failed."); return; }
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((p) => (
          <div
            key={p.role}
            className="rounded-xl border border-edge bg-surface-1 p-5 flex flex-col gap-3"
          >
            <div>
              <p className="font-semibold text-ink">{p.label}</p>
              <p className="text-xs text-ink-3 mt-0.5">{DESCRIPTIONS[p.role]}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-ink-3 text-sm">$</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={p.displayPrice}
                onChange={(e) => setPrice(p.role, e.target.value)}
                className="w-full rounded-lg bg-surface-2 border border-edge px-3 py-2 text-sm text-white focus:outline-none focus:border-ok-edge tabular-nums"
              />
              <span className="text-ink-3 text-xs whitespace-nowrap">/mo</span>
            </div>

            <p className="text-xs text-ink-3">
              {parseFloat(p.displayPrice || "0") === 0
                ? "Free — no payment required"
                : `$${parseFloat(p.displayPrice || "0").toFixed(2)} charged at sign-up`}
            </p>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-accent-fill text-white text-sm font-semibold hover:bg-accent-hover disabled:opacity-50 transition"
        >
          {saving ? "Saving…" : "Save prices"}
        </button>
        {saved && <p className="text-xs text-ok">Saved — new sign-ups will see updated prices.</p>}
      </div>
    </div>
  );
}
