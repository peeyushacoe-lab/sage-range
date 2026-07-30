'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type RuleLanguage = 'SIGMA' | 'KQL' | 'SPLUNK' | 'ELASTIC' | 'YARA';

interface SyntaxHighlighterProps {
  code: string;
  language: RuleLanguage;
  showLineNumbers?: boolean;
  copyable?: boolean;
  readOnly?: boolean;
  className?: string;
  height?: string;
}

const LANGUAGE_KEYWORDS: Record<RuleLanguage, Record<string, string>> = {
  SIGMA: {
    title: 'text-cyan-400',
    logsource: 'text-cyan-400',
    detection: 'text-cyan-400',
    condition: 'text-cyan-400',
    timeframe: 'text-cyan-400',
    references: 'text-cyan-400',
    tags: 'text-accent',
    author: 'text-accent',
  },
  KQL: {
    where: 'text-cyan-400',
    and: 'text-cyan-400',
    or: 'text-cyan-400',
    not: 'text-cyan-400',
    in: 'text-cyan-400',
    contains: 'text-cyan-400',
    startswith: 'text-cyan-400',
  },
  SPLUNK: {
    index: 'text-cyan-400',
    source: 'text-cyan-400',
    sourcetype: 'text-cyan-400',
    earliest: 'text-cyan-400',
    latest: 'text-cyan-400',
  },
  ELASTIC: {
    query: 'text-cyan-400',
    match: 'text-cyan-400',
    bool: 'text-cyan-400',
    must: 'text-cyan-400',
    should: 'text-cyan-400',
    filter: 'text-cyan-400',
  },
  YARA: {
    rule: 'text-cyan-400',
    strings: 'text-cyan-400',
    condition: 'text-cyan-400',
    meta: 'text-cyan-400',
  },
};

function highlightLine(line: string, language: RuleLanguage): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Comment detection
  const commentMatch = line.match(/^\s*#/);
  if (commentMatch) {
    return [<span key="0" className="text-ink-3">{line}</span>];
  }

  // String detection
  const stringRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
  const matches = Array.from(line.matchAll(stringRegex));

  // Add keywords
  const keywords = LANGUAGE_KEYWORDS[language];
  const keywordRegex = new RegExp(
    `\\b(${Object.keys(keywords).join('|')})\\b`,
    'gi'
  );

  let lastPos = 0;
  const tokens: Array<{ type: string; value: string; pos: number }> = [];

  for (const match of line.matchAll(keywordRegex)) {
    if (match.index! > lastPos) {
      tokens.push({
        type: 'text',
        value: line.slice(lastPos, match.index),
        pos: lastPos,
      });
    }
    tokens.push({
      type: 'keyword',
      value: match[0],
      pos: match.index!,
    });
    lastPos = match.index! + match[0].length;
  }

  if (lastPos < line.length) {
    tokens.push({
      type: 'text',
      value: line.slice(lastPos),
      pos: lastPos,
    });
  }

  return tokens.length > 0
    ? tokens.map((token, i) =>
        token.type === 'keyword' ? (
          <span
            key={i}
            className={cn(keywords[token.value.toLowerCase() as keyof typeof keywords])}
          >
            {token.value}
          </span>
        ) : (
          <span key={i}>{token.value}</span>
        )
      )
    : [<span key="0">{line}</span>];
}

export function SyntaxHighlighter({
  code,
  language,
  showLineNumbers = true,
  copyable = true,
  readOnly = true,
  className,
  height = '400px',
}: SyntaxHighlighterProps) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative rounded-lg border border-edge bg-surface-1 overflow-hidden',
        className
      )}
      style={{ height }}
    >
      {/* Copy button */}
      {copyable && (
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 z-10 rounded-lg border border-edge bg-surface-2 p-2 text-ink-2 hover:text-white hover:bg-surface-3 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check size={16} className="text-ok" />
          ) : (
            <Copy size={16} />
          )}
        </button>
      )}

      {/* Code container */}
      <div className="flex h-full overflow-hidden">
        {/* Line numbers */}
        {showLineNumbers && (
          <div className="flex-none border-r border-edge-subtle bg-surface-0 px-3 py-3 text-right text-xs text-ink-3 font-mono select-none overflow-hidden">
            {lines.map((_, i) => (
              <div key={i} className="h-6 leading-6">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code */}
        <pre
          className="flex-1 overflow-auto p-3 text-xs leading-6 text-ink-2 font-mono"
          style={{
            WebkitTextFillColor: 'inherit',
          }}
        >
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex">
                <span>{highlightLine(line, language).map((part) => part)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
