'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

type TriageAction = 'CLOSED' | 'ESCALATED' | 'RESOLVED' | 'IGNORED' | 'MONITOR';

interface TriageFormProps {
  ticketId: string;
  shiftId: string;
  onSuccess?: (score: number) => void;
  onSubmit?: () => void;
}

const ACTIONS: { value: TriageAction; label: string; description: string }[] = [
  { value: 'CLOSED', label: 'Close', description: 'Resolved or false positive' },
  { value: 'ESCALATED', label: 'Escalate', description: 'Needs senior analyst review' },
  { value: 'RESOLVED', label: 'Resolved', description: 'Issue mitigated' },
  { value: 'IGNORED', label: 'Ignore', description: 'Not actionable' },
  { value: 'MONITOR', label: 'Monitor', description: 'Watch for patterns' },
];

export function TriageForm({ ticketId, shiftId, onSuccess, onSubmit }: TriageFormProps) {
  const [action, setAction] = useState<TriageAction | null>(null);
  const [confidence, setConfidence] = useState(50);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const confidenceColor =
    confidence >= 70
      ? 'text-emerald-400'
      : confidence >= 50
        ? 'text-amber-400'
        : 'text-red-400';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!action) {
      setToast({ type: 'error', message: 'Please select an action' });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/tickets/queue/${shiftId}/${ticketId}/triage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            confidence,
            notes: notes.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        setToast({ type: 'error', message: error.message || 'Failed to submit triage' });
        return;
      }

      const { provisionalScore } = await response.json();
      setToast({ type: 'success', message: `Triage submitted! Score: +${provisionalScore}` });

      // Reset form
      setAction(null);
      setConfidence(50);
      setNotes('');

      if (onSuccess) onSuccess(provisionalScore);
      if (onSubmit) onSubmit();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setToast({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Triage Decision</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Selector */}
          <div>
            <label className="text-xs uppercase tracking-widest text-zinc-400 block mb-3">
              Action
            </label>
            <div className="space-y-2">
              {ACTIONS.map(({ value, label, description }) => (
                <label
                  key={value}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                  style={{
                    borderColor: action === value ? 'rgba(167, 139, 250, 0.5)' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: action === value ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="action"
                    value={value}
                    checked={action === value}
                    onChange={(e) => setAction(e.target.value as TriageAction)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-zinc-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Confidence Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs uppercase tracking-widest text-zinc-400">
                Confidence
              </label>
              <span className={cn('text-sm font-bold font-mono', confidenceColor)}>
                {confidence}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="w-full h-2 rounded-lg bg-zinc-800 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right,
                  rgb(239, 68, 68) 0%,
                  rgb(251, 146, 60) 33%,
                  rgb(250, 204, 21) 50%,
                  rgb(34, 197, 94) 100%)`
              }}
            />
            <p className="text-xs text-zinc-500 mt-2">
              {confidence < 50
                ? 'Low confidence'
                : confidence < 70
                  ? 'Moderate confidence'
                  : 'High confidence'}
            </p>
          </div>

          {/* Notes Textarea */}
          <div>
            <label htmlFor="notes" className="text-xs uppercase tracking-widest text-zinc-400 block mb-2">
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Add notes about your decision..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white/30"
              rows={3}
            />
            <p className="text-xs text-zinc-600 mt-1">
              {notes.length} / 500
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!action || isSubmitting}
            className={cn(
              'w-full py-2.5 px-4 rounded-lg font-semibold text-sm transition',
              action && !isSubmitting
                ? 'bg-sage-500 text-black hover:bg-sage-600'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Icon name="loader" size={14} className="animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Triage'
            )}
          </button>

          {/* Toast */}
          {toast && (
            <div className={cn(
              'p-3 rounded-lg text-sm font-medium',
              toast.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-red-500/20 text-red-400'
            )}>
              {toast.message}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
