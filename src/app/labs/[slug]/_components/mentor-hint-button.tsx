"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Loader2 } from "lucide-react";
import { HintModal } from "../../_components/hint-modal";

type MentorHintButtonProps = {
  labId: string;
  stage: string;
  difficulty: "EASY" | "MEDIUM" | "HARD" | "INSANE";
  attemptCount?: number;
};

type HintResponse = {
  text: string;
  hintId: string;
  quality?: {
    avgScore: number;
    helpfulCount: number;
    submissionRate: number;
  };
  nextHintEligibleAt: string;
};

type ErrorResponse = {
  error: string;
  nextHintEligibleAt?: string;
};

export function MentorHintButton({
  labId,
  stage,
  difficulty,
  attemptCount,
}: MentorHintButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState<HintResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rateLimitTime, setRateLimitTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState("");

  // Update countdown timer
  useEffect(() => {
    if (!rateLimitTime) {
      setCountdown("");
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = rateLimitTime.getTime() - now.getTime();

      if (diff <= 0) {
        setRateLimitTime(null);
        setCountdown("");
        clearInterval(interval);
      } else {
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdown(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [rateLimitTime]);

  async function requestHint() {
    setLoading(true);
    setError("");
    setHint(null);

    try {
      const res = await fetch("/api/mentor/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          labId,
          stage,
          difficulty,
          attemptCount,
        }),
      });

      const data = (await res.json()) as HintResponse | ErrorResponse;

      if (!res.ok) {
        const errData = data as ErrorResponse;
        if (res.status === 429 && errData.nextHintEligibleAt) {
          setRateLimitTime(new Date(errData.nextHintEligibleAt));
          setError(
            `Next hint available in ${countdown || "calculating..."}`
          );
        } else if (errData.error === "no_hints_available") {
          setError("No hints available for this stage");
        } else if (errData.error === "unauthenticated") {
          setError("Please sign in to request hints");
        } else {
          setError(errData.error || "Failed to get hint");
        }
      } else {
        const hintData = data as HintResponse;
        // Set nextHintEligibleAt for countdown on rate limit
        if (hintData.nextHintEligibleAt) {
          setRateLimitTime(new Date(hintData.nextHintEligibleAt));
        }
        setHint(hintData);
        setShowModal(true);
      }
    } catch (err) {
      setError("Failed to request hint");
      console.error("[Mentor Hint]", err);
    } finally {
      setLoading(false);
    }
  }

  const isRateLimited = rateLimitTime !== null;
  const buttonLabel = isRateLimited
    ? `Next hint in ${countdown}`
    : loading
      ? "Requesting..."
      : "Get Hint";

  return (
    <>
      <div className="mt-4 border-t border-white/5 pt-3">
        <button
          onClick={requestHint}
          disabled={loading || isRateLimited}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded transition-colors ${
            isRateLimited
              ? "bg-zinc-900 text-zinc-600 cursor-not-allowed"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
          }`}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <MessageSquare size={14} />
          )}
          {buttonLabel}
        </button>

        {error && (
          <p className="text-xs text-red-400 mt-2 font-mono">{error}</p>
        )}
      </div>

      {showModal && hint && (
        <HintModal
          hintId={hint.hintId}
          hintText={hint.text}
          quality={hint.quality}
          labId={labId}
          stage={stage}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
