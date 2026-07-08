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
    if (final === 0 && base > 0 && voucherStatus === "valid") {
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
        <>
          {/* OAuth buttons — only shown on step 1, before an account/plan exists */}
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={() => signIn("google", { redirectTo: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>

            <button
              type="button"
              onClick={() => signIn("github", { redirectTo: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Sign up with GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

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
        </>
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
      {step === 3 && (
        <PaymentStep
          role={role}
          voucherCode={voucherStatus === "valid" ? voucherInput.trim() : undefined}
          finalAmount={final}
          onSuccess={handlePaymentSuccess}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
