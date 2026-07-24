import { db } from "@/lib/db";

// Cohort-wide instructor analytics — everything Sage Vault can currently
// answer about "are students actually improving" without adding new
// tracking beyond what this pass already wired up (IncidentHintView, and
// audit-on-failure logging in labs/submit + incidents/submit).
//
// Kept as plain aggregation queries rather than a cached/materialized view —
// this is an admin-only dashboard, not a hot path, so recomputing per
// request is the simpler and safer choice for now.

export type LabStat = {
  slug: string; title: string; difficulty: string;
  attempts: number; solved: number;
  meanTimeToCompleteSec: number | null;
  firstAttemptSuccessRate: number | null;
  hintUsageRate: number | null;
};

export type BossFightStat = {
  slug: string; title: string; difficulty: string;
  studentsStarted: number; studentsCompleted: number;
  completionRate: number;
  meanTimeToCompleteMin: number | null;
  firstAttemptSuccessRate: number | null;
  hintUsageRate: number | null;
};

export type PathStat = {
  slug: string; title: string;
  enrolled: number; completed: number; completionRate: number;
  capstoneSlug: string | null; capstonePassRate: number | null;
};

export type WeeklyTrend = { weekStart: string; submissions: number; successRate: number };

export type InstructorAnalytics = {
  labStats: LabStat[];
  bossFightStats: BossFightStat[];
  pathStats: PathStat[];
  mitreGapsCohort: { tactic: string; studentsWithCoverage: number; totalStudents: number; coveragePct: number }[];
  weeklyTrend: WeeklyTrend[];
  totals: { students: number; labAttempts: number; bossFightsCompleted: number; avgMitreCoveragePct: number };
};

function pct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

