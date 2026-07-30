"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
type ReviewStatus = "APPROVED" | "REJECTED" | "CHANGES_REQUESTED";

interface RubricCriterion {
  id: string;
  label: string;
  maxScore: number;
}

interface Props {
  submissionId: string;
  existingReview: {
    status: string;
    grade: string | null;
    comment: string | null;
    rubricScores: { criterionId: string; score: number }[];
  } | null;
  rubricCriteria: RubricCriterion[];
}

const STATUS_OPTIONS: { value: ReviewStatus; label: string; color: string }[] = [
  { value: "APPROVED", label: "Approve", color: "border-ok-edge bg-ok-wash text-ok" },
  { value: "CHANGES_REQUESTED", label: "Request Changes", color: "border-sev-high-edge bg-sev-high-wash text-sev-high" },
  { value: "REJECTED", label: "Reject", color: "border-danger-edge bg-danger-wash text-danger" },
];

const GRADE_OPTIONS = ["A", "B", "C", "D", "F"];

export function ReviewForm({ submissionId, existingReview, rubricCriteria }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus>((existingReview?.status as ReviewStatus) ?? "APPROVED");
  const [grade, setGrade] = useState(existingReview?.grade ?? "");
  const [comment, setComment] = useState(existingReview?.comment ?? "");

  // Build initial rubric scores map
  const initialScores: Record<string, number> = {};
  for (const s of existingReview?.rubricScores ?? []) {
    initialScores[s.criterionId] = s.score;
  }
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(initialScores);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setScore = (criterionId: string, score: number) => {
    setRubricScores((prev) => ({ ...prev, [criterionId]: score }));
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const scores = rubricCriteria.map((c) => ({
        criterionId: c.id,
        score: rubricScores[c.id] ?? 0,
      }));

      const res = await fetch(`/api/mentor/${submissionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          grade: grade || null,
          comment: comment.trim() || null,
          rubricScores: scores.length > 0 ? scores : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to submit review");
        return;
      }
      setDone(true);
      router.push("/mentor");
    } catch {
      setError("Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-ok-edge bg-ok-wash p-5 text-center">
        <p className="text-ok font-semibold">Review submitted <Icon name="check" size={14} className="inline-block shrink-0" /></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Decision</p>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                status === opt.value ? opt.color : "border-edge text-ink-3 hover:text-ink-2"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rubric scoring — only shown if rubric has criteria */}
      {rubricCriteria.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Rubric Scoring</p>
          <div className="rounded-xl border border-edge overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-edge bg-white/2">
                  <th className="text-left px-4 py-2 text-xs text-ink-3 uppercase tracking-wider">Criterion</th>
                  <th className="text-center px-4 py-2 text-xs text-ink-3 uppercase tracking-wider w-48">Score</th>
                  <th className="text-right px-4 py-2 text-xs text-ink-3 uppercase tracking-wider w-20">Max</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-subtle">
                {rubricCriteria.map((c) => {
                  const score = rubricScores[c.id] ?? 0;
                  const pct = c.maxScore > 0 ? score / c.maxScore : 0;
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3 text-ink">{c.label}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={0}
                            max={c.maxScore}
                            value={score}
                            onChange={(e) => setScore(c.id, parseInt(e.target.value))}
                            className="flex-1 accent-sage-500"
                          />
                          <span
                            className={`text-sm font-semibold w-8 text-right ${
                              pct >= 0.8 ? "text-ok" : pct >= 0.5 ? "text-warn" : "text-danger"
                            }`}
                          >
                            {score}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-ink-3">{c.maxScore}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">Grade (optional)</p>
        <div className="flex gap-2">
          {GRADE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setGrade(grade === g ? "" : g)}
              className={`w-10 h-10 rounded-lg border text-sm font-bold transition ${
                grade === g
                  ? "border-ok-edge bg-ok-wash text-ok"
                  : "border-edge text-ink-3 hover:text-ink-2"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">Comment</p>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={6}
          placeholder="Provide feedback to the student..."
          className="w-full rounded-lg border border-edge bg-surface-2 px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:outline-none focus:border-ok-edge resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-danger rounded-lg border border-danger-edge bg-danger-wash px-4 py-3">{error}</p>
      )}

      <button
        onClick={submit}
        disabled={loading}
        className="w-full rounded-lg bg-ok px-4 py-3 text-sm font-semibold text-surface-0 hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {loading ? "Submitting…" : existingReview ? "Update Review" : "Submit Review"}
      </button>
    </div>
  );
}
