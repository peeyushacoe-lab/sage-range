"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { QueryResults } from "./query-results";
import { QueryHistory } from "./query-history";

interface QueryResult {
  rows: string[];
  executionTime: number;
  matchedArtifacts: Array<{ lineIndex: number; artifactType: string; value: string }>;
}

type QueryLanguage = "GREP" | "REGEX" | "KQL" | "SQL_LITE" | "NATURAL_LANGUAGE";

const LANGUAGE_EXAMPLES: Record<QueryLanguage, string> = {
  GREP: 'grep "error" logfile.txt',
  REGEX: "/error.*failed/gi",
  KQL: 'EventID=4688 AND Image="cmd.exe"',
  SQL_LITE: "SELECT * FROM logs WHERE level='ERROR'",
  NATURAL_LANGUAGE: "Show me failed login attempts from administrative accounts",
};

export function QueryConsole({ sessionId }: { sessionId: string }) {
  const [language, setLanguage] = useState<QueryLanguage>("NATURAL_LANGUAGE");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<Array<{ query: string; time: Date }>>(
    typeof window !== "undefined"
      ? JSON.parse(sessionStorage.getItem(`hunt-history-${sessionId}`) || "[]")
      : []
  );
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Save history to session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`hunt-history-${sessionId}`, JSON.stringify(history));
    }
  }, [history, sessionId]);

  const handleExecute = async () => {
    if (!query.trim()) return;

    setIsExecuting(true);
    setError(null);

    try {
      const res = await fetch(`/api/hunts/${sessionId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, query }),
      });

      if (res.status === 429) {
        setError("Rate limit reached. Please wait before executing another query.");
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Query execution failed");
        return;
      }

      const data = (await res.json()) as QueryResult;
      setResults(data);

      // Add to history (max 10)
      setHistory((prev) => [
        { query, time: new Date() },
        ...prev.slice(0, 9),
      ]);
    } catch (err) {
      setError("Failed to execute query. Please try again.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSelectFromHistory = (q: string) => {
    setQuery(q);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Query Input */}
      <div className="flex-shrink-0 border-b border-edge p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs uppercase tracking-widest text-ink-3">Query Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as QueryLanguage)}
            disabled={isExecuting}
            className="text-xs bg-surface-2 border border-edge rounded px-2 py-1 text-ink-2 focus:outline-none focus:border-ok-edge"
          >
            {(["GREP", "REGEX", "KQL", "SQL_LITE", "NATURAL_LANGUAGE"] as QueryLanguage[]).map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleExecute();
              }
            }}
            placeholder={LANGUAGE_EXAMPLES[language]}
            disabled={isExecuting}
            className="w-full h-20 bg-surface-1 border border-edge rounded-lg px-3 py-2 text-sm text-white placeholder-ink-3 resize-none focus:outline-none focus:border-ok-edge focus:ring-1 focus:ring-ok"
          />
          <div className="absolute bottom-2 right-2 text-xs text-ink-3">
            {query.length} chars
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleExecute}
            disabled={isExecuting || !query.trim()}
          >
            <Icon name="search" size={16} />
            {isExecuting ? "Executing..." : "Execute"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setQuery("")}
            disabled={isExecuting}
          >
            Clear
          </Button>
        </div>

        {error && (
          <div className="bg-danger-wash border border-danger-edge rounded px-3 py-2 text-xs text-danger">
            {error}
          </div>
        )}
      </div>

      {/* Results or History */}
      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Query Results */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {results ? (
            <QueryResults results={results} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-3">
              <div className="text-center">
                <Icon name="search" size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Execute a query to see results</p>
              </div>
            </div>
          )}
        </div>

        {/* Query History */}
        {history.length > 0 && (
          <div className="hidden md:flex md:flex-col w-48 border-l border-edge">
            <QueryHistory
              history={history}
              onSelectQuery={handleSelectFromHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
}
