import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "INSTRUCTOR")) return null;
  return user;
}

const UpsertBody = z.object({
  labSlug:   z.string().min(1),
  stage:     z.string().min(1),
  level:     z.number().int().min(1).max(3),
  text:      z.string().min(10),
  pointCost: z.number().int().min(0).max(200),
});

// POST — upsert a hint
export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = UpsertBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { labSlug, stage, level, text, pointCost } = parsed.data;

  const lab = await db.lab.findUnique({ where: { slug: labSlug }, select: { id: true } });
  if (!lab) return NextResponse.json({ error: "lab_not_found" }, { status: 404 });

  const hint = await db.labHint.upsert({
    where:  { labId_stage_level: { labId: lab.id, stage, level } },
    create: { labId: lab.id, stage, level, text, pointCost },
    update: { text, pointCost },
  });

  return NextResponse.json({ ok: true, id: hint.id });
}

// DELETE — remove a hint by slug+stage+level
export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const labSlug = searchParams.get("labSlug");
  const stage   = searchParams.get("stage");
  const level   = Number(searchParams.get("level"));

  if (!labSlug || !stage || !level) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const lab = await db.lab.findUnique({ where: { slug: labSlug }, select: { id: true } });
  if (!lab) return NextResponse.json({ error: "lab_not_found" }, { status: 404 });

  await db.labHint.deleteMany({ where: { labId: lab.id, stage, level } });
  return NextResponse.json({ ok: true });
}
