"use client";

import { useState } from "react";

export function ConfirmButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState<string | null>(null);

  async function confirm() {
    setState("busy");
    setError(null);

    const res = await fetch("/api/account/migrate/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(body.error ?? "Something went wrong — please try again.");
      setState("idle");
      return;
    }

    setNewEmail(body.email);
    setState("done");
  }

  if (state === "done") {
    return (
      <div>
        <p className="mb-3 text-sm font-semibold text-emerald-300">Done — you&apos;re moved.</p>
        <p className="mb-5 text-xs text-zinc-500">
          Sign in with Google using {newEmail} from now on.
        </p>
        <a
          href="/sign-in"
          className="block w-full rounded-lg bg-emerald-500 py-3 text-center text-sm font-semibold text-black hover:bg-emerald-400"
        >
          Sign in with your new email →
        </a>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={confirm}
        disabled={state === "busy"}
        className="w-full rounded-lg bg-emerald-500 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "busy" ? "Confirming…" : "Confirm and migrate"}
      </button>
      {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
    </div>
  );
}
