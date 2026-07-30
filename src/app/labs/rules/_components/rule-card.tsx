'use client';

import Link from 'next/link';
import { Heart, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

type RuleLanguage = 'SIGMA' | 'KQL' | 'SPLUNK' | 'ELASTIC' | 'YARA';

interface RuleCardProps {
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

const LANGUAGE_COLORS: Record<RuleLanguage, string> = {
  SIGMA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  KQL: 'bg-info-wash text-info border-info-edge',
  SPLUNK: 'bg-accent-wash text-accent border-accent-edge',
  ELASTIC: 'bg-warn-wash text-warn border-warn-edge',
  YARA: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

export function RuleCard({
  submissionId,
  name,
  language,
  description,
  f1Score,
  authorName,
  viewsCount,
  favoritesCount,
  previewLines,
}: RuleCardProps) {
  const scoreColor =
    f1Score >= 0.8 ? 'text-ok' :
    f1Score >= 0.6 ? 'text-warn' :
    'text-sev-high';

  return (
    <Link
      href={`/labs/rules/${submissionId}`}
      className="group block rounded-xl border border-edge bg-surface-1 hover:bg-surface-1 p-4 transition-all duration-200 hover:border-edge-strong"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-ok transition">
            {name}
          </h3>
          <p className="text-xs text-ink-3 mt-1 truncate">by {authorName}</p>
        </div>
        <span
          className={cn(
            'flex-none rounded-lg border px-2 py-1 text-xs font-mono font-medium whitespace-nowrap',
            LANGUAGE_COLORS[language]
          )}
        >
          {language}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-ink-2 line-clamp-2 mb-3 leading-relaxed">
        {description}
      </p>

      {/* Preview code */}
      <div className="mb-3 rounded-lg bg-surface-0/50 border border-edge-subtle p-2 font-mono text-xs text-ink-3 space-y-1 max-h-20 overflow-hidden">
        {previewLines.slice(0, 3).map((line, i) => (
          <div key={i} className="truncate">
            {line.length > 60 ? `${line.slice(0, 60)}...` : line}
          </div>
        ))}
        {previewLines.length > 3 && (
          <div className="text-ink-3 italic">... {previewLines.length - 3} more lines</div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {/* F1 Score */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className={cn('text-sm font-bold font-mono', scoreColor)}>
                {f1Score.toFixed(2)}
              </span>
              <div className="w-16 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    f1Score >= 0.8 ? 'bg-ok' :
                    f1Score >= 0.6 ? 'bg-warn' :
                    'bg-sev-high'
                  )}
                  style={{ width: `${f1Score * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-ink-3">
          <div className="flex items-center gap-1">
            <Eye size={14} />
            <span>{viewsCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart size={14} />
            <span>{favoritesCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
