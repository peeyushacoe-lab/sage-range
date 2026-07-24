import { db } from "@/lib/db";

/**
 * Returns true if `userId` may read/act on a SimulationSession: either they
 * are the session owner (solo play, or the IR_LEAD who launched a team
 * session), or they are a TeamMember of the TeamSession linked to it
 * ("Capture the Company" team play — see prisma schema TeamSession.sessionId).
 *
 * Kept as a single shared check so the GET (poll) route and the POST
 * (action) route can never drift out of sync on who's allowed in.
 */
export async function userCanAccessSession(userId: string, session: { id: string; userId: string }) {
  if (session.userId === userId) return true;
  const membership = await db.teamMember.findFirst({
    where: { userId, teamSession: { sessionId: session.id } },
    select: { id: true },
  });
  return !!membership;
}

/**
 * Who should receive completion rewards (XP/skillScore/certificate/notification)
 * when a SimulationSession ends. For solo play this is just the owner. For a
 * team session (linked via TeamSession.sessionId) it's every team member —
 * otherwise only whichever teammate's browser happened to poll or submit the
 * winning action would get credit, which isn't how a shared team outcome
 * should work.
 */
export async function getSessionRewardRecipients(sessionId: string, fallbackUserId: string) {
  const teamSession = await db.teamSession.findUnique({
    where: { sessionId },
    include: { members: { include: { user: { select: { id: true, email: true, displayName: true, role: true } } } } },
  });
  if (teamSession && teamSession.members.length > 0) {
    return teamSession.members.map((m) => m.user);
  }
  const fallback = await db.user.findUnique({
    where: { id: fallbackUserId },
    select: { id: true, email: true, displayName: true, role: true },
  });
  return fallback ? [fallback] : [];
}
