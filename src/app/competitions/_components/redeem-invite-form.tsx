"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/**
 * Redeems an invite code for a private competition.
 *
 * Invite-only events are not listed until entered, so this is the only way in.
 * On success we navigate to the competition rather than reloading the list, as
 * entering is the point of redeeming the code.
 */
export function RedeemInviteForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/competitions/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: trimmed }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.error ?? "That code did not work");
        return;
      }
      router.push(`/competitions/${body.slug}`);
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-white/10 bg-zinc-900/50 p-4"
    >
      <label
        htmlFor="invite-code"
        className="text-[10px] uppercase tracking-widest text-zinc-500"
      >
        Have an invite code?
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. CYBER-2026"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-md border border-white/10 bg-zinc-900 px-3 py-2 font-mono text-sm uppercase text-zinc-100 placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
        <Button type="submit" disabled={busy || !code.trim()}>
          {busy ? "Checking…" : "Join"}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </form>
  );
}
