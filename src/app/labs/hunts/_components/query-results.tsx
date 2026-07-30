"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

interface QueryResult {
  rows: string[];
  executionTime: number;
  matchedArtifacts: Array<{ lineIndex: number; artifactType: string; value: string }>;
}

export function QueryResults({ results }: { results: QueryResult }) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpansion = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const exportAsCSV = () => {
    const csv = results.rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hunt-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const artifactsByLine = new Map<number, typeof results.matchedArtifacts>(
    results.matchedArtifacts.reduce(
      (acc, artifact) => {
        if (!acc.has(artifact.lineIndex)) {
          acc.set(artifact.lineIndex, []);
        }
        acc.get(artifact.lineIndex)!.push(artifact);
        return acc;
      },
      new Map() as Map<number, typeof results.matchedArtifacts>
    )
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-400">
            <span className="font-semibold text-white">{results.rows.length}</span> rows
          </div>
          <div className="text-sm text-zinc-400">
            Execution: <span className="font-semibold text-white">{results.executionTime}ms</span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={exportAsCSV}
          disabled={results.rows.length === 0}
        >
          <Icon name="download" size={16} />
          Export
        </Button>
      </div>

      {/* Results Table */}
      <div className="flex-1 overflow-y-auto">
        {results.rows.length > 0 ? (
          <div className="divide-y divide-white/8">
            {results.rows.slice(0, 100).map((row, idx) => {
              const artifacts = artifactsByLine.get(idx) || [];
              const isExpanded = expandedRows.has(idx);
              const truncatedRow = row.length > 120 ? row.substring(0, 120) + "..." : row;

              return (
                <div key={idx} className="hover:bg-white/5 transition">
                  <div className="flex items-start gap-3 p-3">
                    <div className="text-xs text-zinc-600 font-mono w-8 flex-shrink-0 pt-1">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <pre className="flex-1 text-xs text-zinc-300 font-mono overflow-hidden whitespace-pre-wrap break-words">
                          {isExpanded ? row : truncatedRow}
                        </pre>
                        <div className="flex gap-1 flex-shrink-0">
                          {row.length > 120 && (
                            <button
                              onClick={() => toggleRowExpansion(idx)}
                              className="text-zinc-500 hover:text-zinc-300 transition"
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              <Icon name={isExpanded ? "chevronDown" : "chevronRight"} size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => copyToClipboard(row)}
                            className="text-zinc-500 hover:text-emerald-400 transition"
                            title="Copy"
                          >
                            <Icon name="link" size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Matched Artifacts */}
                      {artifacts.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {artifacts.map((artifact, aidx) => (
                            <span
                              key={aidx}
                              className="text-xs px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono"
                            >
                              {artifact.artifactType}: {artifact.value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            No results found
          </div>
        )}
      </div>

      {results.rows.length > 100 && (
        <div className="flex-shrink-0 border-t border-white/8 px-4 py-2 text-xs text-zinc-500">
          Showing first 100 of {results.rows.length} results
        </div>
      )}
    </div>
  );
}
