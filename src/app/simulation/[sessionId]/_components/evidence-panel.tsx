"use client";

import { useState } from "react";
import type { InvestigationArtifact, ArtifactType, Severity } from "@/lib/simulation/runtime/evidence";

import { Icon } from "@/components/ui/icon";
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
  SIEM:         "text-accent bg-accent-wash border-accent-edge",
  EDR:          "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  EMAIL:        "text-info bg-info-wash border-info-edge",
  NETWORK:      "text-sev-high bg-sev-high-wash border-sev-high-edge",
  FILE:         "text-ink-2 bg-surface-3/50 border-edge-strong",
  DLP:          "text-pink-400 bg-pink-500/10 border-pink-500/30",
  THREAT_INTEL: "text-warn bg-warn-wash border-warn-edge",
  CLOUD:        "text-info bg-info-wash border-info-edge",
  ENDPOINT:     "text-ok bg-ok-wash border-ok-edge",
};

const SEV_COLORS: Record<Severity, string> = {
  INFO:     "text-ink-2 border-edge-strong",
  LOW:      "text-info border-info-edge",
  MEDIUM:   "text-warn border-warn-edge",
  HIGH:     "text-sev-high border-sev-high-edge",
  CRITICAL: "text-danger border-danger-edge animate-pulse",
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
          ? "border-ok-edge bg-ok-wash"
          : "border-edge bg-surface-1 hover:border-edge-strong"
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
          <p className={`text-sm font-medium leading-snug ${isRead ? "text-ink-2" : "text-ink"}`}>
            {artifact.title}
          </p>
          <p className="text-[10px] text-ink-3 mt-0.5 truncate">
            {artifact.source} · {artifact.timestamp}
          </p>
          {!expanded && (
            <p className="text-xs text-ink-3 mt-1 leading-relaxed">{artifact.summary}</p>
          )}
        </div>

        {/* Severity + read state */}
        <div className="shrink-0 flex flex-col items-end gap-1 pt-0.5">
          <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded ${SEV_COLORS[artifact.severity]}`}>
            {artifact.severity}
          </span>
          {isRead ? (
            <span className="text-[10px] text-ok font-bold"><Icon name="check" size={14} className="inline-block shrink-0" /> READ</span>
          ) : (
            <span className="text-[9px] font-bold text-warn border border-warn-edge px-1.5 py-0.5 rounded tracking-wider">
              UNREAD
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-edge-subtle mx-3 pt-3 pb-3">
          <pre className="text-[11px] text-ink-2 font-mono leading-relaxed whitespace-pre-wrap break-words overflow-x-auto max-h-72 overflow-y-auto scrollbar-thin">
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
          <span className="text-xs font-bold uppercase tracking-widest text-ink-3">
            Investigate
          </span>
          <span className="text-[10px] text-ink-3">
            — review evidence before acting
          </span>
        </div>
        <span className={`text-[10px] font-bold ${allRead ? "text-ok" : "text-ink-3"}`}>
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
        <p className="text-[10px] text-ink-3 mt-2 text-center">
          Open at least one artifact to unlock response actions
        </p>
      )}
    </div>
  );
}
