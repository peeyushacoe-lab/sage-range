/**
 * Mission Analyst — server logic.
 *
 * A "case" (an IR) is 2+ MissionScenario rows sharing a caseSlug, ordered by
 * phaseNumber — a phase is investigate-then-file-findings, same shape as a
 * single scenario always was; a case is just a chain of them. Phase N+1 is
 * locked until phase N's session is SUBMITTED for this user, enforced in
 * startSession, not just hidden in the UI.
 *
 * The rule that matters most and that everything else is built to protect:
 * the client never receives evidence.description, evidence.isCritical, or
 * any of MissionScenario's answer* fields up front. It gets a phase's
 * environment key, the list of interactable object keys to place, and the
 * public suspect/classification option lists — meaningless or
 * multiple-choice on their own — and only learns what an object actually is
 * by asking the server to resolve one `key` at a time, the moment the player
 * interacts with it. Grading likewise only ever happens server-side, in
 * submitFindings, against fields no client-facing query ever selects.
 */

import { db } from "@/lib/db";

/**
 * This week's assignment window. IST end-of-day Sept 27 2026 — same
 * IST-deadline convention Operation Zero Hour uses (OZH_CLOSES_AT).
 *
 * Extended once already: the original deadline was Sept 17, but several
 * students missed it, so this was pushed another 7 days from the day of
 * the extension (Sept 20) rather than tacked onto the already-passed
 * original date. Reopening only helps students who never finished — anyone
 * who already SUBMITTED a phase still can't redo it (one attempt each,
 * enforced independently of this window in submitFindings).
 *
 * Single source of truth for both halves of "close the assignment": the
 * dashboard promo (student-home.tsx) stops showing once this has passed,
 * and startSession/examineEvidence/submitFindings all refuse once it has
 * too — so removing the dashboard link and actually closing the mission
 * happen together, from one constant, not as two separate steps to
 * remember to do on the day.
 */
export const MISSION_ANALYST_CLOSES_AT = new Date("2026-09-27T18:30:00.000Z"); // 2026-09-28 00:00 IST

export type MissionResult<T> = { success: true; data: T } | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): MissionResult<never> => ({ success: false, error, statusCode });

export function isMissionAnalystClosed(now: Date = new Date()): boolean {
  return now > MISSION_ANALYST_CLOSES_AT;
}
const isClosed = isMissionAnalystClosed;

// Fields safe to hand to a client — everything on MissionScenario except the
// answer* columns.
const PUBLIC_SCENARIO_SELECT = {
  id: true,
  slug: true,
  title: true,
  briefing: true,
  objective: true,
  environment: true,
  published: true,
  suspects: true,
  classifications: true,
  caseSlug: true,
  caseTitle: true,
  phaseNumber: true,
  phaseLabel: true,
  isFinalPhase: true,
} as const;

export async function getScenario(slug: string) {
  return db.missionScenario.findUnique({ where: { slug }, select: PUBLIC_SCENARIO_SELECT });
}

/** One row per case (its first phase), for the briefing page's list of cases. */
export async function listCases() {
  const phases = await db.missionScenario.findMany({
    where: { published: true },
    orderBy: [{ caseSlug: "asc" }, { phaseNumber: "asc" }],
    select: PUBLIC_SCENARIO_SELECT,
  });
  const byCase = new Map<string, typeof phases>();
  for (const p of phases) {
    if (!byCase.has(p.caseSlug)) byCase.set(p.caseSlug, []);
    byCase.get(p.caseSlug)!.push(p);
  }
  return [...byCase.values()].map((phases) => ({
    caseSlug: phases[0].caseSlug,
    caseTitle: phases[0].caseTitle,
    briefing: phases[0].briefing,
    phaseCount: phases.length,
    phases,
  }));
}

/**
 * This user's progress through a case: each phase's session status (or
 * "LOCKED" if an earlier phase isn't SUBMITTED yet), and which phase slug
 * they should be sent to right now.
 */
