"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function CredentialsForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (mode === "signup") {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        if (res.status === 409) {
          setError("__409__");
        } else {
          setError(body.error ?? "Sign up failed. Try again.");
        }
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }
    // Hard navigate so middleware runs and routes to correct page
    window.location.href = "/api/user/fix-session";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {mode === "signup" && (
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
          className="w-full rounded-lg border border-edge bg-surface-1 px-4 py-3 text-sm text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
        />
      )}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        required
        className="w-full rounded-lg border border-edge bg-surface-1 px-4 py-3 text-sm text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={mode === "signup" ? "Password (min 8 chars)" : "Password"}
        required
        minLength={mode === "signup" ? 8 : 1}
        className="w-full rounded-lg border border-edge bg-surface-1 px-4 py-3 text-sm text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge"
      />
      {error && error !== "__409__" && <p className="text-xs text-danger">{error}</p>}
      {error === "__409__" && (
        <p className="text-xs text-warn">
          This email already has an account.{" "}
          <Link href="/sign-in" className="underline hover:text-warn">Sign in instead →</Link>
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-accent-fill px-4 py-3 text-sm font-bold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
      >
        {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
