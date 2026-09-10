/**
 * Mission Analyst — server logic.
 *
 * V1 foundation only. One scenario, one room, no NPCs/CCTV/decision points/
 * scoring yet. What exists here is deliberately small but real: a session
 * lifecycle and an evidence-discovery log, both server-authoritative.
 *
 * The rule that matters most and that everything else is built to protect:
 * the 3D client never receives evidence.description or evidence.isCritical
 * up front. It gets a scenario's environment key and the list of interactable
 * object keys to place — meaningless strings on their own — and only learns
 * what an object actually is by asking the server to resolve one `key` at a
 * time, the moment the player interacts with it. That's what stops a player
 * from reading the answer out of the page source.
 */

import { db } from "@/lib/db";

export type MissionResult<T> = { success: true; data: T } | { success: false; error: string; statusCode: number };

const fail = (error: string, statusCode: number): MissionResult<never> => ({ success: false, error, statusCode });

export async function getScenario(slug: string) {
  return db.missionScenario.findUnique({ where: { slug } });
}

export async function listPublishedScenarios() {
  return db.missionScenario.findMany({ where: { published: true }, orderBy: { createdAt: "asc" } });
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
  const scenario = await db.missionScenario.findUnique({ where: { slug: scenarioSlug } });
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
 * Everything the 3D client needs to render the room and know what's
 * interactable — object keys and kinds, never labels or descriptions.
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
    },
    // Placement data only — no label/description until interacted with.
    objects: session.scenario.evidence.map((e) => ({ key: e.key, kind: e.kind })),
    found: session.found.map((f) => f.evidenceKey),
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
