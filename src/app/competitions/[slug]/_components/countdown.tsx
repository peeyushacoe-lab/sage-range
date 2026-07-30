"use client";

import { useEffect, useState } from "react";

function formatDiff(ms: number) {
  if (ms <= 0) return null;
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export function Countdown({
  targetIso,
  label,
  urgentMs = 3600000,
}: {
  targetIso: string;
  label: string;
  urgentMs?: number;
}) {
  const [ms, setMs] = useState(() => new Date(targetIso).getTime() - Date.now());

  useEffect(() => {
    const id = setInterval(() => setMs(new Date(targetIso).getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const formatted = formatDiff(ms);
  if (!formatted) return null;

  const urgent = ms < urgentMs;

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${
        urgent
          ? "border-red-500/30 bg-red-500/8"
          : "border-white/10 bg-zinc-900/50"
      }`}
    >
      <span className={`text-xs ${urgent ? "text-red-400" : "text-zinc-500"}`}>{label}</span>
      <span className={`font-mono text-base font-bold tabular-nums ${urgent ? "text-red-300" : "text-white"}`}>
        {formatted}
      </span>
    </div>
  );
}
