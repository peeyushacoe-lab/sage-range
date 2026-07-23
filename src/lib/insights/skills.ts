import { db } from "@/lib/db";

const DIFF_PTS: Record<string, number> = { EASY: 8, MEDIUM: 20, HARD: 42, INSANE: 70 };

const FAST_THRESHOLDS: Record<string, number> = {
  EASY: 1800, MEDIUM: 3600, HARD: 7200, INSANE: 14400,
};

export type SkillDimension = { label: string; score: number; color: string; note: string };
export type SkillRadar = { skills: SkillDimension[]; overallScore: number };

export async function computeSkillRadar(userId: string): Promise<SkillRadar> {
  const [attempts, simSessions] = await Promise.all([
    db.attempt.findMany({
      where: { userId },
      include: { lab: { select: { type: true, difficulty: true } } },
    }),
    db.simulationSession.findMany({
      where: { userId, status: { in: ["CONTAINED", "BREACHED"] } },
      select: { status: true, score: true },
    }),
  ]);

  const solved = attempts.filter((a) => a.status === "SOLVED");

  const ctfSolved = solved.filter((a) => a.lab.type === "CTF");
  const blueSolved = solved.filter((a) => a.lab.type === "BLUE_TEAM");
  const redSolved  = solved.filter((a) => a.lab.type === "RED_TEAM");

  const ctfScore = Math.min(100, ctfSolved.reduce((s, a) => s + (DIFF_PTS[a.lab.difficulty] ?? 0), 0));
  const blueScore = Math.min(100,
    blueSolved.reduce((s, a) => s + (DIFF_PTS[a.lab.difficulty] ?? 0), 0) * 0.75 +
    simSessions.filter((s) => s.status === "CONTAINED").length * 6
  );
  const redScore = Math.min(100, redSolved.reduce((s, a) => s + (DIFF_PTS[a.lab.difficulty] ?? 0), 0));

  const avgSimScore = simSessions.length
    ? Math.round(simSessions.reduce((s, x) => s + (x.score ?? 0), 0) / simSessions.length)
    : 0;

  const timedSolves = solved.filter((a) => a.timeTakenSec != null);
  const fastSolves = timedSolves.filter((a) => {
    const threshold = FAST_THRESHOLDS[a.lab.difficulty];
    return threshold && a.timeTakenSec! < threshold;
  });
  const speedScore = timedSolves.length > 0
    ? Math.round((fastSolves.length / timedSolves.length) * 100)
    : 0;

  const hardSolved = solved.filter((a) => a.lab.difficulty === "HARD").length;
  const insaneSolved = solved.filter((a) => a.lab.difficulty === "INSANE").length;
  const depthScore = Math.min(100, hardSolved * 12 + insaneSolved * 28);

  const skills: SkillDimension[] = [
    { label: "CTF Mastery",   score: ctfScore,    color: "#22c55e", note: `${ctfSolved.length} CTF labs solved` },
    { label: "Blue Team",     score: blueScore,   color: "#3b82f6", note: `${blueSolved.length} defensive labs` },
    { label: "Red Team",      score: redScore,    color: "#ef4444", note: `${redSolved.length} offensive labs` },
    { label: "Simulation",    score: avgSimScore, color: "#a855f7", note: `Avg score ${avgSimScore}/100` },
    { label: "Speed",         score: speedScore,  color: "#f59e0b", note: `${fastSolves.length}/${timedSolves.length} fast solves` },
    { label: "Depth",         score: depthScore,  color: "#ec4899", note: `${hardSolved} Hard + ${insaneSolved} Insane` },
  ];

  const overallScore = Math.round(skills.reduce((s, k) => s + k.score, 0) / skills.length);

  return { skills, overallScore };
}
