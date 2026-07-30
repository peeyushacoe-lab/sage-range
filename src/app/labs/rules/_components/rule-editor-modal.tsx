'use client';

import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RuleLanguage = 'SIGMA' | 'KQL' | 'SPLUNK' | 'ELASTIC' | 'YARA';

interface RuleEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId?: string;
  initialRule?: {
    name: string;
    description: string;
    language: RuleLanguage;
    content: string;
  };
  onSuccess?: (data: { version: number; f1Score: number }) => void;
}

interface ValidationError {
  line?: number;
  column?: number;
  message: string;
}

export function RuleEditorModal({
  isOpen,
  onClose,
  submissionId,
  initialRule,
  onSuccess,
}: RuleEditorModalProps) {
  const [name, setName] = useState(initialRule?.name ?? '');
  const [description, setDescription] = useState(initialRule?.description ?? '');
  const [language, setLanguage] = useState<RuleLanguage>(initialRule?.language ?? 'SIGMA');
  const [content, setContent] = useState(initialRule?.content ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!name.trim()) {
      errors.push('Rule name is required');
    } else if (name.length > 100) {
      errors.push('Rule name must be 100 characters or less');
    }

    if (description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    if (!content.trim()) {
      errors.push('Rule content is required');
    }

    if (errors.length > 0) {
      setMessage({ type: 'error', text: errors[0] });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setMessage(null);
    setValidationErrors([]);

    try {
      const response = await fetch('/api/rules/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          name: name.trim(),
          description: description.trim(),
          language,
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();

        if (data.validationErrors) {
          setValidationErrors(data.validationErrors);
        }

        throw new Error(data.error || 'Failed to save rule');
      }

      const result = await response.json();

      setMessage({
        type: 'success',
        text: submissionId
          ? `Rule updated (v${result.version}) - F1 score: ${result.f1Score.toFixed(2)}`
          : `Rule created - F1 score: ${result.f1Score.toFixed(2)}`,
      });

      onSuccess?.(result);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 overflow-y-auto">
      <div className="w-full max-w-4xl my-8 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 border-b border-white/10 bg-zinc-900 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {submissionId ? 'Edit Rule' : 'Create Rule'}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {submissionId ? 'Update your detection rule' : 'Create a new detection rule'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[calc(90vh-200px)] overflow-y-auto">
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

          {/* Language Selector */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              Language <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {(['SIGMA', 'KQL', 'SPLUNK', 'ELASTIC', 'YARA'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-mono font-medium transition-all',
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

          {/* Rule Content */}
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

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              {validationErrors.map((error, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 flex gap-3"
                >
                  <AlertCircle size={16} className="text-red-400 flex-none mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-red-400">
                      {error.line ? `Line ${error.line}` : 'Validation Error'}
                    </p>
                    <p className="text-xs text-red-300 mt-1">{error.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message Display */}
          {message && (
            <div
              className={cn(
                'rounded-lg p-3 flex gap-2',
                message.type === 'success'
                  ? 'border border-emerald-500/30 bg-emerald-500/10'
                  : 'border border-red-500/30 bg-red-500/10'
              )}
            >
              {message.type === 'success' ? (
                <Check size={16} className="text-emerald-400 flex-none mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-red-400 flex-none mt-0.5" />
              )}
              <p
                className={cn(
                  'text-xs',
                  message.type === 'success' ? 'text-emerald-300' : 'text-red-300'
                )}
              >
                {message.text}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-white/10 bg-zinc-900 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Save size={16} />
            {isLoading ? 'Saving...' : 'Save Rule'}
          </Button>
        </div>
      </div>
    </div>
  );
}
