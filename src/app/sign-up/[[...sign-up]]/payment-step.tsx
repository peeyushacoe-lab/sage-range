"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe, StripeElements } from "@stripe/stripe-js";

interface Props {
  role: "INSTRUCTOR" | "RECRUITER";
  voucherCode?: string;
  finalAmount: number;        // cents — displayed to user
  onSuccess: () => void;
  onBack: () => void;
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}/mo`;
}

export function PaymentStep({ role, voucherCode, finalAmount, onSuccess, onBack }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  const init = useCallback(async () => {
    setStatus("loading");
    setInitError(null);

    // Unmount any previously mounted PaymentElement before re-initialising
    elementsRef.current?.getElement("payment")?.unmount();
    elementsRef.current = null;
    stripeRef.current = null;

    try {
      // 1. Get subscription client_secret from server
      const res = await fetch("/api/auth/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, voucherCode }),
      });
      const data = await res.json() as { clientSecret?: string; error?: string };
      if (!res.ok || !data.clientSecret) {
        setInitError(data.error ?? "Failed to initialise payment. Please try again.");
        setStatus("error");
        return;
      }

      // 2. Load Stripe.js
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setInitError("Stripe is not configured. Contact support.");
        setStatus("error");
        return;
      }

      const stripe = await loadStripe(publishableKey);
      if (!stripe) {
        setInitError("Failed to load payment processor.");
        setStatus("error");
        return;
      }
      stripeRef.current = stripe;

      // 3. Create Elements and mount PaymentElement
      const elements = stripe.elements({
        clientSecret: data.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#10b981",       // emerald-500
            colorBackground: "#18181b",    // zinc-900
            colorText: "#ffffff",
            colorDanger: "#f87171",        // red-400
            fontFamily: "inherit",
            borderRadius: "8px",
            spacingUnit: "4px",
          },
          rules: {
            ".Input": { border: "1px solid rgba(255,255,255,0.1)", padding: "12px 16px" },
            ".Input:focus": { border: "1px solid rgba(16,185,129,0.6)", boxShadow: "none" },
            ".Label": { color: "#71717a", fontSize: "12px", marginBottom: "6px" },
          },
        },
      });
      elementsRef.current = elements;

      const paymentElement = elements.create("payment", { layout: "tabs" });
      if (mountRef.current) {
        paymentElement.mount(mountRef.current);
        setStatus("ready");
      }
    } catch {
      setInitError("Unexpected error setting up payment. Please try again.");
      setStatus("error");
    }
  }, [role, voucherCode]);

  useEffect(() => {
    init();
    return () => {
      elementsRef.current?.getElement("payment")?.unmount();
    };
  }, [init]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripeRef.current || !elementsRef.current) return;

    setSubmitting(true);
    setPayError(null);

    const { error } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      confirmParams: {
        return_url: `${window.location.origin}/api/user/fix-session`,
      },
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message ?? "Payment failed. Please try again.");
      setSubmitting(false);
      return;
    }

    // Payment succeeded without redirect (no 3DS required)
    onSuccess();
  }

  return (
    <div className="space-y-4">
      {/* Order summary */}
      <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white capitalize">{role.toLowerCase()} Plan</p>
          <p className="text-xs text-zinc-500 mt-0.5">Billed monthly · cancel anytime</p>
        </div>
        <p className="text-base font-bold text-white">{formatPrice(finalAmount)}</p>
      </div>

      {/* Stripe PaymentElement mount point */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="min-h-[120px] relative">
          {status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-zinc-500">Loading payment form…</p>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{initError}</p>
              <button
                type="button"
                onClick={init}
                className="text-xs text-red-300 underline mt-1 hover:text-red-200"
              >
                Try again
              </button>
            </div>
          )}

          {/* Stripe mounts here */}
          <div ref={mountRef} className={status === "loading" ? "invisible" : ""} />
        </div>

        {payError && (
          <p className="text-xs text-red-400 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
            {payError}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={submitting}
            className="px-4 py-3 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={status !== "ready" || submitting}
            className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Processing…
              </span>
            ) : (
              `Pay ${formatPrice(finalAmount)}`
            )}
          </button>
        </div>

        <p className="text-center text-xs text-zinc-600 flex items-center justify-center gap-1.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secured by Stripe · your card details are never stored by us
        </p>
      </form>
    </div>
  );
}
