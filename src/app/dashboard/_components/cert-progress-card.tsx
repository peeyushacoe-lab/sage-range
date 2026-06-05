"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface CertStatus {
  eligible: boolean;
  certified: boolean;
  certId: string | null;
  simsNeeded: number;
  pathsNeeded: number;
}

export function CertProgressCard() {
  const [status, setStatus] = useState<CertStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cert/check")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => null);
  }, []);

  async function claim() {
    setClaiming(true);
    setError(null);
    try {
      const res = await fetch("/api/cert/check", { method: "POST" });
      const data: CertStatus = await res.json();
      if (!res.ok) throw new Error("Failed");
      setStatus(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-zinc-500 uppercase tracking-widest">
          IR Commander Certification
        </p>
        {status?.certified && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400">
            Certified ✓
          </span>
        )}
      </div>

      {!status ? (
        <p className="text-xs text-zinc-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`text-sm ${
                status.simsNeeded === 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {status.simsNeeded === 0 ? "✓" : "○"}
            </span>
            <p className="text-sm text-zinc-300">
              {3 - status.simsNeeded}/3 B+ simulations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-sm ${
                status.pathsNeeded === 0 ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {status.pathsNeeded === 0 ? "✓" : "○"}
            </span>
            <p className="text-sm text-zinc-300">
              {2 - status.pathsNeeded}/2 paths completed
            </p>
          </div>

          {status.certified && status.certId && (
            <div className="pt-2 space-y-2">
              <p className="text-xs text-zinc-500 font-mono">{status.certId}</p>
              <Link
                href={`/verify/${status.certId}`}
                className="inline-block text-xs text-emerald-400 hover:underline"
              >
                View certificate →
              </Link>
            </div>
          )}

          {!status.certified && status.eligible && (
            <div className="pt-2 space-y-2">
              {error && <p className="text-xs text-red-400">{error}</p>}
              <button
                onClick={claim}
                disabled={claiming}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50"
              >
                {claiming ? "Claiming..." : "Claim Your Certificate"}
              </button>
            </div>
          )}

          {!status.certified && !status.eligible && (
            <p className="text-xs text-zinc-600 pt-1">
              Complete {status.simsNeeded > 0 ? `${status.simsNeeded} more B+ sim${status.simsNeeded !== 1 ? "s" : ""}` : ""}
              {status.simsNeeded > 0 && status.pathsNeeded > 0 ? " and " : ""}
              {status.pathsNeeded > 0 ? `${status.pathsNeeded} more path${status.pathsNeeded !== 1 ? "s" : ""}` : ""} to unlock.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
