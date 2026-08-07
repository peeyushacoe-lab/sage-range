/**
 * Operation Zero Hour — competition engine.
 *
 * Pure functions only, no database imports, for the same reason as
 * src/lib/championship-scoring.ts: these decide the score, the rank and who is
 * named champion, so the rules are tested directly rather than inferred from
 * the behaviour of an API route.
 *
 * Every grader here takes a submission plus the authored answer key and
 * returns a breakdown. The key is never a parameter the client controls — the
 * service layer derives it server-side from the run's seed.
 */

export type OzhPhase =
  | "TRIAGE"
  | "INVESTIGATION"
  | "HUNT"
  | "RECONSTRUCTION"
  | "RESPONSE"
  | "REPORT";

/** Phase order is the unlock order; a phase opens when the previous is submitted. */
export const PHASE_ORDER: readonly OzhPhase[] = [
  "TRIAGE",
  "INVESTIGATION",
  "HUNT",
  "RECONSTRUCTION",
  "RESPONSE",
  "REPORT",
] as const;

export const PHASE_POINTS: Record<OzhPhase, number> = {
  TRIAGE: 150,
  INVESTIGATION: 200,
  HUNT: 250,
  RECONSTRUCTION: 150,
  RESPONSE: 150,
  REPORT: 100,
};

export const PHASE_LABEL: Record<OzhPhase, string> = {
  TRIAGE: "SOC Triage",
  INVESTIGATION: "Investigation",
  HUNT: "Threat Hunt",
  RECONSTRUCTION: "Attack Reconstruction",
  RESPONSE: "Incident Response",
  REPORT: "Final Report",
};

/** Suggested pacing, shown in the console. Not enforced — only the 3h total is. */
export const PHASE_MINUTES: Record<OzhPhase, number> = {
  TRIAGE: 30,
  INVESTIGATION: 40,
  HUNT: 45,
  RECONSTRUCTION: 30,
  RESPONSE: 30,
  REPORT: 25,
};

export const MAX_SCORE = 1000;

// ── Competition window ──────────────────────────────────────────────────────
// Stored as UTC instants. The competition is run out of Asia/Kolkata, so these
// are the IST wall-clock times the interns are told, converted once here rather
// than in every render.
//
//   opens  2026-08-10 00:00 IST
//   closes 2026-08-12 20:00 IST
export const OZH_OPENS_AT = new Date("2026-08-09T18:30:00.000Z");
export const OZH_CLOSES_AT = new Date("2026-08-12T14:30:00.000Z");

/** Wall-clock budget for one run. */
export const RUN_MINUTES = 180;

/**
 * When a run must stop.
 *
 * A run started at 18:30 on the final day does not get until 21:30 — the
 * deadline is a hard stop, so it is graded on whatever was submitted by 20:00.
 * Taking the minimum here is what makes the deadline mean the same thing for
 * everyone regardless of when they started.
 */
export function effectiveDeadline(startedAt: Date, closesAt: Date = OZH_CLOSES_AT): Date {
  const ownDeadline = new Date(startedAt.getTime() + RUN_MINUTES * 60_000);
  return ownDeadline < closesAt ? ownDeadline : closesAt;
}

/** Whole seconds left in a run, floored at zero. */
export function secondsRemaining(startedAt: Date, now: Date, closesAt: Date = OZH_CLOSES_AT): number {
  const ms = effectiveDeadline(startedAt, closesAt).getTime() - now.getTime();
  return ms <= 0 ? 0 : Math.floor(ms / 1000);
}

/**
 * The latest instant at which starting still buys a full three hours.
 * Surfaced on the landing page so nobody starts at 19:45 by accident.
 */
export function lastFullRunStart(closesAt: Date = OZH_CLOSES_AT): Date {
  return new Date(closesAt.getTime() - RUN_MINUTES * 60_000);
}

export type WindowState = "BEFORE" | "OPEN" | "CLOSED";