export async function getCaseProgress(userId: string, caseSlug: string) {
  const phases = await db.missionScenario.findMany({
    where: { caseSlug, published: true },
    orderBy: { phaseNumber: "asc" },
    select: PUBLIC_SCENARIO_SELECT,
  });
  if (phases.length === 0) return null;

  const sessions = await db.missionSession.findMany({
    where: { userId, scenarioId: { in: phases.map((p) => p.id) } },
    select: { scenarioId: true, status: true, score: true },
  });
  const sessionByScenario = new Map(sessions.map((s) => [s.scenarioId, s]));

  let unlocked = true;
  let currentSlug: string | null = null;
  const rows = phases.map((p) => {
    const session = sessionByScenario.get(p.id);
    const status: "LOCKED" | "IN_PROGRESS" | "SUBMITTED" = !unlocked ? "LOCKED" : session ? (session.status as "IN_PROGRESS" | "SUBMITTED") : "IN_PROGRESS";
    if (status !== "SUBMITTED" && currentSlug === null) currentSlug = p.slug;
    if (status !== "SUBMITTED") unlocked = false; // next phase locks once we hit the first non-submitted one
    // Distinct from status "IN_PROGRESS": that also covers an unlocked phase
    // with no session yet. This tells the UI whether "Resume" or "Enter" is
    // the accurate label.
    return { phase: p, status, score: session?.score ?? null, hasSession: !!session };
  });

  const totalScore = rows.every((r) => r.status === "SUBMITTED")
    ? Math.round(rows.reduce((sum, r) => sum + (r.score ?? 0), 0) / rows.length)
    : null;

  return { caseTitle: phases[0].caseTitle, rows, currentSlug, complete: totalScore !== null, totalScore };
}

/**
 * Start or resume a session for one phase. One attempt per person per phase
 * — enforced by the unique constraint, not just refused in application
 * code, same reasoning as Operation Zero Hour's single attempt.
 *
 * Phase 2+ additionally requires the previous phase in the same case to be
 * SUBMITTED for this user — checked here, not just by the UI hiding the
 * button, since that's the boundary that actually matters.
 */
export async function startSession(
  userId: string,
  scenarioSlug: string,
): Promise<MissionResult<{ sessionId: string; resumed: boolean }>> {
  if (isClosed()) return fail("Mission Analyst has closed for this assignment window", 403);

  const scenario = await db.missionScenario.findUnique({ where: { slug: scenarioSlug } });
  if (!scenario || !scenario.published) return fail("Scenario not found", 404);

  if (scenario.phaseNumber > 1) {
    const previous = await db.missionScenario.findUnique({
      where: { caseSlug_phaseNumber: { caseSlug: scenario.caseSlug, phaseNumber: scenario.phaseNumber - 1 } },
    });
    if (previous) {
      const previousSession = await db.missionSession.findUnique({
        where: { userId_scenarioId: { userId, scenarioId: previous.id } },
      });
      if (!previousSession || previousSession.status !== "SUBMITTED") {
        return fail("Complete the previous phase first", 403);
      }
    }
  }

  const existing = await db.missionSession.findUnique({
    where: { userId_scenarioId: { userId, scenarioId: scenario.id } },
  });
  if (existing) return { success: true, data: { sessionId: existing.id, resumed: true } };

  // A second request racing this one (a double-click, a retried request)
  // can lose the findUnique-then-create gap above and hit the unique
  // constraint on create — that's not a real failure, it just means the
  // other request already made the session, so fetch and return that one
  // instead of surfacing a 500.
  try {
    const created = await db.missionSession.create({
      data: { userId, scenarioId: scenario.id },
      select: { id: true },
    });
    return { success: true, data: { sessionId: created.id, resumed: false } };
  } catch {
    const wonByRace = await db.missionSession.findUnique({
      where: { userId_scenarioId: { userId, scenarioId: scenario.id } },
    });
    if (wonByRace) return { success: true, data: { sessionId: wonByRace.id, resumed: true } };
    return fail("Could not start the investigation", 500);
  }
}

/**
 * Everything the client needs to render the room and the conclusion form:
 * object keys/kinds to place, the public suspect/classification lists, and
 * this player's own found log. Never labels, descriptions, or any answer.
 */
