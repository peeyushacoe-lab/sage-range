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
    <main className="min-h-screen bg-surface-0 text-white">

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
                  className="inline-flex items-center gap-2 rounded-lg border border-ok-edge bg-ok-wash px-4 py-2 text-sm font-semibold text-ok hover:bg-ok-wash transition"
                >
                  <Eye size={16} />
                  View Submitted Rule
                </Link>
              )}
              <Link
                href="/labs/rules/community"
                className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-white hover:border-edge-strong transition"
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
                        ? 'border-ok-edge bg-ok-wash text-ok'
                        : 'border-edge bg-surface-2 text-ink-2 hover:bg-surface-2 hover:border-edge-strong'
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
                Rule Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Suspicious PowerShell Usage"
                maxLength={100}
                className="w-full rounded-lg border border-edge bg-surface-0 px-3 py-2 text-sm text-white placeholder-ink-3 focus:border-ok-edge focus:outline-none focus:ring-1 focus:ring-ok"
              />
              <p className="text-xs text-ink-3 mt-1">
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
                className="w-full h-20 rounded-lg border border-edge bg-surface-0 px-3 py-2 text-sm text-white placeholder-ink-3 focus:border-ok-edge focus:outline-none focus:ring-1 focus:ring-ok resize-none"
              />
              <p className="text-xs text-ink-3 mt-1">
                {description.length} / 500 characters
              </p>
            </div>

            {/* Rule Content Editor */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Rule Content <span className="text-danger">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Paste your ${language} rule here...`}
                className="w-full h-64 rounded-lg border border-edge bg-surface-0 px-3 py-2 text-xs font-mono text-white placeholder-ink-3 focus:border-ok-edge focus:outline-none focus:ring-1 focus:ring-ok resize-none"
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
              <div className="rounded-lg border border-ok-edge bg-ok-wash p-4">
                <p className="text-xs text-ink-3 mb-2">Last F1 Score</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-ok">
                    {f1Score.toFixed(2)}
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ok transition-all"
                        style={{ width: `${f1Score * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-ink-3 mt-1">
                      {f1Score >= 0.8 ? 'Excellent' : f1Score >= 0.6 ? 'Good' : 'Needs improvement'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Status */}
            <div className="rounded-lg border border-edge bg-surface-1 p-4">
              <p className="text-sm font-semibold text-white mb-3">Validation Status</p>
              {validationErrors.length === 0 && name && content ? (
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="text-ok flex-none mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-ok">Valid</p>
                    <p className="text-xs text-ink-3 mt-1">Your rule syntax is valid</p>
                  </div>
                </div>
              ) : validationErrors.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={20} className="text-danger flex-none mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-danger">
                        {validationErrors.length} error{validationErrors.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {validationErrors.map((error, i) => (
                      <div key={i} className="ml-7 text-xs text-ink-2">
                        {error.line && <span className="text-danger">Line {error.line}: </span>}
                        {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-ink-3">
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
                className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-white transition"
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