export function windowStateAt(
  now: Date,
  opensAt: Date = OZH_OPENS_AT,
  closesAt: Date = OZH_CLOSES_AT,
): WindowState {
  if (now < opensAt) return "BEFORE";
  if (now >= closesAt) return "CLOSED";
  return "OPEN";
}

// ── Scoring primitives ──────────────────────────────────────────────────────

export type PhaseScore = {
  phase: OzhPhase;
  points: number;
  maxPoints: number;
  /** Individually graded decisions the intern got right. Feeds accuracy. */
  correct: number;
  /** Total graded decisions available in this phase. */
  total: number;
  /** Human-readable notes for the debrief, e.g. what was missed. */
  missed: string[];
};

const emptyScore = (phase: OzhPhase): PhaseScore => ({
  phase,
  points: 0,
  maxPoints: PHASE_POINTS[phase],
  correct: 0,
  total: 0,
  missed: [],
});

/**
 * Distribute a point pool over N items without drift.
 *
 * Dividing 75 points over 15 alerts is exact, but 250 over 8 findings is not.
 * Allocating the running remainder rather than rounding each share keeps the
 * phase total exactly on its advertised maximum.
 */
export function allocate(pool: number, count: number): number[] {
  if (count <= 0) return [];
  const shares: number[] = [];
  let assigned = 0;
  for (let i = 0; i < count; i++) {
    const target = Math.round((pool * (i + 1)) / count);
    shares.push(target - assigned);
    assigned = target;
  }
  return shares;
}

/** Case- and whitespace-insensitive comparison for free-text indicators. */
export function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// ── Phase 1: SOC Triage ─────────────────────────────────────────────────────

export type AlertVerdict = "BENIGN" | "SUSPICIOUS" | "MALICIOUS" | "FALSE_POSITIVE";
export type AlertSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertPriority = "P1" | "P2" | "P3" | "P4";

export type TriageKey = {
  alertId: string;
  verdict: AlertVerdict;
  severity: AlertSeverity;
  priority: AlertPriority;
  asset: string;
};

export type TriageAnswer = {
  alertId: string;
  verdict?: AlertVerdict;
  severity?: AlertSeverity;
  priority?: AlertPriority;
  asset?: string;
};

/** Sub-pools, per the competition spec. */
export const TRIAGE_POOLS = { verdict: 75, severity: 30, priority: 25, asset: 20 } as const;

/**
 * Grade triage.
 *
 * Severity and priority award half credit when adjacent to the key. An analyst
 * who calls a CRITICAL alert HIGH has understood it; one who calls it INFO has
 * not, and a flat right/wrong mark cannot tell those apart.
 */
export function gradeTriage(answers: readonly TriageAnswer[], key: readonly TriageKey[]): PhaseScore {
  const score = emptyScore("TRIAGE");
  if (key.length === 0) return score;

  const byId = new Map(answers.map((a) => [a.alertId, a]));
  const verdictShares = allocate(TRIAGE_POOLS.verdict, key.length);
  const severityShares = allocate(TRIAGE_POOLS.severity, key.length);
  const priorityShares = allocate(TRIAGE_POOLS.priority, key.length);
  const assetShares = allocate(TRIAGE_POOLS.asset, key.length);

  const sevScale: AlertSeverity[] = ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"];
  const priScale: AlertPriority[] = ["P1", "P2", "P3", "P4"];

  let raw = 0;
  key.forEach((k, i) => {
    const a = byId.get(k.alertId);
    score.total += 4;

    if (a?.verdict === k.verdict) {
      raw += verdictShares[i];
      score.correct++;
    } else if (a?.verdict) {
      score.missed.push(`${k.alertId}: classified ${a.verdict}, was ${k.verdict}`);
    }

    const sevGap = Math.abs(sevScale.indexOf(a?.severity ?? "INFO") - sevScale.indexOf(k.severity));
    if (a?.severity === k.severity) {
      raw += severityShares[i];
      score.correct++;
    } else if (a?.severity && sevGap === 1) {
      raw += severityShares[i] / 2;
    }

    const priGap = Math.abs(priScale.indexOf(a?.priority ?? "P4") - priScale.indexOf(k.priority));
    if (a?.priority === k.priority) {
      raw += priorityShares[i];
      score.correct++;
    } else if (a?.priority && priGap === 1) {
      raw += priorityShares[i] / 2;
    }

    if (a?.asset && normalise(a.asset) === normalise(k.asset)) {
      raw += assetShares[i];
      score.correct++;
    }
  });

  score.points = Math.min(Math.round(raw), score.maxPoints);
  return score;
}

