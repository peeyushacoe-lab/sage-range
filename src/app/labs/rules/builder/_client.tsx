'use client';

import { useState } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Code, Share, Eye, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { SyntaxHighlighter } from '../_components/syntax-highlighter';
import { RuleEditorModal } from '../_components/rule-editor-modal';
import { TestRuleModal } from '../_components/test-rule-modal';
import { cn } from '@/lib/utils';

type RuleLanguage = 'SIGMA' | 'KQL' | 'SPLUNK' | 'ELASTIC' | 'YARA';

interface ValidationError {
  line?: number;
  message: string;
}

export function RuleBuilderClient() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<RuleLanguage>('SIGMA');
  const [content, setContent] = useState('');
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [submittedRuleId, setSubmittedRuleId] = useState<string | null>(null);
  const [f1Score, setF1Score] = useState<number | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const handleSaveRule = async (data: { version: number; f1Score: number }) => {
    setF1Score(data.f1Score);
    setSubmittedRuleId(`rule-${Date.now()}`); // In real implementation, this comes from API
    setName('');
    setDescription('');
    setContent('');
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">

      <div className="max-w-7xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-8"
          title="Detection Rule Builder"
          subtitle="Create and test detection rules in SIGMA, KQL, Splunk, Elastic, or YARA format"
          actions={
            <div className="flex gap-2">
              {submittedRuleId && (
                <Link
                  href={`/labs/rules/${submittedRuleId}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/20 transition"
                >
                  <Eye size={16} />
                  View Submitted Rule
                </Link>
              )}
              <Link
                href="/labs/rules/community"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
              >
                Community Rules →
              </Link>
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Editor */}
          <div className="space-y-4">
            {/* Language Selector */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Rule Language
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(['SIGMA', 'KQL', 'SPLUNK', 'ELASTIC', 'YARA'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-xs font-mono font-medium transition-all',
                      language === lang
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20'
                    )}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule Name */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Rule Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Suspicious PowerShell Usage"
                maxLength={100}
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              />
              <p className="text-xs text-zinc-600 mt-1">
                {name.length} / 100 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this rule detects..."
                maxLength={500}
                className="w-full h-20 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
              />
              <p className="text-xs text-zinc-600 mt-1">
                {description.length} / 500 characters
              </p>
            </div>

            {/* Rule Content Editor */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Rule Content <span className="text-red-400">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Paste your ${language} rule here...`}
                className="w-full h-64 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs font-mono text-white placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 resize-none"
              />
            </div>

            {/* Save Button */}
            <Button
              variant="primary"
              onClick={() => setIsEditorModalOpen(true)}
              className="w-full"
              disabled={!name.trim() || !content.trim()}
            >
              <FileText size={16} />
              Save Rule
            </Button>
          </div>

          {/* Right: Validation + Preview */}
          <div className="space-y-4">
            {/* F1 Score Display */}
            {f1Score !== null && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                <p className="text-xs text-zinc-500 mb-2">Last F1 Score</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-emerald-400">
                    {f1Score.toFixed(2)}
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all"
                        style={{ width: `${f1Score * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-zinc-600 mt-1">
                      {f1Score >= 0.8 ? 'Excellent' : f1Score >= 0.6 ? 'Good' : 'Needs improvement'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Status */}
            <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-4">
              <p className="text-sm font-semibold text-white mb-3">Validation Status</p>
              {validationErrors.length === 0 && name && content ? (
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-emerald-400 flex-none mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-emerald-400">Valid</p>
                    <p className="text-xs text-zinc-500 mt-1">Your rule syntax is valid</p>
                  </div>
                </div>
              ) : validationErrors.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 flex-none mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-400">
                        {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {validationErrors.map((error, i) => (
                      <div key={i} className="ml-7 text-xs text-zinc-400">
                        {error.line && <span className="text-red-400">Line {error.line}: </span>}
                        {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-500">
                  Fill in the rule name and content to validate
                </div>
              )}
            </div>

            {/* Test Rule Button */}
            {submittedRuleId && (
              <Button
                variant="secondary"
                onClick={() => setIsTestModalOpen(true)}
                className="w-full"
              >
                <Code size={16} />
                Test Rule
              </Button>
            )}

            {/* Rule Preview */}
            {content && (
              <div>
                <p className="text-sm font-semibold text-white mb-2">Preview</p>
                <SyntaxHighlighter
                  code={content}
                  language={language}
                  height="300px"
                  copyable={true}
                  readOnly={true}
                />
              </div>
            )}

            {/* Version History Link */}
            {submittedRuleId && (
              <Link
                href={`/labs/rules/${submittedRuleId}/versions`}
                className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition"
              >
                <Code size={14} />
                View Version History →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <RuleEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        initialRule={{ name, description, language, content }}
        onSuccess={handleSaveRule}
      />

      {submittedRuleId && (
        <TestRuleModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
          submissionId={submittedRuleId}
          ruleLanguage={language}
        />
      )}
    </main>
  );
}
