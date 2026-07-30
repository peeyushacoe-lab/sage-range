"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function JoinOrganizationClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/organization/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { setError(data.error ?? "Invalid code"); return; }
      router.push("/organization");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Enter organization code (e.g. A1B2C3D4)"
        maxLength={8}
        className="rounded-lg bg-surface-1 border border-edge px-3 py-2 text-sm font-mono text-white placeholder:text-ink-3 focus:outline-none focus:border-ok-edge uppercase tracking-widest"
      />
      <button
        type="submit"
        disabled={loading || code.length < 4}
        className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white disabled:opacity-40 transition"
      >
        {loading ? "Joining…" : "Join Organization"}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}
