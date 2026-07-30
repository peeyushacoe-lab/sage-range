"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Circle } from "lucide-react";
import { Badge, Button } from "@/components/ui";

import { Icon } from "@/components/ui/icon";
interface CertStatus {
  eligible: boolean;
  certified: boolean;
  certId: string | null;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
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
    <div className="rounded-lg border border-edge bg-surface-1 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-3">
          IR Commander Certification
        </p>
        {status?.certified && (
          <Badge tone="ok">
            Certified <Icon name="check" size={14} className="inline-block shrink-0" />
          </Badge>
        )}
      </div>

      {!status ? (
        <p className="text-xs text-ink-3">Loading...</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {status.simsNeeded === 0
              ? <Icon name="check" size={13} className="text-ok" />
              : <Circle aria-hidden="true" className="h-3.5 w-3.5 text-warn" />}
            <p className="text-sm text-ink-2">
              {3 - status.simsNeeded}/3 B+ simulations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {status.pathsNeeded === 0
              ? <Icon name="check" size={13} className="text-ok" />
              : <Circle aria-hidden="true" className="h-3.5 w-3.5 text-warn" />}
            <p className="text-sm text-ink-2">
              {2 - status.pathsNeeded}/2 paths completed
            </p>
          </div>

          {status.certified && status.certId && (
            <div className="space-y-2 pt-2">
              <p className="font-mono text-xs text-ink-3">{status.certId}</p>
              <Link
                href={`/verify/${status.certId}`}
                className="inline-block text-xs text-accent hover:underline"
              >
                View certificate →
              </Link>
            </div>
          )}

          {!status.certified && status.eligible && status.approvalStatus === "PENDING" && (
            <div className="pt-2">
              <Badge tone="warn" className="px-4 py-2 text-sm">Pending admin approval</Badge>
            </div>
          )}

          {!status.certified && status.eligible && status.approvalStatus === "REJECTED" && (
            <p className="pt-1 text-xs text-danger">Certificate request was not approved. Contact your instructor.</p>
          )}

          {!status.certified && status.eligible && !status.approvalStatus && (
            <div className="space-y-2 pt-2">
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button variant="secondary" size="sm" onClick={claim} disabled={claiming}>
                {claiming ? "Requesting..." : "Request Certificate Approval"}
              </Button>
            </div>
          )}

          {!status.certified && !status.eligible && (
            <p className="pt-1 text-xs text-ink-3">
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
