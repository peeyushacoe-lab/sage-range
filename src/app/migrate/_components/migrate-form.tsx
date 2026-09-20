"use client";

import { useState, type FormEvent } from "react";

export function MigrateForm({
  currentEmail,
  pendingEmail,
}: {
  currentEmail: string;
  pendingEmail: string | null;
}) {
  const [sent, setSent] = useState(!!pendingEmail);
  const [sentTo, setSentTo] = useState(pendingEmail ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const newEmail = String(form.get("newEmail") ?? "").trim();

    const res = await fetch("/api/account/migrate/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newEmail }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error ?? "Something went wrong — please try again.");
      setBusy(false);
      return;
    }

    setSentTo(newEmail);
    setSent(true);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <p className="mb-2 text-3xl">📬</p>
        <h2 className="mb-2 text-lg font-bold text-zinc-100">Check {sentTo}</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          We sent a confirmation link there. Click it to finish moving your account — nothing changes until
          you do. The link expires in 24 hours.
        </p>
        <button
          className="mt-5 text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          onClick={() => {
            setSent(false);
            setError(null);
          }}
        >
          Used the wrong email? Start over
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="mb-1.5 text-xs text-zinc-500">Currently signed in via Nexus as</p>
      <p className="mb-5 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-zinc-400">{currentEmail}</p>

      <label className="mb-1.5 block text-xs font-semibold text-zinc-400">Your personal email</label>
      <input
        type="email"
        name="newEmail"
        required
        placeholder="you@gmail.com"
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600"
      />

      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-5 w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send confirmation link"}
      </button>
    </form>
  );
}
