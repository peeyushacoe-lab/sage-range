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
  KQL: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  SPLUNK: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ELASTIC: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
    f1Score >= 0.8 ? 'text-emerald-400' :
    f1Score >= 0.6 ? 'text-amber-400' :
    'text-orange-400';

  return (
    <Link
      href={`/labs/rules/${submissionId}`}
      className="group block rounded-xl border border-white/8 bg-zinc-900/40 hover:bg-zinc-900/60 p-4 transition-all duration-200 hover:border-white/15"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-emerald-400 transition">
            {name}
          </h3>
          <p className="text-xs text-zinc-500 mt-1 truncate">by {authorName}</p>
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
      <p className="text-xs text-zinc-400 line-clamp-2 mb-3 leading-relaxed">
        {description}
      </p>

      {/* Preview code */}
      <div className="mb-3 rounded-lg bg-zinc-950/50 border border-white/5 p-2 font-mono text-xs text-zinc-500 space-y-1 max-h-20 overflow-hidden">
        {previewLines.slice(0, 3).map((line, i) => (
          <div key={i} className="truncate">
            {line.length > 60 ? `${line.slice(0, 60)}...` : line}
          </div>
        ))}
        {previewLines.length > 3 && (
          <div className="text-zinc-600 italic">... {previewLines.length - 3} more lines</div>
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
              <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all',
                    f1Score >= 0.8 ? 'bg-emerald-500' :
                    f1Score >= 0.6 ? 'bg-amber-500' :
                    'bg-orange-500'
                  )}
                  style={{ width: `${f1Score * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-zinc-600">
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
