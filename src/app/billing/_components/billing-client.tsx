"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  plan: string | null;
  status: string | null;
  trialEndsAt: string | null;
  hasSubscription: boolean;
};

export function BillingClient({ plan, status, trialEndsAt, hasSubscription }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function openPortal() {
    setLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json() as { url?: string };
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  async function startCheckout() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "classroom" }),
    });
    const data = await res.json() as { url?: string };
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  const isActive = status === "active" || status === "trialing";
  const trialEnd = trialEndsAt ? new Date(trialEndsAt) : null;
  const daysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null;

  if (!hasSubscription) {
    return (
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-8 text-center max-w-md mx-auto">
        <p className="text-zinc-400 text-sm mb-2">Billing</p>
        <h2 className="text-xl font-bold mb-4">Payments coming soon</h2>
        <p className="text-zinc-500 text-sm">
          Full platform access is currently free during our pilot. Subscription setup is in progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 divide-y divide-white/8">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Plan</p>
            <p className="font-semibold capitalize">{plan ?? "Classroom"}</p>
          </div>
          <span className={`text-xs font-bold uppercase border rounded px-2 py-0.5 ${
            isActive ? "text-sage-400 border-sage-500/40 bg-sage-500/10"
            : status === "past_due" ? "text-red-400 border-red-500/40 bg-red-500/10"
            : "text-zinc-400 border-zinc-700 bg-zinc-800"
          }`}>
            {status === "trialing" ? "Trial" : status ?? "Unknown"}
          </span>
        </div>

        {status === "trialing" && daysLeft !== null && (
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Trial</p>
            <p className="text-sm">
              <span className="font-bold text-amber-400">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
              {" "}remaining · {trialEnd?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        )}

        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Price</p>
          <p className="font-semibold">$149 <span className="text-zinc-500 font-normal text-sm">/ month per cohort</span></p>
        </div>
      </div>

      {status === "past_due" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-4">
          <p className="text-sm text-red-400 font-semibold mb-1">Payment failed</p>
          <p className="text-xs text-zinc-400">Your last payment didn&apos;t go through. Update your payment method to keep access.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={openPortal}
          disabled={loading}
          className="flex-1 rounded-xl border border-white/15 py-2.5 text-sm font-semibold text-zinc-300 hover:border-white/30 hover:text-white disabled:opacity-40 transition"
        >
          {loading ? "Opening…" : "Manage Billing →"}
        </button>
        <button
          onClick={() => router.push("/classroom")}
          className="flex-1 rounded-xl bg-blue-500/15 border border-blue-500/30 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-500/25 transition"
        >
          Go to Classrooms
        </button>
      </div>

      <p className="text-xs text-zinc-600 text-center">
        Cancel, upgrade, or update payment info via the billing portal.
      </p>
    </div>
  );
}
