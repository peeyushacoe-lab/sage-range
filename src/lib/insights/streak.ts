import { db } from "@/lib/db";

// Shared with achievements.ts's earning logic — a user's activity streak is
// derived from Attempt/SimulationSession timestamps rather than stored on
// the User row, so there's nothing to keep in sync and no migration needed
// to add streak tracking.
export function calcStreak(dates: Date[]): number {
  if (!dates.length) return 0;
  const days = [...new Set(dates.map((d) => d.toISOString().slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (days[0] !== today && days[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < days.length; i++) {
    const diff = (new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000;
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export async function getActivityStreak(userId: string): Promise<number> {
  const [attempts, simSessions] = await Promise.all([
    db.attempt.findMany({ where: { userId }, select: { startedAt: true } }),
    db.simulationSession.findMany({ where: { userId }, select: { startedAt: true } }),
  ]);
  return calcStreak([...attempts.map((a) => a.startedAt), ...simSessions.map((s) => s.startedAt)]);
}
