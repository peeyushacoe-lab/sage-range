"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewVoucherForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"pct" | "amt">("pct");
  const [discountPct, setDiscountPct] = useState(10);
  const [discountAmt, setDiscountAmt] = useState(0);
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setCode(""); setDiscountType("pct"); setDiscountPct(10);
    setDiscountAmt(0); setMaxUses(""); setExpiresAt(""); setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          discountPct: discountType === "pct" ? discountPct : 0,
          discountAmt: discountType === "amt" ? Math.round(discountAmt * 100) : 0,
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          expiresAt: expiresAt || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Failed"); return; }
      setOpen(false);
      reset();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition"
      >
        + New Voucher
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border border-white/10 bg-zinc-950 w-full max-w-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">New Voucher</p>
        <button type="button" onClick={() => { setOpen(false); reset(); }} className="text-zinc-500 hover:text-white text-xs">✕ Cancel</button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-zinc-500">Code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          placeholder="e.g. LAUNCH50"
          className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 uppercase tracking-widest font-mono"
        />
      </div>

      {/* Discount type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDiscountType("pct")}
          className={`flex-1 text-xs py-2 rounded-lg border transition ${discountType === "pct" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-zinc-500 hover:text-white"}`}
        >
          % Off
        </button>
        <button
          type="button"
          onClick={() => setDiscountType("amt")}
          className={`flex-1 text-xs py-2 rounded-lg border transition ${discountType === "amt" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-white/10 text-zinc-500 hover:text-white"}`}
        >
          $ Off
        </button>
      </div>

      {discountType === "pct" ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Discount %</label>
          <input
            type="number" min={1} max={100}
            value={discountPct}
            onChange={(e) => setDiscountPct(Number(e.target.value))}
            className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/60"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Discount amount ($)</label>
          <input
            type="number" min={0.01} step={0.01}
            value={discountAmt}
            onChange={(e) => setDiscountAmt(Number(e.target.value))}
            className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/60"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Max uses (optional)</label>
          <input
            type="number" min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Unlimited"
            className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500">Expires (optional)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="rounded-lg bg-zinc-900 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/60"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading || !code.trim()}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-40 transition"
      >
        {loading ? "Creating…" : "Create Voucher"}
      </button>
    </form>
  );
}