// ── Phase 2: Investigation ──────────────────────────────────────────────────

export type FindingKey = {
  id: string;
  question: string;
  /** Accepted answers. First entry is the canonical one shown in the debrief. */
  accept: readonly string[];
};

export type FindingAnswer = { id: string; value: string };

export function gradeFindings(
  answers: readonly FindingAnswer[],
  key: readonly FindingKey[],
  phase: OzhPhase,
): PhaseScore {
  const score = emptyScore(phase);
  if (key.length === 0) return score;

  const byId = new Map(answers.map((a) => [a.id, normalise(a.value)]));
  const shares = allocate(PHASE_POINTS[phase], key.length);

  let raw = 0;
  key.forEach((k, i) => {
    score.total++;
    const given = byId.get(k.id);
    if (given && k.accept.some((acc) => normalise(acc) === given)) {
      raw += shares[i];
      score.correct++;
    } else {
      score.missed.push(`${k.question} → ${k.accept[0]}`);
    }
  });

  score.points = Math.min(Math.round(raw), score.maxPoints);
  return score;
}

// ── Phase 3: Threat Hunt ────────────────────────────────────────────────────

export type HuntKey = {
  id: string;
  tactic: string;
  /** MITRE technique id, e.g. "T1566.001". */
  technique: string;
  /** The indicator that proves it, matched case-insensitively. */
  accept: readonly string[];
  label: string;
};

export type HuntAnswer = { id: string; technique?: string; indicator?: string };

/**
 * Grade the hunt.
 *
 * Split 60/40 between finding the indicator and naming the technique. Finding
 * the evidence is the harder and more valuable half; an intern who located the
 * LSASS access but called it T1078 has still done the work that matters.
 */
export const HUNT_SPLIT = { indicator: 0.6, technique: 0.4 } as const;

export function gradeHunt(answers: readonly HuntAnswer[], key: readonly HuntKey[]): PhaseScore {
  const score = emptyScore("HUNT");
  if (key.length === 0) return score;

  const byId = new Map(answers.map((a) => [a.id, a]));
  const shares = allocate(PHASE_POINTS.HUNT, key.length);

  let raw = 0;
  key.forEach((k, i) => {
    const a = byId.get(k.id);
    score.total += 2;

    const indicatorOk =
      !!a?.indicator && k.accept.some((acc) => normalise(acc) === normalise(a.indicator!));
    if (indicatorOk) {
      raw += shares[i] * HUNT_SPLIT.indicator;
      score.correct++;
    }

    if (a?.technique && normalise(a.technique) === normalise(k.technique)) {
      raw += shares[i] * HUNT_SPLIT.technique;
      score.correct++;
    }

    if (!indicatorOk) score.missed.push(`${k.label} → ${k.accept[0]} (${k.technique})`);
  });

  score.points = Math.min(Math.round(raw), score.maxPoints);
  return score;
}

// ── Phase 4: Attack Reconstruction ──────────────────────────────────────────

export type ReconKey = {
  /** Event ids in their correct chronological order. */
  order: readonly string[];
  /** Correct tactic label per event id. */
  tactics: Readonly<Record<string, string>>;
};

export type ReconAnswer = {
  order: readonly string[];
  tactics?: Readonly<Record<string, string>>;
};

export const RECON_POOLS = { order: 90, tactics: 60 } as const;

