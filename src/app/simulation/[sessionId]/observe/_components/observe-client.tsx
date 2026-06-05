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
  CRITICAL: "text-red-400 border-red-500/40 bg-red-500/5",
  HIGH:     "text-orange-400 border-orange-500/40 bg-orange-500/5",
  MEDIUM:   "text-amber-400 border-amber-500/30 bg-amber-500/5",
  INFO:     "text-zinc-400 border-zinc-700 bg-zinc-900/30",
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
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-zinc-500 text-sm animate-pulse">Loading session…</p>
    </div>
  );

  const isActive = data.status === "ACTIVE";
  const offlineCount = Object.values(data.systemStatuses).filter((s) => s === "OFFLINE").length;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-sage-500 animate-pulse" : "bg-zinc-600"}`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? "text-sage-400" : "text-zinc-500"}`}>
            {data.status}
          </span>
          {isActive && <span className="text-xs text-zinc-600">· Live</span>}
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Score</p>
            <p className="font-bold text-sage-400">{data.score}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Stage</p>
            <p className="font-bold text-zinc-200 text-xs">{data.currentStage.replace(/_/g, " ")}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Elapsed</p>
            <p className="font-bold text-zinc-200">{fmt(data.durationSec)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Decisions</p>
            <p className="font-bold text-zinc-200">{data.decisionsCount}</p>
          </div>
        </div>
        {lastRefresh && (
          <p className="text-[10px] text-zinc-700">
            Refreshes every 5s · Last: {lastRefresh.toLocaleTimeString("en-US", { hour12: false })}
          </p>
        )}
      </div>

      {/* Threat indicators */}
      {(data.dataExfiltrated || data.ransomwareDeployed || offlineCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {data.ransomwareDeployed && (
            <span className="text-xs border border-red-500/60 bg-red-500/10 text-red-300 rounded-lg px-3 py-1.5 font-bold animate-pulse">
              Ransomware Deployed
            </span>
          )}
          {data.dataExfiltrated && (
            <span className="text-xs border border-red-500/40 bg-red-500/8 text-red-400 rounded-lg px-3 py-1.5">
              Data Exfiltrated
            </span>
          )}
          {offlineCount > 0 && (
            <span className="text-xs border border-orange-500/40 bg-orange-500/8 text-orange-400 rounded-lg px-3 py-1.5">
              {offlineCount} system{offlineCount !== 1 ? "s" : ""} offline
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent decisions */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Recent Decisions</h2>
          {data.recentDecisions.length === 0 ? (
            <p className="text-xs text-zinc-600 italic">No decisions taken yet.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/8">
              {[...data.recentDecisions].reverse().map((d, i) => (
                <li key={i} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className={`text-sm ${d.stageBlocker ? "text-sage-400" : "text-zinc-200"}`}>
                      {d.label}
                      {d.stageBlocker && <span className="ml-2 text-[10px] text-sage-500 font-bold">CONTAINED</span>}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      {new Date(d.takenAt).toLocaleTimeString("en-US", { hour12: false })}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${d.scoreChange >= 0 ? "text-sage-500" : "text-red-400"}`}>
                    {d.scoreChange >= 0 ? "+" : ""}{d.scoreChange}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* System statuses */}
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">System Status</h2>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(data.systemStatuses).map(([sys, status]) => (
              <div
                key={sys}
                className={`rounded-lg border p-2.5 text-xs ${
                  status === "OFFLINE"   ? "border-red-500/40 bg-red-500/5" :
                  status === "DEGRADED"  ? "border-amber-500/30 bg-amber-500/5" :
                  "border-zinc-800 bg-zinc-900/20"
                }`}
              >
                <p className="text-zinc-400 truncate font-medium">{sys}</p>
                <p className={`text-[10px] font-bold mt-0.5 uppercase ${
                  status === "OFFLINE" ? "text-red-400" :
                  status === "DEGRADED" ? "text-amber-400" : "text-sage-500"
                }`}>{status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Recent alerts */}
      {data.recentAlerts.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Recent Alerts</h2>
          <div className="space-y-2">
            {[...data.recentAlerts].reverse().map((a, i) => (
              <div key={i} className={`rounded-lg border p-3 text-xs ${SEV_COLOR[a.severity] ?? SEV_COLOR.INFO}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-[10px]">{a.severity}</span>
                  <span className="text-zinc-600">{a.source}</span>
                  <span className="ml-auto text-zinc-700">
                    {new Date(a.createdAt).toLocaleTimeString("en-US", { hour12: false })}
                  </span>
                </div>
                {a.narrative && <p className="text-zinc-300 leading-relaxed">{a.narrative}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Completed state */}
      {!isActive && (
        <div className="rounded-xl border border-white/10 bg-zinc-900/40 p-6 text-center">
          <p className="text-zinc-500 text-sm mb-1">Simulation ended</p>
          <p className={`text-2xl font-bold ${data.status === "CONTAINED" ? "text-sage-400" : "text-red-400"}`}>
            {data.status}
          </p>
          <p className="text-zinc-400 text-sm mt-2">Final score: <span className="font-bold text-white">{data.score}</span></p>
        </div>
      )}
    </div>
  );
}