export async function getSessionState(userId: string, sessionId: string) {
  const session = await db.missionSession.findUnique({
    where: { id: sessionId },
    include: {
      scenario: { include: { evidence: { select: { key: true, kind: true } } } },
      found: { select: { evidenceKey: true, foundAt: true } },
    },
  });
  if (!session || session.userId !== userId) return null;

  // Only relevant once this phase is SUBMITTED, to route "Continue" vs
  // "Case complete" without a second round trip.
  let nextPhaseSlug: string | null = null;
  if (session.status === "SUBMITTED" && !session.scenario.isFinalPhase) {
    const next = await db.missionScenario.findUnique({
      where: { caseSlug_phaseNumber: { caseSlug: session.scenario.caseSlug, phaseNumber: session.scenario.phaseNumber + 1 } },
      select: { slug: true },
    });
    nextPhaseSlug = next?.slug ?? null;
  }

  return {
    sessionId: session.id,
    status: session.status,
    scenario: {
      slug: session.scenario.slug,
      title: session.scenario.title,
      briefing: session.scenario.briefing,
      objective: session.scenario.objective,
      environment: session.scenario.environment,
      suspects: session.scenario.suspects as { id: string; name: string; role: string }[],
      classifications: session.scenario.classifications as string[],
      caseTitle: session.scenario.caseTitle,
      phaseNumber: session.scenario.phaseNumber,
      phaseLabel: session.scenario.phaseLabel,
      isFinalPhase: session.scenario.isFinalPhase,
    },
    // Placement data only — no label/description until interacted with.
    objects: session.scenario.evidence.map((e) => ({ key: e.key, kind: e.kind })),
    found: session.found.map((f) => f.evidenceKey),
    // Only populated once SUBMITTED — see submitFindings.
    score: session.score,
    scoreBreakdown: session.scoreBreakdown,
    nextPhaseSlug,
  };
}

/**
 * Resolve one evidence object on interaction and log the discovery.
 *
 * Idempotent — re-examining something already found just returns the same
 * label/description again rather than erroring, since walking back up to an
 * object you've already opened is completely normal investigation behaviour.
 */
export async function examineEvidence(
  userId: string,
  sessionId: string,
  key: string,
): Promise<MissionResult<{ label: string; description: string; kind: string; firstDiscovery: boolean }>> {
  // Gated here too, not just in startSession — a session someone already
  // has open (reached without going through startSession again, e.g. a
  // direct/bookmarked URL to an in-progress investigation) must not stay
  // workable past the deadline just because it already existed.
  if (isClosed()) return fail("Mission Analyst has closed for this assignment window", 403);

  const session = await db.missionSession.findUnique({
    where: { id: sessionId },
    include: { scenario: true },
  });
  if (!session || session.userId !== userId) return fail("Session not found", 404);
  if (session.status !== "IN_PROGRESS") return fail("This investigation has already ended", 409);

  const evidence = await db.missionEvidence.findUnique({
    where: { scenarioId_key: { scenarioId: session.scenarioId, key } },
  });
  if (!evidence) return fail("Nothing here", 404);

  const existing = await db.missionEvidenceFound.findUnique({
    where: { sessionId_evidenceKey: { sessionId, evidenceKey: key } },
  });
  if (!existing) {
    await db.missionEvidenceFound.create({ data: { sessionId, evidenceKey: key } });
  }

  return {
    success: true,
    data: {
      label: evidence.label,
      description: evidence.description,
      kind: evidence.kind,
      firstDiscovery: !existing,
    },
  };
}

const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
type Severity = (typeof SEVERITY_ORDER)[number];

export type SubmitFindingsInput = {
  suspectId: string;
  classification: string;
  severity: Severity;
  evidenceKeys: string[];
  summary: string;
};

/**
 * Grade and lock in a conclusion for this phase. This is the actual
 * assessment — everything before it was gathering the material to make this
 * call correctly.
 *
 * Scoring (100 total per phase):
 *  - Responsible party: 30, all-or-nothing.
 *  - Classification: 25, all-or-nothing.
 *  - Severity: 15 exact, 7 if one tier off, 0 otherwise — a near-miss on
 *    severity is a real skill signal, unlike a near-miss on "who did it."
 *  - Supporting evidence: up to 30, scaled to however many critical items
 *    THIS phase actually has (30 / criticalCount per item cited), minus 5
 *    per non-critical item cited as if it supported the conclusion, floored
 *    at 0. Citing something irrelevant as support is graded, not just
 *    citing enough.
 *
 * Only evidence keys the player actually found can be cited — enforced here,
 * not just in the UI, since the UI's disabled state is not the boundary that
 * matters. A case's overall score is the average of its phases — see
 * getCaseProgress.
 */