/**
 * Grade the reconstruction.
 *
 * Ordering is scored on adjacent pairs, not absolute positions. Getting one
 * early event wrong shifts every later event by one and would zero an
 * otherwise correct timeline under positional marking — which would punish a
 * near-perfect answer far more harshly than it deserves.
 */
export function gradeReconstruction(answer: ReconAnswer, key: ReconKey): PhaseScore {
  const score = emptyScore("RECONSTRUCTION");
  const n = key.order.length;
  if (n === 0) return score;

  const rank = new Map(key.order.map((id, i) => [id, i]));
  const submitted = answer.order.filter((id) => rank.has(id));

  const pairs = Math.max(1, n - 1);
  let correctPairs = 0;
  for (let i = 0; i + 1 < submitted.length; i++) {
    if (rank.get(submitted[i])! < rank.get(submitted[i + 1])!) correctPairs++;
  }
  score.total += pairs;
  score.correct += correctPairs;
  let raw = (RECON_POOLS.order * correctPairs) / pairs;

  const tacticShares = allocate(RECON_POOLS.tactics, n);
  key.order.forEach((id, i) => {
    score.total++;
    const given = answer.tactics?.[id];
    if (given && normalise(given) === normalise(key.tactics[id])) {
      raw += tacticShares[i];
      score.correct++;
    } else {
      score.missed.push(`${id} is ${key.tactics[id]}`);
    }
  });

  score.points = Math.min(Math.round(raw), score.maxPoints);
  return score;
}

// ── Phase 5: Incident Response ──────────────────────────────────────────────

/**
 * CORRECT actions earn their weight. HARMFUL actions subtract it — taking the
 * domain controller offline because it appears in the attack path is the
 * mistake this phase exists to catch, and an action set that is scored only on
 * what it contains cannot penalise it. NEUTRAL actions are neither, so
 * selecting everything scores no better than selecting well.
 */
export type ActionGrade = "CORRECT" | "NEUTRAL" | "HARMFUL";

export type ResponseKey = {
  actionId: string;
  grade: ActionGrade;
  weight: number;
  label: string;
  rationale: string;
};

export function gradeResponse(
  selected: readonly string[],
  key: readonly ResponseKey[],
): PhaseScore {
  const score = emptyScore("RESPONSE");
  const correctActions = key.filter((k) => k.grade === "CORRECT");
  const totalWeight = correctActions.reduce((sum, k) => sum + k.weight, 0);
  if (totalWeight === 0) return score;

  const chosen = new Set(selected);
  const perWeight = PHASE_POINTS.RESPONSE / totalWeight;

  let raw = 0;
  for (const k of key) {
    if (k.grade === "NEUTRAL") continue;
    score.total++;
    const picked = chosen.has(k.actionId);
    if (k.grade === "CORRECT") {
      if (picked) {
        raw += k.weight * perWeight;
        score.correct++;
      } else {
        score.missed.push(`Did not take: ${k.label}`);
      }
    } else if (picked) {
      raw -= k.weight * perWeight;
      score.missed.push(`Harmful action taken: ${k.label} — ${k.rationale}`);
    } else {
      score.correct++;
    }
  }

  // Floor at zero: a negative phase score would let one bad decision eat points
  // earned elsewhere in the competition.
  score.points = Math.max(0, Math.min(Math.round(raw), score.maxPoints));
  return score;
}

// ── Phase 6: Final Report ───────────────────────────────────────────────────

export type ReportKey = {
  severity: string;
  iocs: readonly string[];
  assets: readonly string[];
  techniques: readonly string[];
  containment: readonly string[];
};

export type ReportAnswer = {
  severity?: string;
  iocs?: readonly string[];
  assets?: readonly string[];
  techniques?: readonly string[];
  containment?: readonly string[];
  executiveSummary?: string;
  impact?: string;
  remediation?: string;
  recommendations?: string;
};

export const REPORT_POOLS = {
  severity: 10,
  iocs: 30,
  assets: 20,
  techniques: 20,
  containment: 10,
  narrative: 10,
} as const;

/** Minimum characters for a narrative section to count as written. */
export const NARRATIVE_MIN_CHARS = 120;

