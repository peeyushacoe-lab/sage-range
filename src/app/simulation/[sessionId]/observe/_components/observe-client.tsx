"use client";

import { useEffect, useState, useCallback } from "react";

type ObserveData = {
  sessionId: string;
  student: { id: string; name: string | null; email: string | null };
  scenario: string;
  industry: string;
  status: string;
  currentStage: string;
  score: number;
  durationSec: number;
  decisionsCount: number;
  recentDecisions: Array<{
    label: string; scoreChange: number; stageBlocker: boolean; takenAt: string;
  }>;
  recentAlerts: Array<{
    severity: string; source: string; narrative: string | null; createdAt: string;
  }>;
  systemStatuses: Record<string, string>;
  dataExfiltrated: boolean;
  ransomwareDeployed: boolean;
  updatedAt: string;
};

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "text-danger border-danger-edge bg-danger-wash",
  HIGH:     "text-sev-high border-sev-high-edge bg-sev-high-wash",
  MEDIUM:   "text-warn border-warn-edge bg-warn-wash",
  INFO:     "text-ink-2 border-edge-strong bg-surface-1",
};

function fmt(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ObserveClient({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<ObserveData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/simulation/${sessionId}/observe`, { cache: "no-store" });
      if (!res.ok) { setError("Unable to load session data."); return; }
      const json = await res.json() as ObserveData;
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setError("Network error — retrying…");
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-danger text-sm">{error}</p>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-ink-3 text-sm animate-pulse">Loading session…</p>
    </div>
  );

  const isActive = data.status === "ACTIVE";
  const offlineCount = Object.values(data.systemStatuses).filter((s) => s === "OFFLINE").length;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="rounded-xl border border-edge bg-surface-1 p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-ok animate-pulse" : "bg-surface-3"}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? "text-ok" : "text-ink-3"}`}>
            {data.status}
          </span>
          {isActive && <span className="text-xs text-ink-3">· Live</span>}
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div className="text-center">
            <p className="text-[10px] text-ink-3 uppercase tracking-wider">Score</p>
            <p className="font-bold text-ok">{data.score}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-ink-3 uppercase tracking-wider">Stage</p>
            <p className="font-bold text-ink text-xs">{data.currentStage.replace(/_/g, " ")}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-ink-3 uppercase tracking-wider">Elapsed</p>
            <p className="font-bold text-ink">{fmt(data.durationSec)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-ink-3 uppercase tracking-wider">Decisions</p>
            <p className="font-bold text-ink">{data.decisionsCount}</p>
          </div>
        </div>
        {lastRefresh && (
          <p className="text-[10px] text-ink-3">
            Refreshes every 5s · Last: {lastRefresh.toLocaleTimeString("en-US", { hour12: false })}
          </p>
        )}
      </div>

      {/* Threat indicators */}
      {(data.dataExfiltrated || data.ransomwareDeployed || offlineCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {data.ransomwareDeployed && (
            <span className="text-xs border border-danger-edge bg-danger-wash text-danger rounded-lg px-3 py-1.5 font-bold animate-pulse">
              Ransomware Deployed
            </span>
          )}
          {data.dataExfiltrated && (
            <span className="text-xs border border-danger-edge bg-danger-wash text-danger rounded-lg px-3 py-1.5">
              Data Exfiltrated
            </span>
          )}
          {offlineCount > 0 && (
            <span className="text-xs border border-sev-high-edge bg-sev-high-wash text-sev-high rounded-lg px-3 py-1.5">
              {offlineCount} system{offlineCount !== 1 ? "s" : ""} offline
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent decisions */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-3">Recent Decisions</h2>
          {data.recentDecisions.length === 0 ? (
            <p className="text-xs text-ink-3 italic">No decisions taken yet.</p>
          ) : (
            <ul className="divide-y divide-edge-subtle rounded-xl border border-edge">
              {[...data.recentDecisions].reverse().map((d, i) => (
                <li key={i} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className={`text-sm ${d.stageBlocker ? "text-ok" : "text-ink"}`}>
                      {d.label}
                      {d.stageBlocker && <span className="ml-2 text-[10px] text-ok font-bold">CONTAINED</span>}
                    </p>
                    <p className="text-[10px] text-ink-3 mt-0.5">
                      {new Date(d.takenAt).toLocaleTimeString("en-US", { hour12: false })}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${d.scoreChange >= 0 ? "text-ok" : "text-danger"}`}>
                    {d.scoreChange >= 0 ? "+" : ""}{d.scoreChange}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* System statuses */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-3">System Status</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.systemStatuses).map(([sys, status]) => (
              <div
                key={sys}
                className={`rounded-lg border p-2.5 text-xs ${
                  status === "OFFLINE"   ? "border-danger-edge bg-danger-wash" :
                  status === "DEGRADED"  ? "border-warn-edge bg-warn-wash" :
                  "border-edge-strong bg-surface-1"
                }`}
              >
                <p className="text-ink-2 truncate font-medium">{sys}</p>
                <p className={`text-[10px] font-bold mt-0.5 uppercase ${
                  status === "OFFLINE" ? "text-danger" :
                  status === "DEGRADED" ? "text-warn" : "text-ok"
                }`}>{status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent alerts */}
      {data.recentAlerts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-3">Recent Alerts</h2>
          <div className="space-y-2">
            {[...data.recentAlerts].reverse().map((a, i) => (
              <div key={i} className={`rounded-lg border p-3 text-xs ${SEV_COLOR[a.severity] ?? SEV_COLOR.INFO}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[10px]">{a.severity}</span>
                  <span className="text-ink-3">{a.source}</span>
                  <span className="ml-auto text-ink-3">
                    {new Date(a.createdAt).toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                </div>
                {a.narrative && <p className="text-ink-2 leading-relaxed">{a.narrative}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed state */}
      {!isActive && (
        <div className="rounded-xl border border-edge bg-surface-1 p-6 text-center">
          <p className="text-ink-3 text-sm mb-1">Simulation ended</p>
          <p className={`text-2xl font-bold ${data.status === "CONTAINED" ? "text-ok" : "text-danger"}`}>
            {data.status}
          </p>
          <p className="text-ink-2 text-sm mt-2">Final score: <span className="font-bold text-white">{data.score}</span></p>
        </div>
      )}
    </div>
  );
}
