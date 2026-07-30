'use client';

import { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Visibility = 'PRIVATE' | 'COMMUNITY' | 'RECRUITER_ONLY';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissionId: string;
  currentVisibility: Visibility;
  onSuccess?: (visibility: Visibility) => void;
}

const VISIBILITY_CONFIG: Record<Visibility, {
  label: string;
  description: string;
  icon: React.ReactNode;
}> = {
  PRIVATE: {
    label: 'Private',
    description: 'Only visible to you. You can still share a link directly.',
    icon: '🔒',
  },
  COMMUNITY: {
    label: 'Community',
    description: 'Visible to everyone. Discoverable in the community rules browser.',
    icon: '🌐',
  },
  RECRUITER_ONLY: {
    label: 'Recruiter Only',
    description: 'Visible only to recruiters on the platform.',
    icon: '💼',
  },
};

export function ShareModal({
  isOpen,
  onClose,
  submissionId,
  currentVisibility,
  onSuccess,
}: ShareModalProps) {
  const [visibility, setVisibility] = useState<Visibility>(currentVisibility);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setVisibility(currentVisibility);
  }, [currentVisibility]);

  const handleChange = async () => {
    if (visibility === currentVisibility) {
      onClose();
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/rules/${submissionId}/share`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update visibility');
      }

      setMessage({
        type: 'success',
        text: `Rule is now ${VISIBILITY_CONFIG[visibility].label}`,
      });

      onSuccess?.(visibility);

      setTimeout(() => {
        onClose();
      }, 1500);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Share Rule</h2>
            <p className="text-xs text-zinc-500 mt-1">Control who can see this rule</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-3">
            {(Object.entries(VISIBILITY_CONFIG) as Array<[Visibility, typeof VISIBILITY_CONFIG[Visibility]]>).map(
              ([key, config]) => (
                <label
                  key={key}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all',
                    visibility === key
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
                  )}
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={key}
                    checked={visibility === key}
                    onChange={(e) => setVisibility(e.target.value as Visibility)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{config.label}</p>
                    <p className="text-xs text-zinc-400 mt-1">{config.description}</p>
                  </div>
                </label>
              )
            )}
          </div>

          {/* Message Display */}
          {message && (
            <div
              className={cn(
                'mt-4 rounded-lg p-3 flex gap-2',
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
        <div className="border-t border-white/10 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleChange}
            disabled={isLoading || visibility === currentVisibility}
          >
            {isLoading ? 'Updating...' : 'Apply Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
