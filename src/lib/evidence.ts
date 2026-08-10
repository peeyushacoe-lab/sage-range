/**
 * Writing and reading the Evidence spine.
 *
 * The scoring lives in src/lib/skill-engine.ts as pure functions; this is the
 * thin database layer over it — the one place an activity records that it
 * happened, and the one place a page loads a learner's evidence to derive their
 * profile.
 *
 * Activities call recordEvidence in addition to their existing writes, not
 * instead of them. Nothing here touches User.skillScore: the activity keeps its
 * own award for now, and this table exists alongside it so the derived profile
 * can be validated against the live numbers before anything is switched over.
 */

import { db } from "@/lib/db";
import { LAB_TECHNIQUES } from "@/lib/insights/mitre";
import {
  overallSkillPoints,
  skillMatrix,
  coverage,
  accuracy,
  activityMix,
  weakestTactics,
  recommendActivities,
  type EvidenceActivity,
  type EvidenceResult,
  type EvidenceRecord,
  type ActivityRef,
  type Recommendation,
} from "@/lib/skill-engine";

export type RecordEvidenceInput = {
  userId: string;
  activity: EvidenceActivity;
  /** The source progress row's id — the upsert key, so re-grading updates one row. */
  sourceId: string;
  result: EvidenceResult;
  skillPoints: number;
  slug?: string;
  title?: string;
  difficulty?: string | null;
  score?: number | null;
  maxScore?: number | null;
  attempts?: number | null;
  hintsUsed?: number | null;
  timeSec?: number | null;
  tactics?: string[];
  techniques?: string[];
};

/**
 * Record one graded activity as evidence.
 *
 * Idempotent on (userId, activity, sourceId): calling it twice for the same
 * activity instance updates the single row rather than double-counting, which
 * matters because several activities can re-grade or re-submit.
 */
export async function recordEvidence(input: RecordEvidenceInput): Promise<void> {
  const data = {
    result: input.result,
    skillPoints: Math.max(0, Math.round(input.skillPoints)),
    slug: input.slug ?? null,
    title: input.title ?? null,
    difficulty: input.difficulty ?? null,
    score: input.score ?? null,
    maxScore: input.maxScore ?? null,
    attempts: input.attempts ?? null,
    hintsUsed: input.hintsUsed ?? null,
    timeSec: input.timeSec ?? null,
    tactics: input.tactics ?? [],
    techniques: input.techniques ?? [],
  };

  await db.evidence.upsert({
    where: {
      userId_activity_sourceId: {
        userId: input.userId,
        activity: input.activity,
        sourceId: input.sourceId,
      },
    },
    create: { userId: input.userId, activity: input.activity, sourceId: input.sourceId, ...data },
    update: data,
  });
}

/**
 * MITRE tactics and techniques a lab demonstrates, from the authored map.
 *
 * The map keys techniques by tactic *name*, which is exactly the axis the skill
 * engine ranges over, so no translation is needed. A lab absent from the map
 * contributes to the overall score but raises no tactic — the honest result
 * until it is tagged.
 */
export function labTacticsAndTechniques(slug: string): { tactics: string[]; techniques: string[] } {
  const techs = LAB_TECHNIQUES[slug] ?? [];
  const tactics = [...new Set(techs.map((t) => t.tactic))];
  const techniques = [...new Set(techs.map((t) => t.id))];
  return { tactics, techniques };
}

// ── Reading ─────────────────────────────────────────────────────────────────

/** A learner's full evidence set, oldest first. */
export async function loadEvidence(userId: string): Promise<EvidenceRecord[]> {
  const rows = await db.evidence.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      activity: true, result: true, skillPoints: true, difficulty: true,
      attempts: true, hintsUsed: true, timeSec: true, tactics: true, techniques: true,
    },
  });
  return rows as EvidenceRecord[];
}

export type SkillProfile = {
  overall: number;
  matrix: ReturnType<typeof skillMatrix>;
  coverage: ReturnType<typeof coverage>;
  accuracy: ReturnType<typeof accuracy>;
  mix: ReturnType<typeof activityMix>;
  weakest: ReturnType<typeof weakestTactics>;
  recommendations: Recommendation[];
};

/**
 * The activity catalogue for recommendations: every published, tagged lab a
 * learner could be pointed at, with the tactics it trains.
 *
 * Built from the labs that carry a MITRE mapping — the same tags the matrix is
 * scored from — so a recommendation can only ever name an activity that
 * genuinely trains the gap. Untagged labs are invisible here, which is honest:
 * we cannot claim a lab trains a tactic we never mapped it to. Detection,
 * incident and other activities join this catalogue as they gain tag maps.
 */
async function activityCatalogue(): Promise<ActivityRef[]> {
  const taggedSlugs = Object.keys(LAB_TECHNIQUES);
  if (taggedSlugs.length === 0) return [];

  const labs = await db.lab.findMany({
    where: { slug: { in: taggedSlugs }, published: true },
    select: { slug: true, title: true, difficulty: true },
  });

  return labs.map((lab) => ({
    slug: lab.slug,
    title: lab.title,
    href: `/labs/${lab.slug}`,
    activity: "LAB" as const,
    difficulty: lab.difficulty,
    tactics: [...new Set((LAB_TECHNIQUES[lab.slug] ?? []).map((t) => t.tactic))],
  }));
}

/**
 * The whole derived profile for one learner, from the single source.
 *
 * Every field comes from the same evidence, so the overall score, the matrix,
 * the coverage figure, the weakest tactics and the recommended next activities
 * cannot disagree — which is the property the three separate skill views did
 * not have. The recommendations close the loop: gaps in the matrix decide what
 * is suggested, and completing a suggestion feeds the matrix again.
 */
export async function getSkillProfile(userId: string): Promise<SkillProfile> {
  const records = await loadEvidence(userId);

  // The five worst gaps are what the learner is shown; recommendations draw
  // from every sub-mastery gap, so a strong learner with a few weak-but-present
  // tactics still gets pointed somewhere useful rather than nowhere.
  const weakest = weakestTactics(records, { limit: 5 });
  const allGaps = weakestTactics(records, { limit: 14 });

  const [catalogue, solved] = await Promise.all([
    activityCatalogue(),
    db.attempt.findMany({
      where: { userId, status: "SOLVED" },
      select: { lab: { select: { slug: true } } },
    }),
  ]);
  const completedSlugs = new Set(solved.map((s) => s.lab.slug));

  return {
    overall: overallSkillPoints(records),
    matrix: skillMatrix(records),
    coverage: coverage(records),
    accuracy: accuracy(records),
    mix: activityMix(records),
    weakest,
    recommendations: recommendActivities(allGaps, catalogue, completedSlugs, { limit: 5 }),
  };
}
