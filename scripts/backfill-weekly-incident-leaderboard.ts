// Backfills WeeklyIncidentLeaderboard for real completions that predate
// updateWeeklyLeaderboardEntry ever being wired into the submission routes —
// 197 submitted reports and 233 evidence boards existed against 0 leaderboard
// rows across all 34 weekly cases.
//
// IncidentSimReport/IncidentSimEvidenceBoard are keyed only by (user,
// simulation) — there is no week dimension, and the same incident slug is
// reused across multiple weekly cases (fin-2026-004-ransomware was the
// featured case for both week 1 and week 31). A report only counts toward
// the ONE specific week whose live window (releaseTime..deadlineTime)
// actually contains its submittedAt/completedAt timestamp — matching by
// slug alone would fan a single real submission out across every week that
// happens to share that slug, fabricating completions for weeks the person
// never engaged with live.
//
// Only published cases are considered: an unpublished case was never
// actually reachable via getCurrentWeeklyCase(), so nothing done against
// its slug outside another case's window could honestly count as
// completing it.
//
// Idempotent (upserts on caseId+userId). Run:
//   npx tsx scripts/backfill-weekly-incident-leaderboard.ts

// Not imported from src/lib/weekly-incidents.ts: getCurrentWeeklyCase there
// is wrapped in React's cache(), which throws outside a Next.js request
// context. The two finalization steps below are reproduced directly from
// computeWeeklyLeaderboardRanks/issueWeeklyCertificates for that reason.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function computeRanks(caseId: string): Promise<number> {
  const entries = await db.weeklyIncidentLeaderboard.findMany({
    where: { caseId, completedAt: { not: null } },
    orderBy: [{ score: "desc" }, { timeTakenMin: "asc" }],
  });
  for (let i = 0; i < entries.length; i++) {
    await db.weeklyIncidentLeaderboard.update({
      where: { id: entries[i].id },
      data: { rank: i + 1, rankUpdatedAt: new Date() },
    });
  }
  return entries.length;
}

async function issueCertificate(caseId: string): Promise<number> {
  const c = await db.weeklyIncidentCase.findUnique({ where: { id: caseId } });
  if (!c) return 0;
  const existing = await db.weeklyIncidentCertificate.findUnique({ where: { caseId } });
  if (existing) return 0;

  const completers = await db.weeklyIncidentLeaderboard.count({
    where: { caseId, completedAt: { not: null, lte: c.deadlineTime } },
  });
  if (completers === 0) return 0;

  const certCode = `WIC-${c.season}-W${String(c.weekNumber).padStart(2, "0")}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  await db.weeklyIncidentCertificate.create({
    data: { caseId, season: c.season, weekNumber: c.weekNumber, certCode },
  });
  return completers;
}

function inWindow(t: Date, start: Date, end: Date): boolean {
  return t >= start && t <= end;
}

async function main() {
  const cases = await db.weeklyIncidentCase.findMany({ where: { published: true }, orderBy: { weekStartUTC: "asc" } });
  console.log(`Checking ${cases.length} published weekly cases...\n`);

  const touchedCaseIds = new Set<string>();
  let written = 0;

  for (const c of cases) {
    const sim = await db.incidentSimulation.findUnique({ where: { slug: c.incidentSlug }, select: { id: true } });
    if (!sim) continue;

    const [reports, boards] = await Promise.all([
      db.incidentSimReport.findMany({
        where: { simulationId: sim.id, submittedAt: { not: null } },
        select: { userId: true, submittedAt: true },
      }),
      db.incidentSimEvidenceBoard.findMany({
        where: { simulationId: sim.id },
        select: { userId: true, completedAt: true, score: true },
      }),
    ]);

    const boardByUser = new Map(boards.map((b) => [b.userId, b]));

    // A completion this week requires a report submitted inside this case's
    // live window — the report is what marks completion, same rule as the
    // live route. A board done in-window without a matching report just
    // contributes its score, same as the live route's partial-progress case.
    const reportsInWindow = reports.filter((r) => r.submittedAt && inWindow(r.submittedAt, c.releaseTime, c.deadlineTime));
    const boardsInWindow = boards.filter((b) => b.completedAt && inWindow(b.completedAt, c.releaseTime, c.deadlineTime));

    if (reportsInWindow.length === 0 && boardsInWindow.length === 0) continue;

    console.log(`W${c.weekNumber} (${c.incidentSlug}): ${reportsInWindow.length} in-window reports, ${boardsInWindow.length} in-window boards`);

    const userIds = new Set([...reportsInWindow.map((r) => r.userId), ...boardsInWindow.map((b) => b.userId)]);
    for (const userId of userIds) {
      const report = reportsInWindow.find((r) => r.userId === userId);
      const board = boardByUser.get(userId);
      const evidenceBoardScore = board?.score ?? 0;
      // REPORT_COMPLETION_BONUS in src/app/api/incidents/report/route.ts — a flat
      // award for STUDENT role, mirrored here rather than re-deriving from the
      // (unrecorded) actual role-gated award, since these are all real completions.
      const reportScore = report ? 250 : 0;

      await db.weeklyIncidentLeaderboard.upsert({
        where: { caseId_userId: { caseId: c.id, userId } },
        create: {
          caseId: c.id, userId,
          completedAt: report ? report.submittedAt : null,
          timeTakenMin: report?.submittedAt
            ? Math.max(0, Math.round((report.submittedAt.getTime() - c.releaseTime.getTime()) / 60000))
            : null,
          evidenceBoardScore, reportScore, score: evidenceBoardScore + reportScore,
        },
        update: {
          completedAt: report ? report.submittedAt : null,
          timeTakenMin: report?.submittedAt
            ? Math.max(0, Math.round((report.submittedAt.getTime() - c.releaseTime.getTime()) / 60000))
            : null,
          evidenceBoardScore, reportScore, score: evidenceBoardScore + reportScore,
        },
      });
      written++;
    }
    touchedCaseIds.add(c.id);
  }

  console.log(`\n${written} leaderboard rows backfilled across ${touchedCaseIds.size} weeks.`);

  for (const caseId of touchedCaseIds) {
    const ranked = await computeRanks(caseId);
    const completers = await issueCertificate(caseId);
    console.log(`Case ${caseId}: ranked ${ranked}, certificate issued for ${completers} completer(s)`);
  }

  process.exit(0);
}

main();
