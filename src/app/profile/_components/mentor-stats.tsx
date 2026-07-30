import Link from "next/link";
import { db } from "@/lib/db";
import { MessageSquare, Star, RotateCcw, Clock } from "lucide-react";

type MentorStatsProps = {
  userId: string;
};

export async function MentorStats({ userId }: MentorStatsProps) {
  // Get hint usage stats
  const usedHints = await db.usedHint.findMany({
    where: { userId },
    include: { hint: true },
  });

  const replayEligible = await db.mentorHintSequence.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
  });

  if (usedHints.length === 0 && replayEligible.length === 0) {
    return null;
  }

  // Calculate stats
  const totalHints = usedHints.length;
  const ratedHints = usedHints.filter((h) => h.qualityScore !== null);
  const avgScore =
    ratedHints.length > 0
      ? ratedHints.reduce((sum, h) => sum + (h.qualityScore || 0), 0) /
        ratedHints.length
      : 0;

  const replayLabsCount = new Set(
    replayEligible.map((seq) => seq.labId)
  ).size;

  // Estimate time saved (rough: 2 min per hint * avg attempts saved per hint)
  const timeSavedMinutes = Math.round(totalHints * 2);
  const timeSavedHours =
    timeSavedMinutes > 60 ? (timeSavedMinutes / 60).toFixed(1) : "0";

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-ink">AI Mentor Stats</h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Hints Requested */}
        <div className="border border-edge-strong rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare size={16} className="text-ink-3" />
            <span className="text-xs text-ink-3 font-medium">Hints Used</span>
          </div>
          <p className="text-2xl font-bold text-ink">{totalHints}</p>
          <p className="text-xs text-ink-3 mt-1">lifetime</p>
        </div>

        {/* Helpful Rating */}
        <div className="border border-edge-strong rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Star size={16} className="text-warn" />
            <span className="text-xs text-ink-3 font-medium">Rating</span>
          </div>
          <p className="text-2xl font-bold text-ink">
            {avgScore > 0 ? avgScore.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-ink-3 mt-1">
            {ratedHints.length > 0 ? `${ratedHints.length} rated` : "No ratings"}
          </p>
        </div>

        {/* Labs Re-learned */}
        <div className="border border-edge-strong rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <RotateCcw size={16} className="text-ok" />
            <span className="text-xs text-ink-3 font-medium">Replay Access</span>
          </div>
          <p className="text-2xl font-bold text-ink">{replayLabsCount}</p>
          <p className="text-xs text-ink-3 mt-1">labs eligible</p>
        </div>

        {/* Time Saved */}
        <div className="border border-edge-strong rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-info" />
            <span className="text-xs text-ink-3 font-medium">Time Saved</span>
          </div>
          <p className="text-2xl font-bold text-ink">
            {timeSavedHours}h
          </p>
          <p className="text-xs text-ink-3 mt-1">est. learning time</p>
        </div>
      </div>

      {/* Learn More Link */}
      {replayLabsCount > 0 && (
        <Link
          href="/labs/mentor/replay"
          className="block text-center text-xs text-ok hover:text-ok py-2 border-t border-edge-strong pt-4 transition-colors"
        >
          View replay-eligible labs
        </Link>
      )}
    </div>
  );
}
