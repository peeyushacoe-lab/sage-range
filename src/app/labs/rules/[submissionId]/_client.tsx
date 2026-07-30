'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FileText, Share, Trash2, Eye, Heart, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { SyntaxHighlighter } from '../_components/syntax-highlighter';
import { RuleEditorModal } from '../_components/rule-editor-modal';
import { ShareModal } from '../_components/share-modal';
import { cn } from '@/lib/utils';

type RuleLanguage = 'SIGMA' | 'KQL' | 'SPLUNK' | 'ELASTIC' | 'YARA';
type Visibility = 'PRIVATE' | 'COMMUNITY' | 'RECRUITER_ONLY';

interface RuleData {
  id: string;
  name: string;
  description: string;
  language: RuleLanguage;
  content: string;
  f1Score: number;
  currentVersion: number;
  visibility: Visibility;
  authorName: string;
  createdAt: string;
  userId: string;
  viewsCount?: number;
  favoritesCount?: number;
}

const LANGUAGE_COLORS: Record<RuleLanguage, string> = {
  SIGMA: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  KQL: 'bg-info-wash text-info border-info-edge',
  SPLUNK: 'bg-accent-wash text-accent border-accent-edge',
  ELASTIC: 'bg-warn-wash text-warn border-warn-edge',
  YARA: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  PRIVATE: 'Private',
  COMMUNITY: 'Community',
  RECRUITER_ONLY: 'Recruiter Only',
};

interface Props {
  params: Promise<{ submissionId: string }>;
}

export function RuleDetailsClient({ params }: Props) {
  const [rule, setRule] = useState<RuleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentVisibility, setCurrentVisibility] = useState<Visibility>('PRIVATE');

  useEffect(() => {
    const loadRule = async () => {
      try {
        const { submissionId } = await params;
        const response = await fetch(`/api/rules/${submissionId}`);

        if (!response.ok) {
          throw new Error('Failed to load rule');
        }

        const data = await response.json();
        setRule(data);
        setCurrentVisibility(data.visibility);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rule');
      } finally {
        setIsLoading(false);
      }
    };

    loadRule();
  }, [params]);

  const handleDelete = async () => {
    if (!rule) return;

    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/rules/${rule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      // Redirect to rules page
      window.location.href = '/labs/rules/community';
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete rule');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface-0 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-12 bg-surface-2 rounded-lg animate-pulse" />
            <div className="h-64 bg-surface-2 rounded-lg animate-pulse" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !rule) {
    return (
      <main className="min-h-screen bg-surface-0 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="rounded-lg border border-danger-edge bg-danger-wash p-6 flex gap-3">
            <AlertCircle size={20} className="text-danger flex-none mt-0.5" />
            <div>
              <p className="font-semibold text-danger">Error</p>
              <p className="text-sm text-danger mt-1">{error || 'Rule not found'}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const scoreColor =
    rule.f1Score >= 0.8 ? 'text-ok' :
    rule.f1Score >= 0.6 ? 'text-warn' :
    'text-sev-high';

  const isOwner = true; // In real implementation, check userId === currentUser.id

  return (
    <main className="min-h-screen bg-surface-0 text-white">

      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title={rule.name}
          subtitle={rule.description}
          actions={
            <Link
              href="/labs/rules/community"
              className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-white hover:border-edge-strong transition"
            >
              Back to Community →
            </Link>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left: Rule Info */}
          <div className="lg:col-span-1 space-y-4">
            {/* Language Badge */}
            <div>
              <p className="text-xs text-ink-3 mb-2 uppercase tracking-widest">Language</p>
              <span className={cn(
                'inline-flex rounded-lg border px-3 py-1.5 text-xs font-mono font-semibold',
                LANGUAGE_COLORS[rule.language]
              )}>
                {rule.language}
              </span>
            </div>

            {/* F1 Score */}
            <div>
              <p className="text-xs text-ink-3 mb-2 uppercase tracking-widest">F1 Score</p>
              <div className="rounded-lg border border-edge bg-surface-1 p-3">
                <div className="text-2xl font-bold text-white mb-2">
                  <span className={scoreColor}>{rule.f1Score.toFixed(2)}</span>
                </div>
                <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all',
                      rule.f1Score >= 0.8 ? 'bg-ok' :
                      rule.f1Score >= 0.6 ? 'bg-warn' :
                      'bg-sev-high'
                    )}
                    style={{ width: `${rule.f1Score * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Author */}
            <div>
              <p className="text-xs text-ink-3 mb-2 uppercase tracking-widest">Author</p>
              <p className="text-sm font-medium text-white">{rule.authorName}</p>
              <p className="text-xs text-ink-3 mt-1">
                {new Date(rule.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Visibility */}
            <div>
              <p className="text-xs text-ink-3 mb-2 uppercase tracking-widest">Visibility</p>
              <p className="text-sm font-medium text-ink-2">
                {VISIBILITY_LABELS[rule.visibility]}
              </p>
            </div>

            {/* Version */}
            <div>
              <p className="text-xs text-ink-3 mb-2 uppercase tracking-widest">Version</p>
              <p className="text-sm font-mono font-bold text-white">v{rule.currentVersion}</p>
            </div>

            {/* Community Stats */}
            {rule.visibility === 'COMMUNITY' && (
              <>
                <div className="pt-2 border-t border-edge">
                  <p className="text-xs text-ink-3 mb-3 uppercase tracking-widest">Stats</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-ink-2">
                        <Eye size={14} />
                        Views
                      </div>
                      <span className="text-sm font-mono font-bold text-white">
                        {rule.viewsCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-ink-2">
                        <Heart size={14} />
                        Favorites
                      </div>
                      <span className="text-sm font-mono font-bold text-white">
                        {rule.favoritesCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Center: Rule Display */}
          <div className="lg:col-span-2 space-y-4">
            {/* Rule Content */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Rule Content</p>
              <SyntaxHighlighter
                code={rule.content}
                language={rule.language}
                height="400px"
                copyable={true}
                readOnly={true}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {isOwner && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex-1"
                  >
                    <FileText size={16} />
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex-1"
                  >
                    <Share size={16} />
                    Share
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    <Trash2 size={16} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </>
              )}
            </div>

            {/* Version History Link */}
            <Link
              href={`/labs/rules/${rule.id}/versions`}
              className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-white transition"
            >
              <FileText size={14} />
              View {rule.currentVersion > 1 ? `All ${rule.currentVersion}` : ''} Versions →
            </Link>
          </div>

          {/* Right: Meta */}
          <div className="lg:col-span-1">
            {/* Quick Actions */}
            <div className="space-y-2">
              <p className="text-xs text-ink-3 mb-3 uppercase tracking-widest">Quick Actions</p>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/labs/rules/${rule.id}`);
                }}
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RuleEditorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        submissionId={rule.id}
        initialRule={{
          name: rule.name,
          description: rule.description,
          language: rule.language,
          content: rule.content,
        }}
        onSuccess={(data) => {
          setRule({
            ...rule,
            currentVersion: data.version,
            f1Score: data.f1Score,
          });
          setIsEditModalOpen(false);
        }}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        submissionId={rule.id}
        currentVisibility={currentVisibility}
        onSuccess={(visibility) => {
          setCurrentVisibility(visibility);
          setRule({ ...rule, visibility });
        }}
      />
    </main>
  );
}