export async function submitFindings(
  userId: string,
  sessionId: string,
  input: SubmitFindingsInput,
): Promise<MissionResult<{ score: number; breakdown: Record<string, number> }>> {
  if (isClosed()) return fail("Mission Analyst has closed for this assignment window", 403);

  const session = await db.missionSession.findUnique({
    where: { id: sessionId },
    include: { scenario: { include: { evidence: true } }, found: true },
  });
  if (!session || session.userId !== userId) return fail("Session not found", 404);
  if (session.status !== "IN_PROGRESS") return fail("This investigation has already ended", 409);
  if (!input.summary.trim()) return fail("An executive summary is required", 400);

  const foundKeys = new Set(session.found.map((f) => f.evidenceKey));
  // Dedupe first — citing the same real evidence key several times must
  // score the same as citing it once, not inflate the evidence component
  // past its intended cap (it did, before this: pointsPerCritical was
  // multiplied by a citedKeys.length that could double-count one key).
  const uniqueInputKeys = [...new Set(input.evidenceKeys)];
  const citedKeys = uniqueInputKeys.filter((k) => foundKeys.has(k));
  if (citedKeys.length !== uniqueInputKeys.length) {
    return fail("You can only cite evidence you actually found", 400);
  }

  const scenario = session.scenario;

  const suspectScore = input.suspectId === scenario.answerSuspectId ? 30 : 0;
  const classificationScore = input.classification === scenario.answerClassification ? 25 : 0;

  const answerTier = SEVERITY_ORDER.indexOf(scenario.answerSeverity as Severity);
  const givenTier = SEVERITY_ORDER.indexOf(input.severity);
  const tierGap = Math.abs(answerTier - givenTier);
  const severityScore = tierGap === 0 ? 15 : tierGap === 1 ? 7 : 0;

  const criticalKeys = new Set(scenario.evidence.filter((e) => e.isCritical).map((e) => e.key));
  const pointsPerCritical = criticalKeys.size > 0 ? 30 / criticalKeys.size : 0;
  const criticalCited = citedKeys.filter((k) => criticalKeys.has(k)).length;
  const nonCriticalCited = citedKeys.length - criticalCited;
  const evidenceScore = Math.min(30, Math.max(0, Math.round(criticalCited * pointsPerCritical - nonCriticalCited * 5)));

  const score = suspectScore + classificationScore + severityScore + evidenceScore;
  const breakdown = { suspect: suspectScore, classification: classificationScore, severity: severityScore, evidence: evidenceScore };

  await db.missionSession.update({
    where: { id: sessionId },
    data: {
      status: "SUBMITTED",
      endedAt: new Date(),
      submittedSuspectId: input.suspectId,
      submittedClassification: input.classification,
      submittedSeverity: input.severity,
      submittedEvidenceKeys: citedKeys,
      submittedSummary: input.summary.trim(),
      score,
      scoreBreakdown: breakdown,
    },
  });

  return { success: true, data: { score, breakdown } };
}

// ── Admin reporting ─────────────────────────────────────────────────────────
// The one place in this file allowed to read MissionScenario's answer*
// fields and put them next to a player's own submission. Route-gated to
// ADMIN only (see /admin/missions) — nothing here is safe to show a player.

export type AdminSessionRow = {
  sessionId: string;
  userId: string;
  userName: string;
  userEmail: string;
  caseSlug: string;
  caseTitle: string;
  phaseSlug: string;
  phaseNumber: number;
  phaseLabel: string;
  status: "IN_PROGRESS" | "SUBMITTED";
  score: number | null;
  breakdown: Record<string, number> | null;
  evidenceFoundCount: number;
  evidenceTotalCount: number;
  submitted: {
    suspectName: string | null;
    classification: string | null;
    severity: string | null;
    evidenceCited: string[]; // labels, not keys
    summary: string | null;
  } | null;
  answer: {
    suspectName: string;
    classification: string;
    severity: string;
    criticalEvidence: string[]; // labels
  };
};

