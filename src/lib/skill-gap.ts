/**
 * Skill gap scoring against a target role.
 *
 * Pure functions, no database imports. Readiness is shown to users as a
 * headline percentage and drives learning-path recommendations, so the
 * arithmetic is kept here behind tests rather than inlined in a query.
 */

/** How many solved items a role expects per MITRE tactic. */
export type TacticRequirement = Record<string, number>;

/** How many the user actually has per tactic. */
export type TacticCoverage = Record<string, number>;

export type TacticGap = {
  tactic: string;
  have: number;
  need: number;
  /** 0-1 proportion of the requirement met. */
  ratio: number;
};

export type GapAnalysis = {
  /** 0-100 overall readiness for the role. */
  readiness: number;
  /** Every required tactic with its have/need position. */
  coverage: TacticGap[];
  /** Tactics still short of the requirement, worst first. */
  gaps: TacticGap[];
  /** Tactics fully satisfied. */
  met: string[];
};

/**
 * Compare a user's tactic coverage against a role's requirements.
 *
 * Readiness is the mean of per-tactic completion capped at 1, so heavy
 * over-achievement in one tactic cannot mask a total gap in another — which
 * is the failure mode of a naive total-solved / total-required ratio.
 */
export function analyseSkillGap(
  required: TacticRequirement,
  actual: TacticCoverage,
): GapAnalysis {
  const tactics = Object.keys(required);

  if (tactics.length === 0) {
    return { readiness: 100, coverage: [], gaps: [], met: [] };
  }

  const coverage: TacticGap[] = tactics.map((tactic) => {
    const need = Math.max(0, required[tactic] ?? 0);
    const have = Math.max(0, actual[tactic] ?? 0);
    // A requirement of zero is trivially satisfied.
    const ratio = need === 0 ? 1 : Math.min(1, have / need);
    return { tactic, have, need, ratio };
  });

  const readiness = Math.round(
    (coverage.reduce((sum, c) => sum + c.ratio, 0) / coverage.length) * 100,
  );

  const gaps = coverage
    .filter((c) => c.ratio < 1)
    .sort((a, b) => a.ratio - b.ratio || b.need - a.need);

  const met = coverage.filter((c) => c.ratio >= 1).map((c) => c.tactic);

  return { readiness, coverage, gaps, met };
}

/**
 * Recommend learning paths for the gaps found.
 *
 * Returns the role's suggested paths when anything is missing, and nothing
 * when the user already meets every requirement — recommending study to
 * someone who is role-ready is noise.
 */
export function recommendPaths(
  analysis: GapAnalysis,
  recommendedPathSlugs: readonly string[],
  limit = 3,
): string[] {
  if (analysis.gaps.length === 0) return [];
  return recommendedPathSlugs.slice(0, limit);
}

/** Coarse label for the readiness number, for badges and summaries. */
export function readinessLabel(readiness: number): string {
  if (readiness >= 90) return "Role ready";
  if (readiness >= 70) return "Nearly ready";
  if (readiness >= 40) return "Developing";
  return "Early";
}
