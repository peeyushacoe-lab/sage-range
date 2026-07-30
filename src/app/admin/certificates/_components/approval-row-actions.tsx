"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApprovalRowActions(props: {
  userId: string;
  kind: "PATH" | "ACADEMY" | "IR" | "LABS" | "SIMULATION";
  targetId: string;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "APPROVED" | "REJECTED") {
    setBusy(decision);
    setError(null);
    try {
      const res = await fetch(`/api/admin/certificates`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...props, decision }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Failed — try again.");
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {error && <span className="text-xs text-danger">{error}</span>}
      <button
        onClick={() => decide("APPROVED")}
        disabled={busy !== null}
        className="rounded-lg border border-ok-edge bg-ok-wash px-3 py-1.5 text-xs font-semibold text-ok hover:bg-ok-wash transition disabled:opacity-50"
      >
        {busy === "APPROVED" ? "Approving…" : "Approve"}
      </button>
      <button
        onClick={() => decide("REJECTED")}
        disabled={busy !== null}
        className="rounded-lg border border-danger-edge bg-danger-wash px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-wash transition disabled:opacity-50"
      >
        {busy === "REJECTED" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
