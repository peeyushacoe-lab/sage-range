"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import type { PlanRow } from "@/lib/plan-pricing";
import { PaymentStep } from "./payment-step";

// ── Types ─────────────────────────────────────────────────────────────────────

type RoleKey = "STUDENT" | "INSTRUCTOR" | "RECRUITER";

const DESCRIPTIONS: Record<RoleKey, string> = {
  STUDENT:    "Free forever — labs, paths & community.",
  INSTRUCTOR: "Classrooms, assignments & analytics.",
  RECRUITER:  "Talent search, assessments & bookmarks.",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function applyDiscount(base: number, pct: number, amt: number) {
  let result = base;
  if (pct > 0) result = Math.round(result * (1 - pct / 100));
  if (amt > 0) result = Math.max(0, result - amt);
  return result;
}

function formatPrice(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}/mo`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RoleCard({ plan, selected, onClick }: { plan: PlanRow; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
        selected ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-zinc-900 hover:border-white/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white">{plan.label}</span>
        <span className={`text-sm font-bold ${plan.priceAmt === 0 ? "text-emerald-400" : "text-white"}`}>
          {formatPrice(plan.priceAmt)}
        </span>
      </div>
      <p className="text-xs text-zinc-500 mt-0.5">{DESCRIPTIONS[plan.role as RoleKey]}</p>
    </button>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

const STEP_LABELS = ["Your account", "Choose plan", "Payment"];

function StepBar({ step, maxStep }: { step: number; maxStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: maxStep }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step >= s ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-500"
            }`}
          >
            {step > s ? (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            ) : s}
          </div>
          {s < maxStep && (
            <div className={`h-px w-6 transition-colors ${step > s ? "bg-emerald-500" : "bg-zinc-800"}`} />
          )}
        </div>
      ))}
      <span className="text-xs text-zinc-500 ml-1">{STEP_LABELS[step - 1]}</span>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function SignupForm({ plans }: { plans: PlanRow[] }) {
  const planMap = Object.fromEntries(plans.map((p) => [p.role, p]));

  const [step, setStep] = useState(1);

  // Step 1 fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleKey>("STUDENT");

  // Step 2 fields
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [discountPct, setDiscountPct] = useState(0);
  const [discountAmt, setDiscountAmt] = useState(0);
  const [voucherMsg, setVoucherMsg] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed final price
  const base = planMap[role]?.priceAmt ?? 0;
  const final = applyDiscount(base, discountPct, discountAmt);
  const isPaid = final > 0;
  const maxStep = isPaid ? 3 : 2;

  // ── Step 1 ───────────────────────────────────────────────────────────────

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStep(2);
  }

  // ── Voucher ──────────────────────────────────────────────────────────────

  async function checkVoucher() {
    if (!voucherInput.trim()) return;
    setVoucherStatus("checking");
    setVoucherMsg("");

    const res = await fetch("/api/vouchers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: voucherInput.trim() }),
    });
    const data = await res.json() as { valid?: boolean; discountPct?: number; discountAmt?: number; error?: string };

    if (!res.ok || !data.valid) {
      setVoucherStatus("invalid");
      setVoucherMsg(data.error ?? "Invalid voucher code.");
      setDiscountPct(0);
      setDiscountAmt(0);
      return;
    }

    setVoucherStatus("valid");
    setDiscountPct(data.discountPct ?? 0);
    setDiscountAmt(data.discountAmt ?? 0);

    const newFinal = applyDiscount(base, data.discountPct ?? 0, data.discountAmt ?? 0);
    setVoucherMsg(
      newFinal === 0
        ? "🎉 Full discount! No payment required."
        : `Voucher applied — saving ${formatPrice(base - newFinal)}/mo.`
    );
  }

  function clearVoucher() {
    setVoucherInput("");
    setVoucherStatus("idle");
    setDiscountPct(0);
    setDiscountAmt(0);
    setVoucherMsg("");
  }

  // ── Step 2: create account + sign in ────────────────────────────────────

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Create account
    const signupRes = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    if (!signupRes.ok) {
      const body = await signupRes.json().catch(() => ({})) as { error?: string };
      setError(signupRes.status === 409
        ? "An account with this email already exists. Sign in instead."
        : body.error ?? "Sign up failed. Try again.");
      setLoading(false);
      return;
    }

    // If paid plan with full-voucher discount → tell server to mark it free
    if (final === 0 && role !== "STUDENT" && voucherStatus === "valid") {
      await fetch("/api/auth/signup-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, voucherCode: voucherInput.trim() }),
      });
    }

    // Sign in immediately (needed for create-subscription to find the user)
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      setLoading(false);
      return;
    }

    if (final === 0) {
      // Free — go straight to dashboard
      window.location.href = "/api/user/fix-session";
      return;
    }

    // Paid — advance to payment step
    setLoading(false);
    setStep(3);
  }

  // ── Step 3 callback ──────────────────────────────────────────────────────

  function handlePaymentSuccess() {
    window.location.href = "/api/user/fix-session";
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <StepBar step={step} maxStep={maxStep} />

      {/* ── STEP 1: credentials + role ── */}
      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            minLength={2}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            required
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 chars)"
            required
            minLength={8}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60"
          />

          <p className="text-xs text-zinc-500 pt-1">I am a…</p>
          <div className="space-y-2">
            {plans.map((p) => (
              <RoleCard
                key={p.role}
                plan={p}
                selected={role === p.role}
                onClick={() => setRole(p.role as RoleKey)}
              />
            ))}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400 transition-colors mt-2"
          >
            Continue →
          </button>
        </form>
      )}

      {/* ── STEP 2: plan summary + voucher ── */}
      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          {/* Plan summary */}
          <div className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{planMap[role]?.label ?? role} Plan</p>
                <p className="text-xs text-zinc-500 mt-0.5">{DESCRIPTIONS[role]}</p>
              </div>
              <div className="text-right">
                {base > 0 && (discountPct > 0 || discountAmt > 0) && (
                  <p className="text-xs text-zinc-500 line-through">{formatPrice(base)}</p>
                )}
                <p className={`text-base font-bold ${final === 0 ? "text-emerald-400" : "text-white"}`}>
                  {formatPrice(final)}
                </p>
              </div>
            </div>
          </div>

          {/* Voucher — only for paid plans */}
          {base > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Have a voucher code?</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voucherInput}
                  onChange={(e) => { setVoucherInput(e.target.value.toUpperCase()); if (voucherStatus !== "idle") clearVoucher(); }}
                  placeholder="VOUCHER CODE"
                  disabled={voucherStatus === "valid"}
                  className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/60 disabled:opacity-50 uppercase tracking-widest"
                />
                {voucherStatus === "valid" ? (
                  <button type="button" onClick={clearVoucher}
                    className="px-3 py-2.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-white transition-colors">
                    Remove
                  </button>
                ) : (
                  <button type="button" onClick={checkVoucher}
                    disabled={!voucherInput.trim() || voucherStatus === "checking"}
                    className="px-4 py-2.5 rounded-lg bg-zinc-800 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors">
                    {voucherStatus === "checking" ? "…" : "Apply"}
                  </button>
                )}
              </div>
              {voucherMsg && (
                <p className={`text-xs mt-1.5 ${voucherStatus === "valid" ? "text-emerald-400" : "text-red-400"}`}>
                  {voucherMsg}
                </p>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { setStep(1); setError(null); }}
              className="px-4 py-3 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-white transition-colors">
              ← Back
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors">
              {loading
                ? "Please wait…"
                : final === 0
                ? "Create account — free"
                : `Continue to payment · ${formatPrice(final)}`}
            </button>
          </div>
        </form>
      )}

      {/* ── STEP 3: embedded Stripe payment ── */}
      {step === 3 && role !== "STUDENT" && (
        <PaymentStep
          role={role as "INSTRUCTOR" | "RECRUITER"}
          voucherCode={voucherStatus === "valid" ? voucherInput.trim() : undefined}
          finalAmount={final}
          onSuccess={handlePaymentSuccess}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
