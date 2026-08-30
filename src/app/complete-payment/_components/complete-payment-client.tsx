"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PaymentStep } from "@/components/payment-step";

type Role = "STUDENT" | "INSTRUCTOR" | "RECRUITER";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}/mo`;
}

export function CompletePaymentClient({
  role,
  basePrice,
  planLabel,
}: {
  role: Role;
  basePrice: number;
  planLabel: string;
}) {
  const router = useRouter();
  const { update } = useSession();

  const [voucherInput, setVoucherInput] = useState("");
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "checking" | "applied" | "invalid">("idle");
  const [voucherMsg, setVoucherMsg] = useState("");
  const [finalAmount, setFinalAmount] = useState(basePrice);
  const [activating, setActivating] = useState(false);

  async function applyVoucher() {
    if (!voucherInput.trim()) return;
    setVoucherStatus("checking");
    setVoucherMsg("");
    setActivating(true);

    const res = await fetch("/api/billing/activate-voucher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voucherCode: voucherInput.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { free?: boolean; finalAmount?: number; error?: string };

    if (!res.ok) {
      setVoucherStatus("invalid");
      setVoucherMsg(data.error ?? "Invalid voucher code.");
      setActivating(false);
      return;
    }

    if (data.free) {
      // Voucher brought it to $0 — the account is active server-side now.
      await update();
      router.push("/dashboard");
      return;
    }

    setVoucherStatus("applied");
    setFinalAmount(data.finalAmount ?? basePrice);
    setVoucherMsg(`Voucher applied — now ${formatPrice(data.finalAmount ?? basePrice)}.`);
    setActivating(false);
  }

  async function handlePaymentSuccess() {
    await update();
    router.push("/dashboard");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold capitalize">{planLabel} Plan</span>
        <span className="text-sm font-bold">{formatPrice(finalAmount)}</span>
      </div>

      {voucherStatus !== "applied" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={voucherInput}
              onChange={(e) => setVoucherInput(e.target.value)}
              placeholder="Voucher code (optional)"
              className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
            />
            <button
              type="button"
              onClick={applyVoucher}
              disabled={activating || !voucherInput.trim()}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:text-white disabled:opacity-40 transition-colors"
            >
              {voucherStatus === "checking" ? "Checking…" : "Apply"}
            </button>
          </div>
          {voucherStatus === "invalid" && <p className="text-xs text-red-400">{voucherMsg}</p>}
        </div>
      )}
      {voucherStatus === "applied" && <p className="text-xs text-emerald-400">{voucherMsg}</p>}

      <PaymentStep
        role={role}
        voucherCode={voucherStatus === "applied" ? voucherInput.trim() : undefined}
        finalAmount={finalAmount}
        onSuccess={handlePaymentSuccess}
        onBack={() => router.push("/dashboard")}
      />
    </div>
  );
}
