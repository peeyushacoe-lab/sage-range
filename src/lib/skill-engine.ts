/**
 * The skill engine: deriving a learner's skill profile from evidence.
 *
 * Before this, "skill" meant three different things in three places — a scalar
 * `User.skillScore` that nine endpoints incremented on incompatible scales, a
 * six-axis radar computed from labs and simulations only, and a static
 * lab→technique map. None was fed by every activity and none agreed with the
 * others.
 *
 * This module is the single derivation. Given a learner's Evidence rows — one
 * per graded activity, of any type — it produces the overall score, the
 * per-tactic matrix, MITRE coverage and accuracy, all from the same source, so
 * they cannot disagree. It is pure and takes evidence as an argument: the thing
 * it computes drives a public leaderboard and what a learner is told to study
 * next, so it is tested directly rather than inferred from clicking around.
 */

// The canonical skill axes are MITRE tactic *names*, matching the tactic field
// already used by LAB_TECHNIQUES and the coverage page. Kept here as the one
// list the engine ranges over, so a tactic added in one place is scored
// everywhere.
export const TACTICS = [
  "Reconnaissance",
  "Resource Development",
  "Initial Access",
  "Execution",
  "Persistence",
  "Privilege Escalation",
  "Defense Evasion",
  "Credential Access",
  "Discovery",
  "Lateral Movement",
  "Collection",
  "Command and Control",
  "Exfiltration",
  "Impact",
] as const;

export type Tactic = (typeof TACTICS)[number];

export type EvidenceActivity =
  | "LAB"
  | "INCIDENT"
  | "SIMULATION"
  | "SOC_SHIFT"
  | "DETECTION"
  | "PURPLE_TEAM"
  | "COMPETITION"
  | "ASSESSMENT"
  | "HUNT";

export type EvidenceResult = "SOLVED" | "PARTIAL" | "FAILED";

/** The plain shape the engine reasons over — a row from the Evidence table. */
export type EvidenceRecord = {
  activity: EvidenceActivity;
  result: EvidenceResult;
  skillPoints: number;
  difficulty?: string | null;
  attempts?: number | null;
  hintsUsed?: number | null;
  timeSec?: number | null;
  tactics: string[];
  techniques?: string[];
};

// ── Overall score ───────────────────────────────────────────────────────────

/**
 * A learner's overall skill points — the sum of what each activity contributed.
 *
 * This is the number that must equal today's User.skillScore for the labs that
 * have evidence, which is how the spine is validated before anything downstream
 * is switched to derive from it. Only positively-resulting evidence counts;
 * a failed attempt is behavioural signal, not a contribution.
 */
export function overallSkillPoints(records: readonly EvidenceRecord[]): number {
  return records.reduce((sum, r) => sum + Math.max(0, r.skillPoints), 0);
}

// ── Per-tactic matrix ───────────────────────────────────────────────────────

export type TacticStanding = {
  tactic: Tactic;
  /** 0–100, saturating: more evidence raises it with diminishing returns. */
  score: number;
  /** Raw skill points accumulated under this tactic. */
  points: number;
  /** Activities that demonstrated this tactic. */
  activities: number;
  /** Distinct techniques demonstrated under it. */
  techniques: number;
  demonstrated: boolean;
};

/**
 * Points-to-score saturation constant.
 *
 * The mapping is `100 * (1 - e^(-points / K))`: fast at first, saturating below
 * 100. At K = 300, one solid hard activity (~200 pts) reaches ~49, a few reach
 * the 80s, and no finite amount hits 100 — mastery is asymptotic, which is the
 * honest shape for a skill. K is deliberately a single named constant so the
 * curve can be recalibrated in one place once every activity emits evidence.
 */
export const SATURATION_K = 300;

export function saturate(points: number, k: number = SATURATION_K): number {
  if (points <= 0) return 0;
  // Capped at 99: the curve never reaches 100, and rounding must not fake it —
  // a displayed 100 would claim a mastery the model deliberately never grants.
  return Math.min(99, Math.round(100 * (1 - Math.exp(-points / k))));
}

/**
 * The per-tactic standing, over every tactic in TACTICS.
 *
 * Every tactic is present in the output even at zero, so the matrix is a
 * complete picture rather than only the tactics a learner happens to have
 * touched — the zeros are the gaps, and the gaps are the point.
 */
export function skillMatrix(records: readonly EvidenceRecord[]): TacticStanding[] {
  const points = new Map<string, number>();
  const activities = new Map<string, number>();
  const techniques = new Map<string, Set<string>>();

  for (const r of records) {
    if (r.skillPoints <= 0 && r.result === "FAILED") continue;
    const share = r.tactics.length > 0 ? r.skillPoints / r.tactics.length : 0;
    for (const t of r.tactics) {
      points.set(t, (points.get(t) ?? 0) + Math.max(0, share));
      activities.set(t, (activities.get(t) ?? 0) + 1);
      if (!techniques.has(t)) techniques.set(t, new Set());
      for (const tech of r.techniques ?? []) techniques.get(t)!.add(tech);
    }
  }

  return TACTICS.map((tactic) => {
    const p = Math.round(points.get(tactic) ?? 0);
    return {
      tactic,
      points: p,
      score: saturate(p),
      activities: activities.get(tactic) ?? 0,
      techniques: techniques.get(tactic)?.size ?? 0,
      demonstrated: (activities.get(tactic) ?? 0) > 0,
    };
  });
}

// ── Coverage ────────────────────────────────────────────────────────────────

export type Coverage = {
  tacticsCovered: number;
  tacticsTotal: number;
  coveragePct: number;
  techniquesDemonstrated: number;
};

