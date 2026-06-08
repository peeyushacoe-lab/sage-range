import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const labId = searchParams.get("labId");
  const stage = searchParams.get("stage");

  if (!labId || !stage) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const [hints, usedHints] = await Promise.all([
    db.labHint.findMany({
      where: { labId, stage },
      orderBy: { level: "asc" },
    }),
    db.usedHint.findMany({
      where: {
        userId: user.id,
        hint: { labId, stage },
      },
      select: { hintId: true },
    }),
  ]);

  const usedSet = new Set(usedHints.map((u) => u.hintId));

  const result = hints.map((h) => ({
    level: h.level,
    pointCost: h.pointCost,
    text: usedSet.has(h.id) ? h.text : null,
    unlocked: usedSet.has(h.id),
  }));

  return NextResponse.json({ hints: result });
}

const PostBody = z.object({
  labId: z.string().min(1),
  stage: z.string().min(1),
  level: z.number().int().min(1).max(3),
});

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { labId, stage, level } = parsed.data;

  const hint = await db.labHint.findUnique({
    where: { labId_stage_level: { labId, stage, level } },
  });
  if (!hint) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const existing = await db.usedHint.findUnique({
    where: { userId_hintId: { userId: user.id, hintId: hint.id } },
  });
  if (existing) {
    return NextResponse.json({ text: hint.text, pointCost: hint.pointCost, newScore: user.skillScore });
  }

  if (user.skillScore < hint.pointCost) {
    return NextResponse.json(
      { error: "Insufficient points", needed: hint.pointCost, current: user.skillScore },
      { status: 400 }
    );
  }

  const [, updatedUser] = await db.$transaction([
    db.usedHint.create({ data: { userId: user.id, hintId: hint.id } }),
    db.user.update({
      where: { id: user.id },
      data: { skillScore: { decrement: hint.pointCost } },
    }),
  ]);

  return NextResponse.json({ text: hint.text, pointCost: hint.pointCost, newScore: updatedUser.skillScore });
}