async function computeLabStats(): Promise<LabStat[]> {
  const labs = await db.lab.findMany({
    where: { published: true },
    select: { id: true, slug: true, title: true, difficulty: true },
  });

  const [attempts, hintUsers] = await Promise.all([
    db.attempt.findMany({ select: { labId: true, status: true, timeTakenSec: true } }),
    db.usedHint.findMany({ select: { userId: true, hint: { select: { labId: true } } } }),
  ]);

  // First-attempt success: for each (user, lab) pair, was the very first
  // FLAG_SUBMIT audit entry already correct? Built off the audit trail
  // (target = labSlug), which now logs both hits and misses.
  const flagLogs = await db.auditLog.findMany({
    where: { action: "FLAG_SUBMIT" },
    select: { actorId: true, target: true, meta: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const firstAttemptByUserLab = new Map<string, boolean>();
  for (const log of flagLogs) {
    if (!log.actorId || !log.target) continue;
    const key = `${log.actorId}:${log.target}`;
    if (!firstAttemptByUserLab.has(key)) {
      const correct = (log.meta as { correct?: boolean } | null)?.correct === true;
      firstAttemptByUserLab.set(key, correct);
    }
  }

  return labs.map((lab) => {
    const labAttempts = attempts.filter((a) => a.labId === lab.id);
    const solved = labAttempts.filter((a) => a.status === "SOLVED");
    const times = solved.map((a) => a.timeTakenSec).filter((t): t is number => t != null && t > 0);
    const meanTimeToCompleteSec = times.length ? Math.round(times.reduce((s, t) => s + t, 0) / times.length) : null;

    const firstAttempts = [...firstAttemptByUserLab.entries()].filter(([k]) => k.endsWith(`:${lab.slug}`));
    const firstAttemptSuccessRate = firstAttempts.length
      ? pct(firstAttempts.filter(([, correct]) => correct).length, firstAttempts.length)
      : null;

    const hintUsers2 = new Set(hintUsers.filter((h) => h.hint.labId === lab.id).map((h) => h.userId));
    const hintUsageRate = labAttempts.length ? pct(hintUsers2.size, labAttempts.length) : null;

    return {
      slug: lab.slug, title: lab.title, difficulty: lab.difficulty,
      attempts: labAttempts.length, solved: solved.length,
      meanTimeToCompleteSec, firstAttemptSuccessRate, hintUsageRate,
    };
  });
}

async function computeBossFightStats(): Promise<BossFightStat[]> {
  const sims = await db.incidentSimulation.findMany({
    where: { published: true },
    select: { id: true, slug: true, title: true, difficulty: true, estimatedMinutes: true },
  });

  const [progress, taskCounts, hintViews, taskLogs] = await Promise.all([
    db.incidentSimProgress.findMany({ select: { userId: true, simulationId: true, completedAt: true } }),
    db.incidentSimTask.groupBy({ by: ["simulationId"], _count: { id: true } }),
    db.incidentHintView.findMany({ select: { userId: true, hint: { select: { task: { select: { simulationId: true } } } } } }),
    db.auditLog.findMany({
      where: { action: "INCIDENT_TASK_SUBMIT" },
      select: { actorId: true, target: true, meta: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const taskCountBySim = new Map(taskCounts.map((t) => [t.simulationId, t._count.id]));

  const firstAttemptByUserTask = new Map<string, boolean>();
  for (const log of taskLogs) {
    if (!log.actorId || !log.target) continue;
    const key = `${log.actorId}:${log.target}`;
    if (!firstAttemptByUserTask.has(key)) {
      const correct = (log.meta as { correct?: boolean } | null)?.correct === true;
      firstAttemptByUserTask.set(key, correct);
    }
  }
  // Roll task-level first-attempt data up to sim-level via meta.simulationId
  const simIdByTaskLog = new Map<string, string>();
  for (const log of taskLogs) {
    const simId = (log.meta as { simulationId?: string } | null)?.simulationId;
    if (log.target && simId) simIdByTaskLog.set(log.target, simId);
  }

  return sims.map((sim) => {
    const simProgress = progress.filter((p) => p.simulationId === sim.id);
    const byUser = new Map<string, { first: Date; last: Date; count: number }>();
    for (const p of simProgress) {
      const existing = byUser.get(p.userId);
      if (!existing) {
        byUser.set(p.userId, { first: p.completedAt, last: p.completedAt, count: 1 });
      } else {
        existing.count++;
        if (p.completedAt < existing.first) existing.first = p.completedAt;
        if (p.completedAt > existing.last) existing.last = p.completedAt;
      }
    }
    const totalTasks = taskCountBySim.get(sim.id) ?? 0;
    const studentsStarted = byUser.size;
    const completedUsers = [...byUser.entries()].filter(([, v]) => totalTasks > 0 && v.count >= totalTasks);
    const studentsCompleted = completedUsers.length;

    const durations = completedUsers
      .map(([, v]) => (v.last.getTime() - v.first.getTime()) / 60000)
      .filter((m) => m > 0);
    const meanTimeToCompleteMin = durations.length
      ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
      : null;

    const relevantTaskKeys = [...simIdByTaskLog.entries()].filter(([, simId]) => simId === sim.id).map(([target]) => target);
    const firstAttempts = [...firstAttemptByUserTask.entries()].filter(([k]) => relevantTaskKeys.some((t) => k.endsWith(`:${t}`)));
    const firstAttemptSuccessRate = firstAttempts.length
      ? pct(firstAttempts.filter(([, c]) => c).length, firstAttempts.length)
      : null;

    const hintUserSet = new Set(
      hintViews.filter((h) => h.hint.task.simulationId === sim.id).map((h) => h.userId)
    );
    const hintUsageRate = studentsStarted ? pct(hintUserSet.size, studentsStarted) : null;

    return {
      slug: sim.slug, title: sim.title, difficulty: sim.difficulty,
      studentsStarted, studentsCompleted,
      completionRate: pct(studentsCompleted, studentsStarted) ?? 0,
      meanTimeToCompleteMin, firstAttemptSuccessRate, hintUsageRate,
    };
  });
}

async function computePathStats(): Promise<PathStat[]> {
  const paths = await db.learningPath.findMany({
    where: { published: true },
    select: { slug: true, title: true, capstoneSimulationSlug: true },
  });

  const progress = await db.userPathProgress.findMany({
    select: { pathId: true, completedAt: true, path: { select: { slug: true } } },
  });

  const results: PathStat[] = [];
  for (const path of paths) {
    const rows = progress.filter((p) => p.path.slug === path.slug);
    const enrolled = rows.length;
    const completed = rows.filter((r) => r.completedAt).length;

    let capstonePassRate: number | null = null;
    if (path.capstoneSimulationSlug) {
      const capstone = await db.incidentSimulation.findUnique({
        where: { slug: path.capstoneSimulationSlug },
        select: { id: true, tasks: { select: { id: true } } },
      });
      if (capstone && capstone.tasks.length > 0) {
        // Among users enrolled in this path, how many
        // have completed every task of the capstone sim.
        const enrolledUsers = await db.userPathProgress.findMany({
          where: { path: { slug: path.slug } },
          select: { userId: true },
        });
        const taskIds = new Set(capstone.tasks.map((t) => t.id));
        const capstoneProgress = await db.incidentSimProgress.findMany({
          where: { userId: { in: enrolledUsers.map((u) => u.userId) }, simulationId: capstone.id },
          select: { userId: true, taskId: true },
        });
        const doneCountByUser = new Map<string, number>();
        for (const cp of capstoneProgress) {
          if (!taskIds.has(cp.taskId)) continue;
          doneCountByUser.set(cp.userId, (doneCountByUser.get(cp.userId) ?? 0) + 1);
        }
        const passers = [...doneCountByUser.values()].filter((n) => n >= taskIds.size).length;
        capstonePassRate = pct(passers, enrolledUsers.length);
      }
    }

    results.push({
      slug: path.slug, title: path.title,
      enrolled, completed, completionRate: pct(completed, enrolled) ?? 0,
      capstoneSlug: path.capstoneSimulationSlug, capstonePassRate,
    });
  }
  return results;
}

const TACTIC_LABELS: Record<string, string> = {
  INITIAL_ACCESS: "Initial Access", PERSISTENCE: "Persistence", PRIVILEGE_ESCALATION: "Privilege Escalation",
  LATERAL_MOVEMENT: "Lateral Movement", COMMAND_AND_CONTROL: "Command and Control",
  EXFILTRATION: "Exfiltration", IMPACT: "Impact",
};

async function computeMitreGapsCohort() {
  const students = await db.user.findMany({ where: { role: "STUDENT" }, select: { id: true } });
  const totalStudents = students.length;
  if (totalStudents === 0) return [];

  // A student "covers" a tactic if they've completed at least one artifact
  // tagged with that tactic via Evidence Board categorization data — we
  // approximate using completed Boss Fight tasks whose simulation has an
  // artifact tagged with that tactic (artifact-level MITRE tagging already
  // exists; task-level doesn't, so this is a simulation-wide proxy).
  const artifactsWithTactic = await db.incidentSimArtifact.findMany({
    where: { tactic: { not: null } },
    select: { simulationId: true, tactic: true },
  });
  const tacticsBySim = new Map<string, Set<string>>();
  for (const a of artifactsWithTactic) {
    if (!a.tactic) continue;
    if (!tacticsBySim.has(a.simulationId)) tacticsBySim.set(a.simulationId, new Set());
    tacticsBySim.get(a.simulationId)!.add(a.tactic);
  }

  const completedSimsByUser = await db.incidentSimProgress.findMany({
    select: { userId: true, simulationId: true },
    distinct: ["userId", "simulationId"],
  });

  const tacticStudentSets = new Map<string, Set<string>>();
  for (const row of completedSimsByUser) {
    const tactics = tacticsBySim.get(row.simulationId);
    if (!tactics) continue;
    for (const tactic of tactics) {
      if (!tacticStudentSets.has(tactic)) tacticStudentSets.set(tactic, new Set());
      tacticStudentSets.get(tactic)!.add(row.userId);
    }
  }

  return Object.keys(TACTIC_LABELS).map((tactic) => {
    const students2 = tacticStudentSets.get(tactic)?.size ?? 0;
    return {
      tactic: TACTIC_LABELS[tactic],
      studentsWithCoverage: students2,
      totalStudents,
      coveragePct: pct(students2, totalStudents) ?? 0,
    };
  }).sort((a, b) => a.coveragePct - b.coveragePct);
}

async function computeWeeklyTrend(): Promise<WeeklyTrend[]> {
  const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000);
  const logs = await db.auditLog.findMany({
    where: { action: { in: ["FLAG_SUBMIT", "INCIDENT_TASK_SUBMIT"] }, createdAt: { gte: since } },
    select: { createdAt: true, meta: true },
  });

  const buckets = new Map<string, { total: number; correct: number }>();
  for (const log of logs) {
    const d = new Date(log.createdAt);
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - d.getUTCDay());
    weekStart.setUTCHours(0, 0, 0, 0);
    const key = weekStart.toISOString().slice(0, 10);
    if (!buckets.has(key)) buckets.set(key, { total: 0, correct: 0 });
    const b = buckets.get(key)!;
    b.total++;
    if ((log.meta as { correct?: boolean } | null)?.correct) b.correct++;
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, { total, correct }]) => ({
      weekStart, submissions: total, successRate: pct(correct, total) ?? 0,
    }));
}

export async function buildInstructorAnalytics(): Promise<InstructorAnalytics> {
  const [labStats, bossFightStats, pathStats, mitreGapsCohort, weeklyTrend, studentCount] = await Promise.all([
    computeLabStats(),
    computeBossFightStats(),
    computePathStats(),
    computeMitreGapsCohort(),
    computeWeeklyTrend(),
    db.user.count({ where: { role: "STUDENT" } }),
  ]);

  const labAttempts = labStats.reduce((s, l) => s + l.attempts, 0);
  const bossFightsCompleted = bossFightStats.reduce((s, b) => s + b.studentsCompleted, 0);
  const avgMitreCoveragePct = mitreGapsCohort.length
    ? Math.round(mitreGapsCohort.reduce((s, m) => s + m.coveragePct, 0) / mitreGapsCohort.length)
    : 0;

  return {
    labStats: labStats.sort((a, b) => (a.firstAttemptSuccessRate ?? 100) - (b.firstAttemptSuccessRate ?? 100)),
    bossFightStats: bossFightStats.sort((a, b) => a.completionRate - b.completionRate),
    pathStats,
    mitreGapsCohort,
    weeklyTrend,
    totals: { students: studentCount, labAttempts, bossFightsCompleted, avgMitreCoveragePct },
  };
}
