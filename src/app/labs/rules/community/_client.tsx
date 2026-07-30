'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { RuleCard } from '../_components/rule-card';
import { cn } from '@/lib/utils';

type RuleLanguage = 'SIGMA' | 'KQL' | 'SPLUNK' | 'ELASTIC' | 'YARA';
type SortBy = 'score' | 'date' | 'popularity';

interface RuleData {
  submissionId: string;
  name: string;
  language: RuleLanguage;
  description: string;
  f1Score: number;
  authorName: string;
  viewsCount: number;
  favoritesCount: number;
  previewLines: string[];
}

interface CommunityRulesResponse {
  rules: RuleData[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const LANGUAGES: RuleLanguage[] = ['SIGMA', 'KQL', 'SPLUNK', 'ELASTIC', 'YARA'];

export function CommunityRulesClient() {
  const [rules, setRules] = useState<RuleData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<RuleLanguage[]>([]);
  const [f1ScoreRange, setF1ScoreRange] = useState({ min: 0, max: 1 });
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        sortBy,
        ...(searchQuery && { search: searchQuery }),
        ...(selectedLanguages.length > 0 && { languages: selectedLanguages.join(',') }),
        ...(f1ScoreRange.min !== 0 || f1ScoreRange.max !== 1) && {
          minF1Score: f1ScoreRange.min.toString(),
          maxF1Score: f1ScoreRange.max.toString(),
        },
      });

      const response = await fetch(`/api/rules/community?${params}`);

      if (!response.ok) {
        throw new Error('Failed to load community rules');
      }

      const data: CommunityRulesResponse = await response.json();
      setRules(data.rules);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, [page, sortBy, searchQuery, selectedLanguages, f1ScoreRange]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedLanguages, f1ScoreRange, sortBy]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const toggleLanguage = (lang: RuleLanguage) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang)
        ? prev.filter((l) => l !== lang)
        : [...prev, lang]
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedLanguages([]);
    setF1ScoreRange({ min: 0, max: 1 });
    setSortBy('score');
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Community Rules"
          subtitle="Discover detection rules from the community. Learn from high-performing rules and share your own."
          actions={
            <Link
              href="/labs/rules/builder"
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition"
            >
              Create Rule →
            </Link>
          }
        />

        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rules by name or description..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-zinc-950 text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
          />
        </div>

        {/* Filters Section */}
        <div className="mb-6">
          <button
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all',
              isFilterExpanded
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
            )}
          >
            <Filter size={16} />
            Filters {selectedLanguages.length > 0 && `(${selectedLanguages.length})`}
          </button>

          {isFilterExpanded && (
            <div className="mt-3 rounded-lg border border-white/10 bg-zinc-900/60 p-4 space-y-4">
              {/* Language Filter */}
              <div>
                <p className="text-sm font-semibold text-white mb-2">Language</p>
                <div className="flex gap-2 flex-wrap">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-mono font-medium transition-all',
                        selectedLanguages.includes(lang)
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* F1 Score Filter */}
              <div>
                <p className="text-sm font-semibold text-white mb-2">F1 Score Range</p>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={f1ScoreRange.min}
                    onChange={(e) =>
                      setF1ScoreRange((prev) => ({
                        ...prev,
                        min: Math.min(parseFloat(e.target.value), prev.max),
                      }))
                    }
                    className="w-full"
                  />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={f1ScoreRange.max}
                    onChange={(e) =>
                      setF1ScoreRange((prev) => ({
                        ...prev,
                        max: Math.max(parseFloat(e.target.value), prev.min),
                      }))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-zinc-500">
                    {f1ScoreRange.min.toFixed(1)} - {f1ScoreRange.max.toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Sort By */}
              <div>
                <p className="text-sm font-semibold text-white mb-2">Sort By</p>
                <div className="flex gap-2">
                  {(['score', 'date', 'popularity'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setSortBy(option)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all capitalize',
                        sortBy === option
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10'
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Button */}
              <Button
                variant="ghost"
                onClick={resetFilters}
                className="w-full text-xs"
              >
                Reset Filters
              </Button>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex gap-3">
            <AlertCircle size={18} className="text-red-400 flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-400">Error</p>
              <p className="text-xs text-red-300 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Rules Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-64 bg-zinc-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : rules.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {rules.map((rule) => (
                <RuleCard
                  key={rule.submissionId}
                  submissionId={rule.submissionId}
                  name={rule.name}
                  language={rule.language}
                  description={rule.description}
                  f1Score={rule.f1Score}
                  authorName={rule.authorName}
                  viewsCount={rule.viewsCount}
                  favoritesCount={rule.favoritesCount}
                  previewLines={rule.previewLines}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  size="sm"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    const show = Math.abs(pageNum - page) <= 1 || pageNum === 1 || pageNum === totalPages;
                    return (
                      <div key={i}>
                        {!show && i > 0 && i < totalPages - 1 && (
                          <span className="text-zinc-600">...</span>
                        )}
                        {show && (
                          <button
                            onClick={() => setPage(pageNum)}
                            className={cn(
                              'px-3 py-1 rounded-lg text-sm font-medium transition-all',
                              pageNum === page
                                ? 'bg-emerald-600 text-white'
                                : 'border border-white/10 text-zinc-400 hover:bg-white/5'
                            )}
                          >
                            {pageNum}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-zinc-400 mb-2">No rules found</p>
            <p className="text-xs text-zinc-600">
              Try adjusting your filters or create a new rule
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
