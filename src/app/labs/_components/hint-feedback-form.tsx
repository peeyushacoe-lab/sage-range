"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type FeedbackFormProps = {
  usedHintId: string;
  onSuccess?: (newAvgScore: number, totalRatings: number) => void;
  onClose?: () => void;
};

export function HintFeedbackForm({
  usedHintId,
  onSuccess,
  onClose,
}: FeedbackFormProps) {
  const [score, setScore] = useState(5);
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const scoreEmoji = (s: number) => {
    if (s <= 2) return "😞";
    if (s <= 4) return "😐";
    if (s <= 7) return "😊";
    return "😍";
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (wasHelpful === null) {
      setError("Please select if this hint was helpful");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mentor/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usedHintId,
          score,
          wasHelpful,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Failed to submit feedback");
      }

      const data = (await res.json()) as {
        newAvgScore: number;
        totalRatings: number;
      };
      setSubmitted(true);
      onSuccess?.(data.newAvgScore, data.totalRatings);

      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-ok font-medium">
          Thanks for the feedback!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Score Slider */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-ink">
            How helpful was this hint?
          </label>
          <span className="text-2xl">{scoreEmoji(score)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          value={score}
          onChange={(e) => setScore(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-ink-3 mt-1">
          <span>Not helpful</span>
          <span>Very helpful</span>
        </div>
      </div>

      {/* Helpful Toggle */}
      <div>
        <p className="text-sm font-medium text-ink mb-2">
          Was this helpful?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWasHelpful(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              wasHelpful === true
                ? "bg-ok-wash border border-ok-edge text-ok"
                : "bg-surface-1 border border-edge-strong text-ink-2 hover:border-edge-strong"
            }`}
          >
            <ThumbsUp size={16} />
            <span className="text-sm">Helpful</span>
          </button>
          <button
            type="button"
            onClick={() => setWasHelpful(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              wasHelpful === false
                ? "bg-danger-wash border border-danger-edge text-danger"
                : "bg-surface-1 border border-edge-strong text-ink-2 hover:border-edge-strong"
            }`}
          >
            <ThumbsDown size={16} />
            <span className="text-sm">Not helpful</span>
          </button>
        </div>
      </div>

      {/* Optional Feedback */}
      <div>
        <label className="text-sm font-medium text-ink block mb-2">
          Additional feedback (optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) =>
            setFeedback(e.target.value.slice(0, 200))
          }
          placeholder="Tell us what could be improved..."
          maxLength={200}
          className="w-full px-3 py-2 bg-surface-1 border border-edge-strong rounded text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge resize-none"
          rows={3}
        />
        <p className="text-xs text-ink-3 mt-1">
          {feedback.length}/200 characters
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || wasHelpful === null}
        className="w-full px-4 py-2 bg-accent-fill text-white text-sm font-medium rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Submitting..." : "Submit Feedback"}
      </button>
    </form>
  );
}
