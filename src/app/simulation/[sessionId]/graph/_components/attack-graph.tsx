"use client";

import { useEffect, useRef, useState } from "react";

export type GraphNode = {
  id: string;
  label: string;
  shortLabel: string;
  kind: "system" | "employee";
  assetType: string;
  criticality: string;
  x: number; y: number; r: number;
};

export type GraphEdge = { fromId: string; toId: string };

export type AttackEvent = {
  nodeId: string | null;   // null = stage transition
  label: string;
  status: "DEGRADED" | "OFFLINE" | "STAGE";
  relativeMs: number;
};

export type StageMarker = { label: string; relativeMs: number; wasBlocked: boolean };

const CRIT_RING: Record<string, string> = {
  CRITICAL: "stroke-red-500",
  HIGH:     "stroke-orange-500",
  MEDIUM:   "stroke-amber-500",
  LOW:      "stroke-zinc-600",
};

const NODE_STATUS_FILL: Record<string, string> = {
  ONLINE:   "#18181b",
  DEGRADED: "#431407",
  OFFLINE:  "#450a0a",
  ENDPOINT: "#0c1a0e",
};

const SPEEDS = [1, 5, 20, 50] as const;
function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60);
  return `${String(m).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
}

type NodeStatus = "ONLINE" | "DEGRADED" | "OFFLINE";

export function AttackGraph({
  nodes, edges, events, stages, totalMs, outcome, score,
}: {
  nodes: GraphNode[]; edges: GraphEdge[];
  events: AttackEvent[]; stages: StageMarker[];
  totalMs: number; outcome: string; score: number;
}) {
  const [playheadMs, setPlayheadMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(20);
  const [hovered, setHovered] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }
    const tick = (now: number) => {
      if (lastRef.current === null) { lastRef.current = now; rafRef.current = requestAnimationFrame(tick); return; }
      const dt = now - lastRef.current; lastRef.current = now;
      setPlayheadMs(prev => {
        const next = prev + dt * speed;
        if (next >= totalMs) { setPlaying(false); return totalMs; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    lastRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [playing, speed, totalMs]);

  // Compute node statuses at current playhead
  const statusMap = new Map<string, NodeStatus>();
  nodes.forEach(n => statusMap.set(n.id, "ONLINE"));
  for (const ev of events) {
    if (!ev.nodeId || ev.relativeMs > playheadMs) continue;
    if (ev.status === "DEGRADED") statusMap.set(ev.nodeId, "DEGRADED");
    if (ev.status === "OFFLINE")  statusMap.set(ev.nodeId, "OFFLINE");
  }

  // Active attack edges (between nodes that are compromised)
  const nodeById = new Map(nodes.map(n => [n.id, n]));
  const visibleEvents = events.filter(e => e.relativeMs <= playheadMs && e.nodeId);
  const affectedIds = new Set(visibleEvents.map(e => e.nodeId));

  const pct = totalMs > 0 ? (playheadMs / totalMs) * 100 : 0;
  const currentStage = [...stages].reverse().find(s => s.relativeMs <= playheadMs);

  const hoveredNode = hovered ? nodeById.get(hovered) : null;
  const hoveredStatus = hovered ? (statusMap.get(hovered) ?? "ONLINE") : null;

  return (
    <div className="space-y-4">

      {/* Stage pill */}
      <div className={`rounded-xl border border-white/8 px-4 py-2.5 flex items-center gap-3 ${currentStage?.wasBlocked ? "bg-emerald-950/30" : "bg-zinc-900/60"}`}>
        <span className={`h-2 w-2 rounded-full shrink-0 ${currentStage?.wasBlocked ? "bg-emerald-500" : "bg-orange-500"} ${playing ? "animate-pulse" : ""}`} />
        <span className="text-xs font-bold text-zinc-300">{currentStage?.label ?? "Pre-Incident"}</span>
        {currentStage?.wasBlocked && <span className="text-[10px] text-emerald-400 border border-emerald-500/30 rounded px-1">CONTAINED</span>}
        <span className="ml-auto text-xs text-zinc-600 tabular-nums">{fmtMs(playheadMs)} / {fmtMs(totalMs)}</span>
      </div>

      {/* SVG graph */}
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 overflow-hidden relative">
        <svg viewBox="0 0 880 420" className="w-full" style={{ minHeight: 280 }}>
          {/* Edges */}
          {edges.map((e, i) => {
            const a = nodeById.get(e.fromId), b = nodeById.get(e.toId);
            if (!a || !b) return null;
            const isAttackEdge = affectedIds.has(e.fromId) && affectedIds.has(e.toId);
            const cx1 = a.x + (b.x - a.x) * 0.4, cy1 = a.y;
            const cx2 = a.x + (b.x - a.x) * 0.6, cy2 = b.y;
            return (
              <path
                key={i}
                d={`M${a.x},${a.y} C${cx1},${cy1} ${cx2},${cy2} ${b.x},${b.y}`}
                fill="none"
                stroke={isAttackEdge ? "#ef4444" : "#3f3f46"}
                strokeWidth={isAttackEdge ? 2 : 1}
                strokeDasharray={isAttackEdge ? "none" : "4 3"}
                opacity={isAttackEdge ? 0.7 : 0.4}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const status = statusMap.get(node.id) ?? "ONLINE";
            const fill = NODE_STATUS_FILL[status];
            const ring = CRIT_RING[node.criticality] ?? CRIT_RING.MEDIUM;
            const isAffected = affectedIds.has(node.id);
            const isHovered = hovered === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x},${node.y})`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                {/* Pulse ring for affected nodes */}
                {isAffected && status !== "ONLINE" && (
                  <circle r={node.r + 6} fill="none" stroke={status === "OFFLINE" ? "#ef4444" : "#f97316"} strokeWidth="1" opacity="0.3" className="animate-ping" />
                )}
                <circle
                  r={node.r}
                  fill={fill}
                  className={`${ring} transition-all`}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                />
                {/* Status indicator dot */}
                <circle
                  cx={node.r - 4} cy={-(node.r - 4)}
                  r="4"
                  fill={status === "OFFLINE" ? "#ef4444" : status === "DEGRADED" ? "#f97316" : "#22c55e"}
                />
                <text textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#a1a1aa" className="select-none">
                  {node.shortLabel}
                </text>
                <text textAnchor="middle" y={node.r + 12} fontSize="9" fill={isAffected ? (status === "OFFLINE" ? "#f87171" : "#fb923c") : "#71717a"} className="select-none">
                  {node.label.length > 14 ? node.label.slice(0, 13) + "…" : node.label}
                </text>
              </g>
            );
          })}

          {/* Column labels */}
          {[
            { x: 80,  label: "Network" },
            { x: 280, label: "Servers" },
            { x: 500, label: "Databases" },
            { x: 700, label: "Cloud / Data" },
          ].map(col => (
            <text key={col.x} x={col.x} y={14} textAnchor="middle" fontSize="9" fill="#3f3f46" className="select-none uppercase tracking-widest">
              {col.label}
            </text>
          ))}
        </svg>

        {/* Hover tooltip */}
        {hoveredNode && (
          <div className="absolute bottom-3 left-3 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-xs pointer-events-none">
            <p className="font-bold text-zinc-200">{hoveredNode.label}</p>
            <p className="text-zinc-500">{hoveredNode.assetType.replace(/_/g, " ")} · {hoveredNode.criticality}</p>
            <p className={`font-semibold mt-0.5 ${hoveredStatus === "OFFLINE" ? "text-red-400" : hoveredStatus === "DEGRADED" ? "text-orange-400" : "text-emerald-400"}`}>
              {hoveredStatus}
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-4 space-y-3">
        {/* Stage markers */}
        <div className="relative h-1.5 rounded-full bg-zinc-800">
          {stages.map((s, i) => (
            <div key={i} title={s.label}
              className={`absolute top-1/2 -translate-y-1/2 h-3 w-1 rounded-sm ${s.wasBlocked ? "bg-emerald-500" : "bg-orange-500"} opacity-70`}
              style={{ left: `${totalMs > 0 ? (s.relativeMs / totalMs) * 100 : 0}%` }}
            />
          ))}
          <div className="absolute inset-y-0 left-0 rounded-full bg-red-500/30" style={{ width: `${pct}%` }} />
        </div>
        <input type="range" min={0} max={totalMs} step={100} value={playheadMs}
          onChange={e => { setPlaying(false); setPlayheadMs(Number(e.target.value)); }}
          className="w-full accent-red-500 cursor-pointer"
        />
        <div className="flex items-center gap-3">
          <button onClick={() => setPlaying(p => !p)}
            className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition min-w-[64px]">
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>
          <button onClick={() => { setPlaying(false); setPlayheadMs(0); }}
            className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 transition">
            ↺ Reset
          </button>
          <div className="flex items-center gap-1 ml-auto">
            {SPEEDS.map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition ${speed === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-600 hover:text-zinc-400"}`}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Attack event log */}
      <div className="rounded-xl border border-white/8 bg-zinc-900/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8 text-xs uppercase tracking-widest text-zinc-500">
          Attack Events — {visibleEvents.length} / {events.filter(e => e.nodeId).length}
        </div>
        <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
          {visibleEvents.length === 0
            ? <p className="px-4 py-4 text-xs text-zinc-600 text-center">Press play to see the attack propagate</p>
            : visibleEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs">
                <span className="text-zinc-600 tabular-nums w-10 shrink-0">{fmtMs(ev.relativeMs)}</span>
                <span className={ev.status === "OFFLINE" ? "text-red-400" : "text-orange-400"}>
                  {ev.status === "OFFLINE" ? "💥" : "⚠"}
                </span>
                <span className="text-zinc-300 flex-1">{ev.label}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Outcome */}
      {playheadMs >= totalMs && totalMs > 0 && (
        <div className={`rounded-xl border p-4 text-center ${outcome === "CONTAINED" ? "border-emerald-500/30 bg-emerald-500/8" : "border-red-500/30 bg-red-500/8"}`}>
          <p className={`font-black text-lg ${outcome === "CONTAINED" ? "text-emerald-400" : "text-red-400"}`}>
            {outcome === "CONTAINED" ? "🛡 Threat Contained" : "💥 Breach Occurred"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">Score: {score}</p>
        </div>
      )}
    </div>
  );
}
