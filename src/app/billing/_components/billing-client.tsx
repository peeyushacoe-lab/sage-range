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
      <div className="rounded-xl border border-edge bg-surface-1 p-8 text-center max-w-md mx-auto">
        <p className="text-ink-2 text-sm mb-2">Billing</p>
        <h2 className="text-xl font-bold mb-4">Payments coming soon</h2>
        <p className="text-ink-3 text-sm">
          Full platform access is currently free during our pilot. Subscription setup is in progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="rounded-xl border border-edge bg-surface-1 divide-y divide-edge-subtle">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Plan</p>
            <p className="font-semibold capitalize">{plan ?? "Classroom"}</p>
          </div>
          <span className={`text-xs font-bold uppercase border rounded px-2 py-0.5 ${
            isActive ? "text-ok border-ok-edge bg-ok-wash"
            : status === "past_due" ? "text-danger border-danger-edge bg-danger-wash"
            : "text-ink-2 border-edge-strong bg-surface-2"
          }`}>
            {status === "trialing" ? "Trial" : status ?? "Unknown"}
          </span>
        </div>

        {status === "trialing" && daysLeft !== null && (
          <div className="px-5 py-4">
            <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Trial</p>
            <p className="text-sm">
              <span className="font-bold text-warn">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>
              {" "}remaining · {trialEnd?.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        )}

        <div className="px-5 py-4">
          <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1">Price</p>
          <p className="font-semibold">$149 <span className="text-ink-3 font-normal text-sm">/ month per cohort</span></p>
        </div>
      </div>

      {status === "past_due" && (
        <div className="rounded-xl border border-danger-edge bg-danger-wash p-4">
          <p className="text-sm text-danger font-semibold mb-1">Payment failed</p>
          <p className="text-xs text-ink-2">Your last payment didn&apos;t go through. Update your payment method to keep access.</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={openPortal}
          disabled={loading}
          className="flex-1 rounded-xl border border-edge-strong py-2.5 text-sm font-semibold text-ink-2 hover:border-edge-strong hover:text-white disabled:opacity-40 transition"
        >
          {loading ? "Opening…" : "Manage Billing →"}
        </button>
        <button
          onClick={() => router.push("/classroom")}
          className="flex-1 rounded-xl bg-info-wash border border-info-edge py-2.5 text-sm font-semibold text-info hover:bg-info-wash transition"
        >
          Go to Classrooms
        </button>
      </div>

      <p className="text-xs text-ink-3 text-center">
        Cancel, upgrade, or update payment info via the billing portal.
      </p>
    </div>
  );
}
