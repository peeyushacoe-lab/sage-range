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
        <p className="text-sm text-sage-400 font-medium">
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
          <label className="text-sm font-medium text-zinc-200">
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
          className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-zinc-500 mt-1">
          <span>Not helpful</span>
          <span>Very helpful</span>
        </div>
      </div>

      {/* Helpful Toggle */}
      <div>
        <p className="text-sm font-medium text-zinc-200 mb-2">
          Was this helpful?
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setWasHelpful(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
              wasHelpful === true
                ? "bg-sage-500/20 border border-sage-500/50 text-sage-300"
                : "bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-600"
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
                ? "bg-red-500/20 border border-red-500/50 text-red-300"
                : "bg-zinc-900 border border-zinc-700 text-zinc-400 hover:border-zinc-600"
            }`}
          >
            <ThumbsDown size={16} />
            <span className="text-sm">Not helpful</span>
          </button>
        </div>
      </div>

      {/* Optional Feedback */}
      <div>
        <label className="text-sm font-medium text-zinc-200 block mb-2">
          Additional feedback (optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) =>
            setFeedback(e.target.value.slice(0, 200))
          }
          placeholder="Tell us what could be improved..."
          maxLength={200}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-sage-500/50 resize-none"
          rows={3}
        />
        <p className="text-xs text-zinc-600 mt-1">
          {feedback.length}/200 characters
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || wasHelpful === null}
        className="w-full px-4 py-2 bg-sage-500 text-black text-sm font-medium rounded hover:bg-sage-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Submitting..." : "Submit Feedback"}
      </button>
    </form>
  );
}
