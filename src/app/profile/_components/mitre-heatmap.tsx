"use client";

import React from "react";

/**
 * MITRE ATT&CK Heatmap Component
 * Displays a color-coded grid of tactics with intensity indicating frequency
 * 14 tactics × variable techniques (simplified to 5x5 for display)
 * Color scale: white (0) → navy blue (10+)
 */

const MITRE_TACTICS = [
  "RECONNAISSANCE",
  "RESOURCE_DEVELOPMENT",
  "INITIAL_ACCESS",
  "EXECUTION",
  "PERSISTENCE",
  "PRIVILEGE_ESCALATION",
  "DEFENSE_EVASION",
  "CREDENTIAL_ACCESS",
  "DISCOVERY",
  "LATERAL_MOVEMENT",
  "COLLECTION",
  "COMMAND_CONTROL",
  "EXFILTRATION",
  "IMPACT",
] as const;

type HeatmapData = Record<string, number>;

export function MitreHeatmap({
  data,
  topTactics,
  isLoading = false,
}: {
  data: HeatmapData;
  topTactics: string[];
  isLoading?: boolean;
}) {
  // Calculate max value for color scaling
  const maxValue = Math.max(...Object.values(data || {}), 10);

  const getColorClass = (value: number | undefined) => {
    const val = value ?? 0;
    if (val === 0) return "bg-white dark:bg-surface-0";
    if (val <= 2) return "bg-info dark:bg-info";
    if (val <= 4) return "bg-info dark:bg-info";
    if (val <= 6) return "bg-info dark:bg-info";
    if (val <= 8) return "bg-info dark:bg-info";
    return "bg-info dark:bg-info";
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-edge bg-surface-1 p-6">
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-4">MITRE ATT&CK Coverage</p>
        <div className="grid grid-cols-7 gap-1 mb-4">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded bg-surface-2 animate-pulse"
            />
          ))}
        </div>
        <div className="text-xs text-ink-3">Loading coverage data...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-surface-1 p-6">
      <div className="mb-6">
        <h3 className="text-xs uppercase tracking-widest text-ink-3 mb-4">
          MITRE ATT&CK Coverage
        </h3>

        {/* Heatmap grid */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-1 min-w-min">
            {MITRE_TACTICS.map((tactic) => (
              <div key={tactic} className="flex flex-col gap-1">
                {/* Column label */}
                <div className="h-8 flex items-center justify-center">
                  <div className="text-[9px] font-semibold text-ink-3 text-center rotate-45 origin-center whitespace-nowrap px-1">
                    {tactic.substring(0, 4)}
                  </div>
                </div>
                {/* 5 cells per column */}
                {Array.from({ length: 5 }).map((_, idx) => {
                  const count = data[`${tactic}_${idx}`] ?? 0;
                  return (
                    <div
                      key={`${tactic}-${idx}`}
                      className={`w-8 h-8 rounded border border-edge-strong transition-all hover:scale-110 hover:shadow-lg cursor-help ${getColorClass(count)}`}
                      title={`${tactic}: ${count} item${count !== 1 ? "s" : ""}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="text-xs text-ink-3">Coverage Scale:</div>
          </div>
          {[0, 2, 4, 6, 8, 10].map((val) => (
            <div key={val} className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded ${getColorClass(val)}`}
              />
              <span className="text-xs text-ink-3">{val}+</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top tactics */}
      {topTactics.length > 0 && (
        <div className="border-t border-edge-subtle pt-4">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">
            Top Techniques
          </p>
          <div className="flex flex-wrap gap-3">
            {topTactics.map((tactic, idx) => {
              const count = data[tactic] ?? 0;
              return (
                <div
                  key={tactic}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-info-edge bg-info-wash"
                >
                  <span className="text-xs font-semibold text-info">
                    {idx + 1}.
                  </span>
                  <span className="text-xs text-ink-2">
                    {tactic.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-bold text-info ml-1">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
