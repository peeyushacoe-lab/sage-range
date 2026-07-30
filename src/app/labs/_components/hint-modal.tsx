"use client";

import { useState, useEffect } from "react";
import { X, Star } from "lucide-react";
import { HintFeedbackForm } from "./hint-feedback-form";

type HintModalProps = {
  hintId: string;
  hintText: string;
  labId: string;
  stage: string;
  quality?: {
    avgScore: number;
    helpfulCount: number;
    submissionRate: number;
  };
  onClose: () => void;
};

export function HintModal({
  hintId,
  hintText,
  labId,
  stage,
  quality,
  onClose,
}: HintModalProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [usedHintId, setUsedHintId] = useState<string | null>(null);
  const [avgScore, setAvgScore] = useState(quality?.avgScore ?? 5.0);
  const [totalRatings, setTotalRatings] = useState(0);

  // Fetch the UsedHint ID for feedback submission
  useEffect(() => {
    async function fetchUsedHintId() {
      try {
        const res = await fetch("/api/mentor/hints/" + labId);
        if (res.ok) {
          const data = (await res.json()) as {
            hints: Array<{ id: string; usedHintId?: string }>;
          };
          const foundHint = data.hints.find((h) => h.id === hintId);
          if (foundHint?.usedHintId) {
            setUsedHintId(foundHint.usedHintId);
          }
        }
      } catch (err) {
        console.error("Failed to fetch used hint ID:", err);
      }
    }
    void fetchUsedHintId();
  }, [hintId, labId]);

  const stars = Math.round(avgScore / 2); // Convert 0-10 to 0-5 stars

  function copyHint() {
    navigator.clipboard.writeText(hintText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  }

  function handleFeedbackSuccess(
    newAvgScore: number,
    newTotalRatings: number
  ) {
    setAvgScore(newAvgScore);
    setTotalRatings(newTotalRatings);
    setShowFeedback(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-surface-1 border border-edge-strong rounded-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-edge-strong">
          <h3 className="text-lg font-semibold text-ink">Hint</h3>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Hint Text */}
          <div>
            <p className="text-sm text-ink-2 leading-relaxed">
              {hintText}
            </p>
            <button
              onClick={copyHint}
              className="mt-4 text-xs px-3 py-1.5 rounded bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink transition-colors border border-edge-strong"
            >
              {copiedText ? "Copied!" : "Copy hint"}
            </button>
          </div>

          {/* Quality Stats */}
          {quality || avgScore > 0 ? (
            <div className="space-y-3">
              {/* Star Rating */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={
                        i < stars
                          ? "fill-warn text-warn"
                          : "text-ink-3"
                      }
                    />
                  ))}
                </div>
                <span className="text-sm text-ink-2">
                  {avgScore.toFixed(1)}/10 ({totalRatings}{" "}
                  {totalRatings === 1 ? "rating" : "ratings"})
                </span>
              </div>

              {/* Helpful Count */}
              {quality?.helpfulCount ? (
                <p className="text-sm text-ink-2">
                  Rated helpful by {quality.helpfulCount} user
                  {quality.helpfulCount !== 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Feedback Form */}
          {!showFeedback && usedHintId ? (
            <button
              onClick={() => setShowFeedback(true)}
              className="w-full px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink text-sm font-medium rounded transition-colors border border-edge-strong"
            >
              Rate this hint
            </button>
          ) : showFeedback && usedHintId ? (
            <div className="border-t border-edge-strong pt-6">
              <HintFeedbackForm
                usedHintId={usedHintId}
                onSuccess={handleFeedbackSuccess}
                onClose={() => {
                  setShowFeedback(false);
                  setTimeout(onClose, 200);
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
