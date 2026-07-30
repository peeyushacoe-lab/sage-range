'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, AlertCircle, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { SyntaxHighlighter } from '../../_components/syntax-highlighter';
import { cn } from '@/lib/utils';

type RuleLanguage = 'SIGMA' | 'KQL' | 'SPLUNK' | 'ELASTIC' | 'YARA';

interface RuleVersion {
  version: number;
  createdAt: string;
  f1Score: number;
  changeNotes?: string;
  content: string;
  language: RuleLanguage;
}

interface RuleVersionsData {
  submissionId: string;
  ruleName: string;
  language: RuleLanguage;
  totalVersions: number;
  versions: RuleVersion[];
}

interface Props {
  params: Promise<{ submissionId: string }>;
}

export function VersionHistoryClient({ params }: Props) {
  const [data, setData] = useState<RuleVersionsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
  const [comparisonVersion, setComparisonVersion] = useState<number | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const { submissionId } = await params;
        const response = await fetch(`/api/rules/${submissionId}/versions`);

        if (!response.ok) {
          throw new Error('Failed to load version history');
        }

        const versionsData = await response.json();
        setData(versionsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load version history');
      } finally {
        setIsLoading(false);
      }
    };

    loadVersions();
  }, [params]);

  const handleRevert = async (version: number) => {
    if (!data) return;

    if (!confirm(`Revert to version ${version}? This will create a new version.`)) {
      return;
    }

    setIsReverting(true);

    try {
      const response = await fetch(`/api/rules/${data.submissionId}/revert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toVersion: version }),
      });

      if (!response.ok) {
        throw new Error('Failed to revert');
      }

      // Reload versions
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to revert');
      setIsReverting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-96 bg-zinc-800 rounded-lg animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6 flex gap-3">
            <AlertCircle size={20} className="text-red-400 flex-none mt-0.5" />
            <div>
              <p className="font-semibold text-red-400">Error</p>
              <p className="text-sm text-red-300 mt-1">{error || 'Failed to load versions'}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <div className="max-w-4xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title={`${data.ruleName} — Version History`}
          subtitle={`${data.totalVersions} version${data.totalVersions !== 1 ? 's' : ''} published`}
          actions={
            <Link
              href={`/labs/rules/${data.submissionId}`}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
            >
              Back to Rule →
            </Link>
          }
        />

        {/* Timeline */}
        <div className="space-y-0">
          {data.versions.map((version, index) => {
            const isExpanded = expandedVersion === version.version;
            const isComparison = comparisonVersion === version.version;
            const scoreColor =
              version.f1Score >= 0.8 ? 'text-emerald-400' :
              version.f1Score >= 0.6 ? 'text-amber-400' :
              'text-orange-400';

            return (
              <div key={version.version}>
                {/* Version Card */}
                <button
                  onClick={() => setExpandedVersion(isExpanded ? null : version.version)}
                  className={cn(
                    'w-full border-t border-white/10 px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition',
                    isExpanded && 'bg-white/5'
                  )}
                >
                  <ChevronDown
                    size={20}
                    className={cn(
                      'text-zinc-600 flex-none transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />

                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-white">
                        v{version.version}
                      </span>
                      <span className={cn('text-sm font-mono font-bold', scoreColor)}>
                        F1: {version.f1Score.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {new Date(version.createdAt).toLocaleString()}
                    </p>
                    {version.changeNotes && (
                      <p className="text-xs text-zinc-400 mt-2">{version.changeNotes}</p>
                    )}
                  </div>

                  {index > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRevert(version.version);
                      }}
                      disabled={isReverting}
                    >
                      <Undo2 size={14} />
                    </Button>
                  )}
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-white/10 bg-white/5 px-6 py-4 space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-white mb-2">Rule Content</p>
                      <SyntaxHighlighter
                        code={version.content}
                        language={data.language}
                        height="300px"
                        copyable={true}
                        readOnly={true}
                      />
                    </div>

                    {/* Comparison */}
                    {comparisonVersion && comparisonVersion > version.version && (
                      <div>
                        <p className="text-sm font-semibold text-white mb-2">
                          Changes from v{version.version}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-zinc-500 mb-2">v{version.version}</p>
                            <SyntaxHighlighter
                              code={version.content}
                              language={data.language}
                              height="200px"
                              copyable={false}
                              readOnly={true}
                            />
                          </div>
                          <div>
                            <p className="text-xs text-zinc-500 mb-2">v{comparisonVersion}</p>
                            {(() => {
                              const compareVer = data.versions.find(v => v.version === comparisonVersion);
                              return compareVer ? (
                                <SyntaxHighlighter
                                  code={compareVer.content}
                                  language={data.language}
                                  height="200px"
                                  copyable={false}
                                  readOnly={true}
                                />
                              ) : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Close Button */}
                    <Button
                      variant="ghost"
                      onClick={() => setExpandedVersion(null)}
                      className="w-full"
                    >
                      Collapse
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {data.versions.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-zinc-400">No version history available</p>
          </div>
        )}
      </div>
    </main>
  );
}