/**
 * Grade a set submission with a false-positive penalty.
 *
 * Without the penalty the optimal strategy is to tick every IoC on the list,
 * which is the opposite of the discipline the report is meant to teach.
 */
function gradeSet(given: readonly string[], expected: readonly string[], pool: number) {
  if (expected.length === 0) return { points: 0, hit: 0, missed: [] as string[] };
  const want = new Set(expected.map(normalise));
  const seen = new Set(given.map(normalise));

  const hit = [...want].filter((w) => seen.has(w)).length;
  const wrong = [...seen].filter((s) => !want.has(s)).length;

  const gross = (pool * hit) / want.size;
  const penalty = Math.min(gross, (pool * wrong) / want.size);
  const missed = expected.filter((e) => !seen.has(normalise(e)));

  return { points: Math.max(0, gross - penalty), hit, missed };
}

export function gradeReport(answer: ReportAnswer, key: ReportKey): PhaseScore {
  const score = emptyScore("REPORT");
  let raw = 0;

  score.total++;
  if (answer.severity && normalise(answer.severity) === normalise(key.severity)) {
    raw += REPORT_POOLS.severity;
    score.correct++;
  } else {
    score.missed.push(`Severity should be ${key.severity}`);
  }

  const sections: Array<[keyof ReportKey, number, string]> = [
    ["iocs", REPORT_POOLS.iocs, "IoC"],
    ["assets", REPORT_POOLS.assets, "Compromised asset"],
    ["techniques", REPORT_POOLS.techniques, "Technique"],
    ["containment", REPORT_POOLS.containment, "Containment action"],
  ];

  for (const [field, pool, label] of sections) {
    const expected = key[field] as readonly string[];
    const given = (answer[field as keyof ReportAnswer] as readonly string[] | undefined) ?? [];
    const result = gradeSet(given, expected, pool);
    raw += result.points;
    score.total += expected.length;
    score.correct += result.hit;
    for (const m of result.missed) score.missed.push(`${label} missed: ${m}`);
  }

  // The prose sections are scored for having been written, not for wording —
  // judging phrasing without a human or a model would be arbitrary.
  const narrative = [
    answer.executiveSummary,
    answer.impact,
    answer.remediation,
    answer.recommendations,
  ];
  const written = narrative.filter((s) => (s ?? "").trim().length >= NARRATIVE_MIN_CHARS).length;
  score.total += narrative.length;
  score.correct += written;
  raw += (REPORT_POOLS.narrative * written) / narrative.length;

  score.points = Math.min(Math.round(raw), score.maxPoints);
  return score;
}

// ── Totals, accuracy and ranking ────────────────────────────────────────────

export type RunTotals = {
  score: number;
  /** 0-100, rounded. Share of individually graded decisions answered correctly. */
  accuracy: number;
  breakdown: PhaseScore[];
};

export function totalRun(breakdown: readonly PhaseScore[]): RunTotals {
  const score = breakdown.reduce((sum, p) => sum + p.points, 0);
  const correct = breakdown.reduce((sum, p) => sum + p.correct, 0);
  const total = breakdown.reduce((sum, p) => sum + p.total, 0);
  return {
    score: Math.min(score, MAX_SCORE),
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    breakdown: [...breakdown],
  };
}

export type RankableRun = {
  userId: string;
  score: number;
  accuracy: number;
  /** Seconds from start to submission. */
  elapsedSeconds: number;
};

export type RankedRun = RankableRun & { rank: number };

/**
 * Rank by score, then accuracy, then time.
 *
 * Time is deliberately last. Ranking on speed first rewards whoever clicked
 * fastest rather than whoever investigated best, which is the failure mode
 * this competition is designed to avoid.
 */