/** MITRE coverage, derived from the same evidence as everything else. */
export function coverage(records: readonly EvidenceRecord[]): Coverage {
  const tacticsSeen = new Set<string>();
  const techsSeen = new Set<string>();
  for (const r of records) {
    if (r.result === "FAILED") continue;
    for (const t of r.tactics) if ((TACTICS as readonly string[]).includes(t)) tacticsSeen.add(t);
    for (const tech of r.techniques ?? []) techsSeen.add(tech);
  }
  return {
    tacticsCovered: tacticsSeen.size,
    tacticsTotal: TACTICS.length,
    coveragePct: Math.round((tacticsSeen.size / TACTICS.length) * 100),
    techniquesDemonstrated: techsSeen.size,
  };
}

// ── Accuracy and mix ────────────────────────────────────────────────────────

export type Accuracy = {
  total: number;
  solved: number;
  partial: number;
  failed: number;
  /** Solved / graded-attempts, 0–100. The "how well", separate from "how much". */
  accuracyPct: number;
};

export function accuracy(records: readonly EvidenceRecord[]): Accuracy {
  let solved = 0;
  let partial = 0;
  let failed = 0;
  for (const r of records) {
    if (r.result === "SOLVED") solved++;
    else if (r.result === "PARTIAL") partial++;
    else failed++;
  }
  const total = records.length;
  const graded = solved + partial + failed;
  return {
    total,
    solved,
    partial,
    failed,
    accuracyPct: graded === 0 ? 0 : Math.round(((solved + partial * 0.5) / graded) * 100),
  };
}

/** Evidence count by activity type — how a learner has spread their practice. */
export function activityMix(
  records: readonly EvidenceRecord[],
): Record<EvidenceActivity, number> {
  const mix = {
    LAB: 0, INCIDENT: 0, SIMULATION: 0, SOC_SHIFT: 0, DETECTION: 0,
    PURPLE_TEAM: 0, COMPETITION: 0, ASSESSMENT: 0, HUNT: 0,
  } as Record<EvidenceActivity, number>;
  for (const r of records) mix[r.activity]++;
  return mix;
}

// ── The adaptive loop ───────────────────────────────────────────────────────

export type Weakness = {
  tactic: Tactic;
  score: number;
  /** True when there is genuinely no evidence, versus weak evidence. */
  untouched: boolean;
};

/**
 * The tactics a learner should train next, weakest first.
 *
 * This is the input to recommendation — the gap end of the adaptive loop. An
 * untouched tactic outranks a merely weak one at the same score, because "never
 * attempted" is a bigger hole than "attempted and shaky". Fully-covered tactics
 * (score at or above `mastered`) are not weaknesses and are dropped.
 */
export function weakestTactics(
  records: readonly EvidenceRecord[],
  opts: { limit?: number; mastered?: number } = {},
): Weakness[] {
  const limit = opts.limit ?? 3;
  const mastered = opts.mastered ?? 70;
  const matrix = skillMatrix(records);

  return matrix
    .filter((m) => m.score < mastered)
    .map((m) => ({ tactic: m.tactic, score: m.score, untouched: !m.demonstrated }))
    .sort((a, b) => {
      if (a.untouched !== b.untouched) return a.untouched ? -1 : 1;
      return a.score - b.score;
    })
    .slice(0, limit);
}

// ── Recommendation (the action end of the loop) ─────────────────────────────

/** An activity that could be recommended, tagged with the tactics it trains. */
export type ActivityRef = {
  slug: string;
  title: string;
  href: string;
  activity: EvidenceActivity;
  difficulty?: string | null;
  tactics: string[];
};

export type Recommendation = {
  activity: ActivityRef;
  /** The learner's weak tactics this activity would train. */
  addresses: Tactic[];
  /** Ranking weight — higher means it closes more, and weaker, gaps. */
  relevance: number;
};

/** How much a single weakness is worth closing. Untouched gaps weigh most. */
function weaknessWeight(w: Weakness, mastered: number): number {
  return w.untouched ? mastered + 30 : Math.max(1, mastered - w.score);
}

/**
 * Recommend what to do next, from the learner's gaps and the activity
 * catalogue — the step that turns a skill profile into a training plan.
 *
 * An activity is a candidate only if the learner has not already completed it
 * and it trains at least one of their weak tactics; recommending mastered
 * ground or finished work is noise. Candidates are ranked by how much weakness
 * they close, and ties broken toward the easier activity so a struggling
 * learner gets a foothold rather than a wall.
 */
export function recommendActivities(
  weakest: readonly Weakness[],
  catalogue: readonly ActivityRef[],
  completedSlugs: ReadonlySet<string>,
  opts: { limit?: number; mastered?: number } = {},
): Recommendation[] {
  const limit = opts.limit ?? 5;
  const mastered = opts.mastered ?? 70;

  const weightByTactic = new Map<string, number>();
  for (const w of weakest) weightByTactic.set(w.tactic, weaknessWeight(w, mastered));

  const DIFF_ORDER: Record<string, number> = { EASY: 0, MEDIUM: 1, HARD: 2, INSANE: 3 };

  const recs: Recommendation[] = [];
  for (const ref of catalogue) {
    if (completedSlugs.has(ref.slug)) continue;
    const addresses = ref.tactics.filter((t) => weightByTactic.has(t)) as Tactic[];
    if (addresses.length === 0) continue;
    const relevance = addresses.reduce((sum, t) => sum + (weightByTactic.get(t) ?? 0), 0);
    recs.push({ activity: ref, addresses, relevance });
  }

  return recs
    .sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      const da = DIFF_ORDER[a.activity.difficulty ?? ""] ?? 1;
      const db = DIFF_ORDER[b.activity.difficulty ?? ""] ?? 1;
      if (da !== db) return da - db;
      return a.activity.title.localeCompare(b.activity.title);
    })
    .slice(0, limit);
}
