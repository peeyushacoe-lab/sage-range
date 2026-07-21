"use client";

import { useEffect, useState } from "react";

function secsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function fmt(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function Countdown() {
  const [secs, setSecs] = useState(secsUntilMidnightUTC);

  useEffect(() => {
    const id = setInterval(() => setSecs(secsUntilMidnightUTC()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Next challenge in</p>
      <p className="text-2xl font-black font-mono tabular-nums text-zinc-300">{fmt(secs)}</p>
    </div>
  );
}