export function rankRuns(runs: readonly RankableRun[]): RankedRun[] {
  const sorted = [...runs].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    if (a.elapsedSeconds !== b.elapsedSeconds) return a.elapsedSeconds - b.elapsedSeconds;
    return a.userId.localeCompare(b.userId);
  });

  const ranked: RankedRun[] = [];
  let previous: RankableRun | null = null;
  let previousRank = 0;

  sorted.forEach((run, index) => {
    const tied =
      previous !== null &&
      previous.score === run.score &&
      previous.accuracy === run.accuracy &&
      previous.elapsedSeconds === run.elapsedSeconds;
    const rank = tied ? previousRank : index + 1;
    ranked.push({ ...run, rank });
    previous = run;
    previousRank = rank;
  });

  return ranked;
}

export type OzhAwardKind =
  | "CHAMPION"
  | "TOP_THREAT_HUNTER"
  | "BEST_INCIDENT_RESPONDER"
  | "BEST_INVESTIGATOR"
  | "BEST_TECHNICAL_REPORT"
  | "FASTEST_ANALYST"
  | "MOST_ACCURATE_ANALYST";

export const AWARD_LABEL: Record<OzhAwardKind, string> = {
  CHAMPION: "Operation Zero Hour Champion",
  TOP_THREAT_HUNTER: "Top Threat Hunter",
  BEST_INCIDENT_RESPONDER: "Best Incident Responder",
  BEST_INVESTIGATOR: "Best Investigator",
  BEST_TECHNICAL_REPORT: "Best Technical Report",
  FASTEST_ANALYST: "Fastest Analyst",
  MOST_ACCURATE_ANALYST: "Most Accurate Analyst",
};

export type AwardableRun = RankableRun & {
  phaseScores: Readonly<Record<OzhPhase, number>>;
};

/**
 * Decide the seven awards.
 *
 * Fastest Analyst is restricted to runs that scored at least this share of the
 * maximum, so it cannot be won by submitting an empty report in four minutes.
 */
export const FASTEST_MIN_SCORE_FRACTION = 0.7;

export function decideAwards(runs: readonly AwardableRun[]): Array<{
  kind: OzhAwardKind;
  userId: string;
}> {
  if (runs.length === 0) return [];
  const awards: Array<{ kind: OzhAwardKind; userId: string }> = [];

  const champion = rankRuns(runs)[0];
  if (champion && champion.score > 0) awards.push({ kind: "CHAMPION", userId: champion.userId });

  const bestIn = (phase: OzhPhase, kind: OzhAwardKind) => {
    const winner = [...runs]
      .filter((r) => r.phaseScores[phase] > 0)
      .sort((a, b) =>
        b.phaseScores[phase] !== a.phaseScores[phase]
          ? b.phaseScores[phase] - a.phaseScores[phase]
          : a.elapsedSeconds - b.elapsedSeconds,
      )[0];
    if (winner) awards.push({ kind, userId: winner.userId });
  };

  bestIn("HUNT", "TOP_THREAT_HUNTER");
  bestIn("RESPONSE", "BEST_INCIDENT_RESPONDER");
  bestIn("INVESTIGATION", "BEST_INVESTIGATOR");
  bestIn("REPORT", "BEST_TECHNICAL_REPORT");

  const eligible = runs.filter((r) => r.score >= MAX_SCORE * FASTEST_MIN_SCORE_FRACTION);
  const fastest = [...eligible].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)[0];
  if (fastest) awards.push({ kind: "FASTEST_ANALYST", userId: fastest.userId });

  const mostAccurate = [...runs]
    .filter((r) => r.accuracy > 0)
    .sort((a, b) => (b.accuracy !== a.accuracy ? b.accuracy - a.accuracy : b.score - a.score))[0];
  if (mostAccurate) awards.push({ kind: "MOST_ACCURATE_ANALYST", userId: mostAccurate.userId });

  return awards;
}

/**
 * Certificate code, e.g. OZH-2026-1-K7QR4M.
 * Same unambiguous alphabet as the other Vault credentials: no I, O, 0 or 1.
 */
export function ozhCertCode(rank: number, random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(random() * alphabet.length)];
  return `OZH-2026-${rank}-${suffix}`;
}
