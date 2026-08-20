"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

/**
 * Mirrors POST /api/hunts/[sessionId]/query.
 *
 * There is no matchedArtifacts field, and there must not be one. It used to be
 * declared here and rendered as green pills reading "IP: 10.0.0.5" beside the
 * matching row — the answer key, printed next to the evidence. The API no
 * longer sends it. Finding the indicator in the rows is the exercise.
 */
interface QueryResult {
  rows: string[];
  resultCount: number;
  truncated: boolean;
  executionTime: number;
  isEffective: boolean;
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/8 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-zinc-400">
            <span className="font-semibold text-white">{results.resultCount}</span>{" "}
            {results.resultCount === 1 ? "row" : "rows"}
          </div>
          {results.isEffective && (
            <span
              className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400"
              title="This query surfaced something the session had not seen yet. What it is, is for you to spot."
            >
              New ground
            </span>
          )}
          <div className="text-sm text-zinc-400">
            Execution: <span className="font-semibold text-white">{results.executionTime}ms</span>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={exportAsCSV}
          disabled={results.rows.length === 0}
          title="Exports the rows shown, not the full match set"
        >
          <Icon name="download" size={16} />
          Export
        </Button>
      </div>

      {/* Results Table */}
      <div className="flex-1 overflow-y-auto">
        {results.rows.length > 0 ? (
          <div className="divide-y divide-white/8">
            {results.rows.map((row, idx) => {
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

      {results.truncated && (
        <div className="flex-shrink-0 border-t border-white/8 px-4 py-2 text-xs text-zinc-500">
          Showing the first {results.rows.length} of {results.resultCount} matches — narrow the
          query to see the rest.
        </div>
      )}
    </div>
  );
}
