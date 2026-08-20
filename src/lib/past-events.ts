import { db } from "@/lib/db";
import { getLeaderboard as getOzhLeaderboard } from "@/lib/ozh";
import { OZH_CLOSES_AT, MAX_SCORE, windowStateAt } from "@/lib/ozh-engine";

/**
 * Every concluded competition, in one shape.
 *
 * Vault runs competitions under two unrelated models: Championship (monthly,
 * scored by solving a lab set) and OzhRun (a one-off three-hour operation).
 * Nothing joined them, so the competitions hub could only list championships —
 * and Operation Zero Hour vanished from the site the moment its window closed,
 * taking its winners with it. An event nobody can look back on is an event that
 * did not happen, as far as a learner putting it on a CV is concerned.
 *
 * This normalises both into one list so the hub can show a single history.
 * Adding a third competition type means adding a loader here, not a third
 * bespoke section on the page.
 */

export type PastEventPodiumEntry = {
  rank: number;
  userId: string;
  /** Never a full email address — these render on pages a visitor may reach. */
  displayName: string;
  score: number;
  /** Secondary line: university, accuracy, whatever that event ranks on. */
  detail: string | null;
};

export type PastEvent = {
  key: string;
  kind: "CHAMPIONSHIP" | "OPERATION";
  title: string;
  blurb: string;
  href: string;
  concludedAt: Date | null;
  entrants: number;
  scoreSuffix: string | null;
  podium: PastEventPodiumEntry[];
};

/** Shared with the OZH leaderboard: publish a display name, never the address. */
function nameOf(user: { displayName: string | null; email: string }): string {
  return user.displayName || user.email.split("@")[0];
}

async function championshipEvents(limit: number): Promise<PastEvent[]> {
  const championships = await db.championship.findMany({
    where: { published: true, status: "CONCLUDED" },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: limit,
    include: {
      _count: { select: { entries: true } },
      entries: {
        // Ranks are written once at conclusion, so the podium is stable rather
        // than recomputed from scores that keep moving.
        where: { rank: { in: [1, 2, 3] }, user: { hidden: false } },
        orderBy: { rank: "asc" },
        include: { user: { select: { id: true, displayName: true, email: true, university: true } } },
      },
    },
  });

  return championships.map((c) => ({
    key: `championship:${c.id}`,
    kind: "CHAMPIONSHIP" as const,
    title: c.title,
    blurb: c.description,
    href: `/championship/${c.slug}`,
    concludedAt: c.concludedAt ?? c.endsAt,
    entrants: c._count.entries,
    scoreSuffix: null,
    podium: c.entries.map((e) => ({
      rank: e.rank!,
      userId: e.userId,
      displayName: nameOf(e.user),
      score: e.score,
      detail: e.user.university ?? `${e.solved} solved`,
    })),
  }));
}

/**
 * Operation Zero Hour, once its window has closed.
 *
 * Read through the same getLeaderboard the operation's own board uses, so the
 * podium here cannot disagree with the podium there. That call also sweeps runs
 * that burned their three hours without submitting — idempotent, and a no-op
 * once the operation has been concluded.
 */
async function operationEvents(now: Date): Promise<PastEvent[]> {
  if (windowStateAt(now) !== "CLOSED") return [];

  const board = await getOzhLeaderboard();
  if (board.length === 0) return [];

  return [
    {
      key: "operation:zero-hour",
      kind: "OPERATION" as const,
      title: "Operation Zero Hour",
      blurb:
        "A single three-hour intrusion, investigated alone across six phases. One attempt, no resets, and no two analysts got the same evidence.",
      href: "/operations/zero-hour/leaderboard",
      concludedAt: OZH_CLOSES_AT,
      entrants: board.length,
      scoreSuffix: `/${MAX_SCORE}`,
      podium: board.slice(0, 3).map((e) => ({
        rank: e.rank,
        userId: e.userId,
        displayName: e.displayName,
        score: e.score,
        detail: e.university ?? `${e.accuracy}% accuracy`,
      })),
    },
  ];
}

export async function listPastEvents(limit = 12, now: Date = new Date()): Promise<PastEvent[]> {
  const [championships, operations] = await Promise.all([
    championshipEvents(limit),
    operationEvents(now),
  ]);

  return [...championships, ...operations]
    .sort((a, b) => (b.concludedAt?.getTime() ?? 0) - (a.concludedAt?.getTime() ?? 0))
    .slice(0, limit);
}
