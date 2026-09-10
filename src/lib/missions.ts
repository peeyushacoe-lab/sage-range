/**
 * Mission Analyst — server logic.
 *
 * V1 foundation. One scenario, one room, no NPCs/CCTV/decision points yet.
 * What exists here is deliberately small but real: a session lifecycle, an
 * evidence-discovery log, and a graded conclusion step — all
 * server-authoritative.
 *
 * The rule that matters most and that everything else is built to protect:
 * the client never receives evidence.description, evidence.isCritical, or
 * any of MissionScenario's answer* fields up front. It gets a scenario's
 * environment key, the list of interactable object keys to place, and the
 * public suspect/classification option lists — meaningless or
 * multiple-choice on their own — and only learns what an object actually is
 * by asking the server to resolve one `key` at a time, the moment the player
 * interacts with it. Grading likewise only ever happens server-side, in
 * submitFindings, against fields no client-facing query ever selects.
 */

import { db } from "@/lib/db";

export type MissionResult<T> = { success: true; data: T } | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): MissionResult<never> => ({ success: false, error, statusCode });

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
} as const;

export async function getScenario(slug: string) {
  return db.missionScenario.findUnique({ where: { slug }, select: PUBLIC_SCENARIO_SELECT });
}

export async function listPublishedScenarios() {
  return db.missionScenario.findMany({
    where: { published: true },
    orderBy: { createdAt: "asc" },
    select: PUBLIC_SCENARIO_SELECT,
  });
}

/**
 * Start or resume a session. One attempt per person per scenario — enforced
 * by the unique constraint, not just refused in application code, same
 * reasoning as Operation Zero Hour's single attempt.
 */
export async function startSession(
  userId: string,
  scenarioSlug: string,
): Promise<MissionResult<{ sessionId: string; resumed: boolean }>> {
  const scenario = await db.missionScenario.findUnique({ where: { slug: scenarioSlug }, select: { id: true, published: true } });
  if (!scenario || !scenario.published) return fail("Scenario not found", 404);

  const existing = await db.missionSession.findUnique({
    where: { userId_scenarioId: { userId, scenarioId: scenario.id } },
  });
  if (existing) return { success: true, data: { sessionId: existing.id, resumed: true } };

  const created = await db.missionSession.create({
    data: { userId, scenarioId: scenario.id },
    select: { id: true },
  });
  return { success: true, data: { sessionId: created.id, resumed: false } };
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
    },
    // Placement data only — no label/description until interacted with.
    objects: session.scenario.evidence.map((e) => ({ key: e.key, kind: e.kind })),
    found: session.found.map((f) => f.evidenceKey),
    // Only populated once SUBMITTED — see submitFindings.
    score: session.score,
    scoreBreakdown: session.scoreBreakdown,
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
 * Grade and lock in a conclusion. This is the actual assessment — everything
 * before it was gathering the material to make this call correctly.
 *
 * Scoring (100 total):
 *  - Responsible party: 30, all-or-nothing.
 *  - Classification: 25, all-or-nothing.
 *  - Severity: 15 exact, 7 if one tier off, 0 otherwise — a near-miss on
 *    severity is a real skill signal, unlike a near-miss on "who did it."
 *  - Supporting evidence: up to 30, +7.5 per correct critical item cited
 *    (max 4 for this scenario), -5 per non-critical item cited as if it
 *    supported the conclusion, floored at 0 for this component. Citing
 *    something irrelevant as support is graded, not just citing enough.
 *
 * Only evidence keys the player actually found can be cited — enforced here,
 * not just in the UI, since the UI's disabled state is not the boundary that
 * matters.
 */
export async function submitFindings(
  userId: string,
  sessionId: string,
  input: SubmitFindingsInput,
): Promise<MissionResult<{ score: number; breakdown: Record<string, number> }>> {
  const session = await db.missionSession.findUnique({
    where: { id: sessionId },
    include: { scenario: { include: { evidence: true } }, found: true },
  });
  if (!session || session.userId !== userId) return fail("Session not found", 404);
  if (session.status !== "IN_PROGRESS") return fail("This investigation has already ended", 409);
  if (!input.summary.trim()) return fail("An executive summary is required", 400);

  const foundKeys = new Set(session.found.map((f) => f.evidenceKey));
  const citedKeys = input.evidenceKeys.filter((k) => foundKeys.has(k));
  if (citedKeys.length !== input.evidenceKeys.length) {
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
  const criticalCited = citedKeys.filter((k) => criticalKeys.has(k)).length;
  const nonCriticalCited = citedKeys.length - criticalCited;
  const evidenceScore = Math.max(0, Math.round(criticalCited * 7.5 - nonCriticalCited * 5));

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
