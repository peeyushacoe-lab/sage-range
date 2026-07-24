import { db } from "@/lib/db";
import { computeMitreCoverage } from "@/lib/insights/mitre";

export type TranscriptData = {
  displayName: string;
  email: string;
  issuedAt: Date;
  verificationId: string;
  certificateNo: string;

  pathsCompleted: { title: string; slug: string; completedAt: Date }[];
  bossFightsPassed: { title: string; slug: string; difficulty: string; score: number }[];
  competitionPlacements: { name: string; slug: string; rank: number; totalEntrants: number; score: number }[];
  coveredDomains: string[];

  // The path this certificate headlines — most recently completed, if any.
  primaryPath: { title: string; slug: string } | null;
  primaryCapstone: { slug: string; title: string } | null;

  labsSolved: number;
  hoursTrained: number;
  mitreCoveragePct: number;
  mitreTacticsCovered: number;
  mitreTacticsTotal: number;
  overallRating: "EXCEPTIONAL" | "STRONG" | "ADEQUATE" | "DEVELOPING";
};

// One place that pulls together everything a "this person is job-ready"
// transcript needs to claim, from data that already exists across Labs,
// Boss Fight incident sims, Learning Paths, and Competitions — no new
// schema beyond the verification-id derivation below.
export async function buildTranscript(userId: string): Promise<TranscriptData | null> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  const [attempts, pathProgress, simProgress, sims, competitionEntries, coverage] = await Promise.all([
    db.attempt.findMany({ where: { userId, status: "SOLVED" }, include: { lab: { select: { category: true } } } }),
    db.userPathProgress.findMany({
      where: { userId, completedAt: { not: null } },
      include: { path: { select: { title: true, slug: true, capstoneSimulationSlug: true } } },
      orderBy: { completedAt: "desc" },
    }),
    db.incidentSimProgress.findMany({ where: { userId }, select: { simulationId: true } }),
    db.incidentSimulation.findMany({ select: { id: true, slug: true, title: true, difficulty: true, points: true, estimatedMinutes: true } }),
    db.competitionEntry.findMany({ where: { userId }, include: { competition: { select: { name: true, slug: true } } } }),
    computeMitreCoverage(userId),
  ]);

  // A "boss fight passed" = every task for that simulation shows up in this
  // user's IncidentSimProgress — same completion rule the incident player
  // itself uses to unlock Evidence Board / Report Builder.
  const taskCountBySim = new Map<string, number>();
  for (const sim of sims) {
    const count = await db.incidentSimTask.count({ where: { simulationId: sim.id } });
    taskCountBySim.set(sim.id, count);
  }
  const completedCountBySim = new Map<string, number>();
  for (const p of simProgress) {
    completedCountBySim.set(p.simulationId, (completedCountBySim.get(p.simulationId) ?? 0) + 1);
  }
  const bossFightsPassed = sims
    .filter((sim) => {
      const total = taskCountBySim.get(sim.id) ?? 0;
      const done = completedCountBySim.get(sim.id) ?? 0;
      return total > 0 && done >= total;
    })
    .map((sim) => ({ title: sim.title, slug: sim.slug, difficulty: sim.difficulty, score: sim.points }));

  // Competition rank: where this user's score lands among all entrants —
  // computed on demand rather than stored, since ranks shift as the
  // competition is still running.
  const competitionPlacements: TranscriptData["competitionPlacements"] = [];
  for (const entry of competitionEntries) {
    const allEntries = await db.competitionEntry.findMany({
      where: { competitionId: entry.competitionId },
      orderBy: { score: "desc" },
      select: { userId: true },
    });
    const rank = allEntries.findIndex((e) => e.userId === userId) + 1;
    if (rank > 0) {
      competitionPlacements.push({
        name: entry.competition.name,
        slug: entry.competition.slug,
        rank,
        totalEntrants: allEntries.length,
        score: entry.score,
      });
    }
  }

  // Hours trained: lab time-on-task + a flat estimate per completed Boss
  // Fight (labs track exact seconds; incident sims don't track wall-clock
  // time yet, so their authored estimatedMinutes stands in).
  const labSeconds = attempts.reduce((sum, a) => sum + (a.timeTakenSec ?? 0), 0);
  const simMinutes = sims
    .filter((sim) => bossFightsPassed.some((b) => b.slug === sim.slug))
    .reduce((sum, sim) => sum + sim.estimatedMinutes, 0);
  const hoursTrained = Math.round(((labSeconds / 3600) + (simMinutes / 60)) * 10) / 10;

  const totalPoints = user.skillScore;
  const overallRating: TranscriptData["overallRating"] =
    totalPoints >= 8000 ? "EXCEPTIONAL" : totalPoints >= 4000 ? "STRONG" : totalPoints >= 1500 ? "ADEQUATE" : "DEVELOPING";

  // Headline path = most recently completed one (pathProgress is already
  // ordered completedAt desc). Its capstone sim (if any) drives the
  // "Capstone Assessment" line on the certificate.
  const headline = pathProgress[0] ?? null;
  const primaryPath = headline ? { title: headline.path.title, slug: headline.path.slug } : null;
  let primaryCapstone: TranscriptData["primaryCapstone"] = null;
  if (headline?.path.capstoneSimulationSlug) {
    const capSim = sims.find((s) => s.slug === headline.path.capstoneSimulationSlug);
    if (capSim) primaryCapstone = { slug: capSim.slug, title: capSim.title };
  }

  // Covered domains: distinct Lab categories this student has actually
  // solved, e.g. "Blue Team", "Red Team", "Cloud Security" — a plain-
  // language skills checklist for the certificate sidebar.
  const coveredDomains = [...new Set(attempts.map((a) => a.lab.category).filter(Boolean))]
    .slice(0, 6)
    .map((c) => c.replace(/[_-]/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()));

  // Deterministic per-user certificate number (not a true global sequence —
  // that would need its own counter table — but stable and unique per user).
  const numericSeed = parseInt(userId.replace(/[^0-9]/g, "").slice(-6) || "0", 10) || userId.length * 7919;
  const certificateNo = `CSV-${new Date().getFullYear()}-${(numericSeed % 900000 + 100000).toString()}`;

  return {
    displayName: user.displayName ?? user.email.split("@")[0],
    email: user.email,
    issuedAt: new Date(),
    verificationId: `SV-${userId.slice(-4).toUpperCase()}-${totalPoints.toString(36).toUpperCase()}`,
    certificateNo,

    pathsCompleted: pathProgress.map((p) => ({ title: p.path.title, slug: p.path.slug, completedAt: p.completedAt! })),
    bossFightsPassed,
    competitionPlacements,
    coveredDomains,
    primaryPath,
    primaryCapstone,

    labsSolved: attempts.length,
    hoursTrained,
    mitreCoveragePct: coverage.coveragePct,
    mitreTacticsCovered: coverage.tacticsCovered,
    mitreTacticsTotal: 14,
    overallRating,
  };
}
