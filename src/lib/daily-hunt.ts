// ── SOC League: Daily Hunt ────────────────────────────────────────────────
// One automatically-rotating mystery lab per calendar day (UTC), open to
// everyone, paying a bonus-coin reward on top of the lab's normal
// skillScore/xp if solved within the time limit. The lab is picked
// deterministically from the day's date so no manual seeding is required —
// an admin can still override a given day by creating/editing the DailyHunt
// row directly if a specific lab should be featured.

import { db } from "@/lib/db";

export type DailyHuntWithLab = {
  id: string;
  date: Date;
  labId: string;
  bonusCoins: number;
  timeLimitSec: number;
  lab: { id: string; slug: string; title: string; difficulty: string; type: string; category: string };
};

function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Deterministic day -> index so the same calendar day always resolves to the
// same lab, without needing to pre-seed a hunt.
function dayIndex(date: Date, modulo: number): number {
  const epochDay = Math.floor(date.getTime() / 86400000);
  return ((epochDay % modulo) + modulo) % modulo;
}

const LAB_SELECT = { id: true, slug: true, title: true, difficulty: true, type: true, category: true } as const;

export async function getOrCreateTodaysDailyHunt(): Promise<DailyHuntWithLab | null> {
  const date = todayUtcMidnight();

  const existing = await db.dailyHunt.findUnique({
    where: { date },
    include: { lab: { select: LAB_SELECT } },
  });
  if (existing) return existing;

  const publishedLabs = await db.lab.findMany({
    where: { published: true },
    select: { id: true },
    orderBy: { slug: "asc" },
  });
  if (publishedLabs.length === 0) return null;

  const pick = publishedLabs[dayIndex(date, publishedLabs.length)];

  const created = await db.dailyHunt.upsert({
    where: { date },
    create: { date, labId: pick.id },
    update: {},
    include: { lab: { select: LAB_SELECT } },
  });
  return created;
}

export type DailyHuntStatus =
  | { state: "not_started"; hunt: DailyHuntWithLab }
  | { state: "in_progress"; hunt: DailyHuntWithLab; remainingSec: number }
  | { state: "expired"; hunt: DailyHuntWithLab }
  | { state: "completed"; hunt: DailyHuntWithLab; coinsAwarded: number; timeTakenSec: number | null };

export async function computeDailyHuntStatus(userId: string): Promise<DailyHuntStatus | null> {
  const hunt = await getOrCreateTodaysDailyHunt();
  if (!hunt) return null;

  const attempt = await db.dailyHuntAttempt.findUnique({
    where: { dailyHuntId_userId: { dailyHuntId: hunt.id, userId } },
  });

  if (!attempt) return { state: "not_started", hunt };
  if (attempt.completedAt) {
    return { state: "completed", hunt, coinsAwarded: attempt.coinsAwarded, timeTakenSec: attempt.timeTakenSec };
  }

  const elapsedSec = Math.floor((Date.now() - attempt.startedAt.getTime()) / 1000);
  const remainingSec = hunt.timeLimitSec - elapsedSec;
  if (remainingSec <= 0) return { state: "expired", hunt };
  return { state: "in_progress", hunt, remainingSec };
}

export async function startDailyHuntAttempt(userId: string): Promise<DailyHuntWithLab | null> {
  const hunt = await getOrCreateTodaysDailyHunt();
  if (!hunt) return null;

  await db.dailyHuntAttempt.upsert({
    where: { dailyHuntId_userId: { dailyHuntId: hunt.id, userId } },
    create: { dailyHuntId: hunt.id, userId },
    update: {},
  });

  return hunt;
}

/**
 * Called from the lab-solve award paths (labs/response, labs/submit) right
 * after a lab is marked SOLVED. If the solved lab is today's Daily Hunt
 * target, the user has an open attempt, and the solve landed within the
 * time limit, awards the bonus coins and marks the attempt complete.
 * Best-effort — callers should swallow errors so this never blocks the
 * primary scoring path.
 */
export async function checkDailyHuntCompletion(userId: string, labId: string, solvedAt: Date): Promise<void> {
  const hunt = await getOrCreateTodaysDailyHunt();
  if (!hunt || hunt.labId !== labId) return;

  const attempt = await db.dailyHuntAttempt.findUnique({
    where: { dailyHuntId_userId: { dailyHuntId: hunt.id, userId } },
  });
  if (!attempt || attempt.completedAt) return;

  const timeTakenSec = Math.floor((solvedAt.getTime() - attempt.startedAt.getTime()) / 1000);
  if (timeTakenSec > hunt.timeLimitSec) return; // too slow — no bonus, base solve reward still stands

  await db.$transaction([
    db.dailyHuntAttempt.update({
      where: { id: attempt.id },
      data: { completedAt: solvedAt, timeTakenSec, coinsAwarded: hunt.bonusCoins },
    }),
    db.user.update({
      where: { id: userId },
      data: { coins: { increment: hunt.bonusCoins } },
    }),
  ]);
}
