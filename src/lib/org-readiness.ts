import { db } from "@/lib/db";
import { TACTICS, skillMatrix, type Tactic, type EvidenceRecord } from "@/lib/skill-engine";

export type OrgTacticReadiness = {
  tactic: Tactic;
  avgScore: number;
  /** Members with at least one piece of evidence under this tactic. */
  membersCovering: number;
};

export type OrgReadiness = {
  /** 0–100: the average of every tactic's average score across the team. */
  readinessScore: number;
  matrix: OrgTacticReadiness[];
  weakestTactics: OrgTacticReadiness[];
  memberCount: number;
  /** Members with any graded evidence at all — the rest pull the average down honestly. */
  activeMemberCount: number;
};

/**
 * Team-level readiness, aggregated from the same Evidence spine each
 * member's own /skills profile derives from — an org lead sees the same
 * arithmetic each learner sees, just averaged across the roster instead of
 * computed for one person.
 *
 * A member with zero evidence contributes a 0 to every tactic rather than
 * being excluded — an untrained analyst is a real gap in team readiness,
 * not a missing data point to quietly drop.
 */
export async function getOrganizationReadiness(userIds: string[]): Promise<OrgReadiness> {
  if (userIds.length === 0) {
    return { readinessScore: 0, matrix: [], weakestTactics: [], memberCount: 0, activeMemberCount: 0 };
  }

  const rows = await db.evidence.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true, activity: true, result: true, skillPoints: true,
      difficulty: true, attempts: true, hintsUsed: true, timeSec: true,
      tactics: true, techniques: true,
    },
  });

  const byUser = new Map<string, EvidenceRecord[]>();
  for (const uid of userIds) byUser.set(uid, []);
  for (const r of rows) byUser.get(r.userId)?.push(r as EvidenceRecord);

  const activeMemberCount = userIds.filter((uid) => (byUser.get(uid)?.length ?? 0) > 0).length;
  const perMemberMatrices = userIds.map((uid) => skillMatrix(byUser.get(uid) ?? []));

  const matrix: OrgTacticReadiness[] = TACTICS.map((tactic) => {
    const scores = perMemberMatrices.map((m) => m.find((t) => t.tactic === tactic)?.score ?? 0);
    const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const membersCovering = perMemberMatrices.filter(
      (m) => (m.find((t) => t.tactic === tactic)?.activities ?? 0) > 0
    ).length;
    return { tactic, avgScore, membersCovering };
  });

  const readinessScore = Math.round(matrix.reduce((s, m) => s + m.avgScore, 0) / matrix.length);
  const weakestTactics = [...matrix].sort((a, b) => a.avgScore - b.avgScore).slice(0, 5);

  return { readinessScore, matrix, weakestTactics, memberCount: userIds.length, activeMemberCount };
}
