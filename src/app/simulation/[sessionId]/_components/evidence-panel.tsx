"use client";

import { useState } from "react";
import type { InvestigationArtifact, ArtifactType, Severity } from "@/lib/simulation/runtime/evidence";

const TYPE_LABELS: Record<ArtifactType, string> = {
  SIEM:         "SIEM",
  EDR:          "EDR",
  EMAIL:        "EMAIL",
  NETWORK:      "NET",
  FILE:         "FILE",
  DLP:          "DLP",
  THREAT_INTEL: "TI",
  CLOUD:        "CLOUD",
  ENDPOINT:     "HOST",
};

const TYPE_COLORS: Record<ArtifactType, string> = {
  SIEM:         "text-purple-400 bg-purple-500/10 border-purple-500/30",
  EDR:          "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  EMAIL:        "text-blue-400 bg-blue-500/10 border-blue-500/30",
  NETWORK:      "text-orange-400 bg-orange-500/10 border-orange-500/30",
  FILE:         "text-zinc-300 bg-zinc-700/50 border-zinc-600",
  DLP:          "text-pink-400 bg-pink-500/10 border-pink-500/30",
  THREAT_INTEL: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  CLOUD:        "text-sky-400 bg-sky-500/10 border-sky-500/30",
  ENDPOINT:     "text-sage-400 bg-sage-500/10 border-sage-500/30",
};

const SEV_COLORS: Record<Severity, string> = {
  INFO:     "text-zinc-400 border-zinc-700",
  LOW:      "text-blue-400 border-blue-500/40",
  MEDIUM:   "text-amber-400 border-amber-500/40",
  HIGH:     "text-orange-400 border-orange-500/40",
  CRITICAL: "text-red-400 border-red-500/40 animate-pulse",
};

function ArtifactCard({
  artifact,
  isRead,
  onRead,
}: {
  artifact: InvestigationArtifact;
  isRead: boolean;
  onRead: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  function toggle() {
    setExpanded((v) => !v);
    if (!isRead) onRead();
  }

  return (
    <div
      className={`rounded-lg border transition-all ${
        isRead
          ? "border-sage-500/25 bg-sage-500/3"
          : "border-white/10 bg-zinc-900/60 hover:border-white/20"
      }`}
    >
      <button onClick={toggle} className="w-full text-left p-3 flex items-start gap-3">
        {/* Type badge */}
        <span
          className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-widest mt-0.5 ${
            TYPE_COLORS[artifact.type]
          }`}
        >
          {TYPE_LABELS[artifact.type]}
        </span>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-snug ${isRead ? "text-zinc-300" : "text-zinc-100"}`}>
            {artifact.title}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5 truncate">
            {artifact.source} · {artifact.timestamp}
          </p>
          {!expanded && (
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{artifact.summary}</p>
          )}
        </div>

        {/* Severity + read state */}
        <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
          <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded ${SEV_COLORS[artifact.severity]}`}>
            {artifact.severity}
          </span>
          {isRead ? (
            <span className="text-[10px] text-sage-500 font-bold">✓ READ</span>
          ) : (
            <span className="text-[9px] font-bold text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded tracking-wider">
              UNREAD
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 mx-3 pt-3 pb-3">
          <pre className="text-[11px] text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin">
            {artifact.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export function EvidencePanel({
  artifacts,
  readIds,
  onRead,
}: {
  artifacts: InvestigationArtifact[];
  readIds: Set<string>;
  onRead: (id: string) => void;
}) {
  const readCount = artifacts.filter((a) => readIds.has(a.id)).length;
  const allRead = readCount === artifacts.length;

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Investigate
          </span>
          <span className="text-[10px] text-zinc-600">
            — review evidence before acting
          </span>
        </div>
        <span className={`text-[10px] font-bold ${allRead ? "text-sage-400" : "text-zinc-500"}`}>
          {readCount}/{artifacts.length} examined
        </span>
      </div>

      <div className="space-y-2">
        {artifacts.map((a) => (
          <ArtifactCard
            key={a.id}
            artifact={a}
            isRead={readIds.has(a.id)}
            onRead={() => onRead(a.id)}
          />
        ))}
      </div>

      {!allRead && (
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Open at least one artifact to unlock response actions
        </p>
      )}
    </div>
  );
}
