import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  labSlug: z.string().min(1),
  flag: z.string().min(1).max(512),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 15 flag attempts per lab per 10 minutes
  const rl = await rateLimit(`flag:${user.id}:${parsed.data.labSlug}`, { max: 15, windowSec: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const lab = await db.lab.findUnique({
    where: { slug: parsed.data.labSlug },
    include: { flags: true },
  });
  if (!lab || !lab.published) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const submitted = parsed.data.flag.trim();
  const matched = lab.flags.find((f) =>
    f.caseSensitive ? f.value === submitted : f.value.toLowerCase() === submitted.toLowerCase()
  );

  if (!matched) {
    await db.attempt.upsert({
      where: { userId_labId: { userId: user.id, labId: lab.id } },
      create: { userId: user.id, labId: lab.id, status: "IN_PROGRESS" },
      update: {},
    });
    return NextResponse.json({ correct: false });
  }

  const existing = await db.attempt.findUnique({
    where: { userId_labId: { userId: user.id, labId: lab.id } },
  });
  if (existing?.status === "SOLVED") {
    return NextResponse.json({ correct: true, alreadySolved: true });
  }

  const startedAt = existing?.startedAt ?? new Date();
  const solvedAt = new Date();
  const timeTakenSec = Math.floor((solvedAt.getTime() - startedAt.getTime()) / 1000);

  await db.$transaction([
    db.attempt.upsert({
      where: { userId_labId: { userId: user.id, labId: lab.id } },
      create: {
        userId: user.id,
        labId: lab.id,
        status: "SOLVED",
        score: matched.points,
        startedAt,
        solvedAt,
        timeTakenSec,
      },
      update: {
        status: "SOLVED",
        score: matched.points,
        solvedAt,
        timeTakenSec,
      },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        skillScore: { increment: matched.points },
        xp: { increment: matched.points },
      },
    }),
  ]);

  // Award competition points for CTF-style flag submission (full-lab score, difficulty-weighted)
  try {
    const DIFFICULTY_WEIGHT: Record<string, number> = { EASY: 1.0, MEDIUM: 1.5, HARD: 2.0, INSANE: 3.0 };
    const weight = DIFFICULTY_WEIGHT[lab.difficulty] ?? 1.0;
    const competitionPoints = Math.round(matched.points * weight);

    const now = new Date();
    const activeEntries = await db.competitionEntry.findMany({
      where: {
        userId: user.id,
        competition: {
          published: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      },
      include: { competition: true },
    });
    for (const entry of activeEntries) {
      const slugs = entry.competition.labSlugs as string[];
      if (slugs.includes(lab.slug)) {
        await db.competitionEntry.update({
          where: { id: entry.id },
          data: { score: { increment: competitionPoints } },
        });
      }
    }
  } catch {
    // Never fail the flag submission due to competition scoring errors
  }

  return NextResponse.json({ correct: true, points: matched.points });
}
