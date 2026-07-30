'use client';

import { useState } from 'react';
import { X, Play, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TestRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  ruleLanguage: string;
}

interface TestResult {
  executionTimeMs: number;
  matchCount: number;
  matchedLines: Array<{
    lineNumber: number;
    content: string;
  }>;
  errors: string[];
}

export function TestRuleModal({
  isOpen,
  onClose,
  submissionId,
  ruleLanguage,
}: TestRuleModalProps) {
  const [testData, setTestData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    if (!testData.trim()) {
      setError('Please provide test data');
      return;
    }

    const lines = testData.split('\n').filter(l => l.trim());
    if (lines.length > 10) {
      setError('Maximum 10 test lines allowed');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/rules/${submissionId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testData: testData.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Test execution failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-edge bg-surface-1 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-edge bg-surface-1 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Test Rule</h2>
            <p className="text-xs text-ink-3 mt-1">
              Execute your {ruleLanguage} rule against test data (max 10 lines)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Test Data Input */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Test Data
            </label>
            <textarea
              value={testData}
              onChange={(e) => setTestData(e.target.value)}
              placeholder="Paste log lines here (one per line, max 10 lines)&#10;Example: [2024-07-30] Failed login attempt from 192.168.1.100"
              className="w-full h-32 rounded-lg border border-edge bg-surface-0 px-3 py-2 text-sm font-mono text-ink-2 placeholder-ink-3 focus:border-ok-edge focus:outline-none focus:ring-1 focus:ring-ok resize-none"
            />
            <p className="text-xs text-ink-3 mt-1">
              {testData.split('\n').filter(l => l.trim()).length} / 10 lines
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-danger-edge bg-danger-wash p-3 flex gap-3">
              <AlertCircle size={16} className="text-danger flex-none mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-danger">Error</p>
                <p className="text-xs text-danger mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-edge bg-surface-0 p-3">
                  <p className="text-xs text-ink-3 mb-1">Execution Time</p>
                  <p className="text-lg font-bold text-white">{result.executionTimeMs}ms</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-0 p-3">
                  <p className="text-xs text-ink-3 mb-1">Matches</p>
                  <p className="text-lg font-bold text-ok">{result.matchCount}</p>
                </div>
                <div className="rounded-lg border border-edge bg-surface-0 p-3">
                  <p className="text-xs text-ink-3 mb-1">Errors</p>
                  <p className={cn(
                    'text-lg font-bold',
                    result.errors.length > 0 ? 'text-danger' : 'text-ok'
                  )}>
                    {result.errors.length}
                  </p>
                </div>
              </div>

              {/* Matched Lines */}
              {result.matchedLines.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Check size={16} className="text-ok" />
                    Matched Lines
                  </p>
                  <div className="space-y-2">
                    {result.matchedLines.map((match) => (
                      <div
                        key={match.lineNumber}
                        className="rounded-lg border border-ok-edge bg-ok-wash p-2"
                      >
                        <p className="text-xs font-mono text-ok mb-1">
                          Line {match.lineNumber}
                        </p>
                        <p className="text-xs text-ink-2 font-mono break-all">
                          {match.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <AlertCircle size={16} className="text-danger" />
                    Errors ({result.errors.length})
                  </p>
                  <div className="space-y-2">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-danger-edge bg-danger-wash p-2"
                      >
                        <p className="text-xs text-danger font-mono">{err}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-edge bg-surface-1 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleExecute}
            disabled={isLoading || !testData.trim()}
            className="flex items-center gap-2"
          >
            <Play size={16} />
            {isLoading ? 'Testing...' : 'Execute Test'}
          </Button>
        </div>
      </div>
    </div>
  );
}
