"use client";

import { useState } from "react";
import type { ResolvedNode, NetworkNodeKind, NetworkNodeStatus } from "@/lib/network-map";

const STATUS_COLOR: Record<NetworkNodeStatus, string> = {
  clean: "#3f3f46",
  suspicious: "#f59e0b",
  compromised: "#ef4444",
  contained: "#22c55e",
};

const STATUS_LABEL: Record<NetworkNodeStatus, string> = {
  clean: "Clean",
  suspicious: "Suspicious",
  compromised: "Compromised",
  contained: "Contained",
};

const KIND_SHAPE: Record<NetworkNodeKind, "rect" | "circle" | "diamond"> = {
  workstation: "circle",
  server: "rect",
  "domain-controller": "rect",
  firewall: "diamond",
  vpn: "diamond",
  "email-gateway": "rect",
  internet: "circle",
};

function NodeShape({ node, active, onHover }: { node: ResolvedNode; active: boolean; onHover: (id: string | null) => void }) {
  const color = STATUS_COLOR[node.status];
  const shape = KIND_SHAPE[node.kind];
  const size = 34;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer"
    >
      {node.status !== "clean" && (
        <circle r={size / 2 + 6} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}>
          {(node.status === "compromised" || node.status === "suspicious") && (
            <animate attributeName="r" values={`${size / 2 + 4};${size / 2 + 12};${size / 2 + 4}`} dur="2s" repeatCount="indefinite" />
          )}
        </circle>
      )}
      {shape === "circle" && <circle r={size / 2} fill="#18181b" stroke={color} strokeWidth={active ? 3 : 2} />}
      {shape === "rect" && (
        <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={6} fill="#18181b" stroke={color} strokeWidth={active ? 3 : 2} />
      )}
      {shape === "diamond" && (
        <rect
          x={-size / 2.6}
          y={-size / 2.6}
          width={size / 1.3}
          height={size / 1.3}
          fill="#18181b"
          stroke={color}
          strokeWidth={active ? 3 : 2}
          transform="rotate(45)"
        />
      )}
      <text textAnchor="middle" y={size / 2 + 16} className="fill-zinc-300 text-[9px] font-mono select-none">
        {node.label}
      </text>
    </g>
  );
}

export function NetworkMap({ nodes }: { nodes: ResolvedNode[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredNode = nodes.find((n) => n.id === hovered);

  const maxX = Math.max(100, ...nodes.map((n) => n.x));
  const maxY = Math.max(60, ...nodes.map((n) => n.y));

  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Network Map</p>
        <div className="flex items-center gap-3">
          {(Object.keys(STATUS_COLOR) as NetworkNodeStatus[]).map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[s] }} />
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${maxX + 40} ${maxY + 40}`} className="w-full h-auto max-h-80">
        {nodes.map((n) => (
          <NodeShape key={n.id} node={n} active={hovered === n.id} onHover={setHovered} />
        ))}
      </svg>

      <div className="mt-2 h-10">
        {hoveredNode && (
          <p className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">{hoveredNode.label}</span> —{" "}
            <span style={{ color: STATUS_COLOR[hoveredNode.status] }}>{STATUS_LABEL[hoveredNode.status]}</span>
            {hoveredNode.note ? <span className="text-zinc-500"> · {hoveredNode.note}</span> : null}
          </p>
        )}
      </div>
    </div>
  );
}