/** Every session across every case/phase, with each player's submission set next to the answer key. */
export async function getAdminReport(): Promise<AdminSessionRow[]> {
  const sessions = await db.missionSession.findMany({
    include: {
      user: { select: { id: true, displayName: true, email: true } },
      scenario: { include: { evidence: true } },
      found: { select: { evidenceKey: true } },
    },
    orderBy: [{ scenario: { caseSlug: "asc" } }, { scenario: { phaseNumber: "asc" } }, { score: "desc" }],
  });

  return sessions.map((s) => {
    const suspects = s.scenario.suspects as { id: string; name: string; role: string }[];
    const evidenceByKey = new Map(s.scenario.evidence.map((e) => [e.key, e]));
    const nameFor = (id: string | null) => (id ? suspects.find((sp) => sp.id === id)?.name ?? id : null);

    return {
      sessionId: s.id,
      userId: s.user.id,
      userName: s.user.displayName || s.user.email.split("@")[0],
      userEmail: s.user.email,
      caseSlug: s.scenario.caseSlug,
      caseTitle: s.scenario.caseTitle,
      phaseSlug: s.scenario.slug,
      phaseNumber: s.scenario.phaseNumber,
      phaseLabel: s.scenario.phaseLabel,
      status: s.status,
      score: s.score,
      breakdown: s.scoreBreakdown as Record<string, number> | null,
      evidenceFoundCount: s.found.length,
      evidenceTotalCount: s.scenario.evidence.length,
      submitted: s.status === "SUBMITTED"
        ? {
            suspectName: nameFor(s.submittedSuspectId),
            classification: s.submittedClassification,
            severity: s.submittedSeverity,
            evidenceCited: s.submittedEvidenceKeys.map((k) => evidenceByKey.get(k)?.label ?? k),
            summary: s.submittedSummary,
          }
        : null,
      answer: {
        suspectName: nameFor(s.scenario.answerSuspectId) ?? s.scenario.answerSuspectId,
        classification: s.scenario.answerClassification,
        severity: s.scenario.answerSeverity,
        criticalEvidence: s.scenario.evidence.filter((e) => e.isCritical).map((e) => e.label),
      },
    };
  });
}

export type AdminUserRanking = {
  userId: string;
  userName: string;
  userEmail: string;
  casesCompleted: number;
  casesStarted: number;
  averageScore: number | null;
  totalScore: number;
};

/** One row per person who has touched Mission Analyst, for ranking. */
export async function getAdminRanking(): Promise<AdminUserRanking[]> {
  const rows = await getAdminReport();
  const byUser = new Map<string, AdminSessionRow[]>();
  for (const r of rows) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId)!.push(r);
  }

  const rankings: AdminUserRanking[] = [];
  for (const [userId, userRows] of byUser) {
    const byCase = new Map<string, AdminSessionRow[]>();
    for (const r of userRows) {
      if (!byCase.has(r.caseSlug)) byCase.set(r.caseSlug, []);
      byCase.get(r.caseSlug)!.push(r);
    }
    let casesCompleted = 0;
    let totalScore = 0;
    for (const caseRows of byCase.values()) {
      if (caseRows.every((r) => r.status === "SUBMITTED")) {
        casesCompleted++;
        totalScore += Math.round(caseRows.reduce((sum, r) => sum + (r.score ?? 0), 0) / caseRows.length);
      }
    }
    rankings.push({
      userId,
      userName: userRows[0].userName,
      userEmail: userRows[0].userEmail,
      casesStarted: byCase.size,
      casesCompleted,
      totalScore,
      averageScore: casesCompleted > 0 ? Math.round(totalScore / casesCompleted) : null,
    });
  }

  return rankings.sort((a, b) => (b.averageScore ?? -1) - (a.averageScore ?? -1) || b.casesCompleted - a.casesCompleted);
}
