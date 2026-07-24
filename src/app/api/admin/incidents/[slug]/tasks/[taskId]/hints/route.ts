import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const HintBody = z.object({
  level:     z.number().int().min(1).max(5),
  pointCost: z.number().int().min(0).max(500),
  text:      z.string().min(1).max(2000),
});

async function taskBelongsToSlug(taskId: string, slug: string) {
  const task = await db.incidentSimTask.findUnique({
    where: { id: taskId },
    select: { simulation: { select: { slug: true } } },
  });
  return task?.simulation.slug === slug;
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string; taskId: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug, taskId } = await params;

  const parsed = HintBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  if (!await taskBelongsToSlug(taskId, slug)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const hint = await db.incidentSimHint.create({ data: { taskId, ...parsed.data } });
  return NextResponse.json({ id: hint.id });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string; taskId: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug, taskId } = await params;

  const hintId = new URL(req.url).searchParams.get("hintId");
  if (!hintId) return NextResponse.json({ error: "hintId required" }, { status: 400 });

  if (!await taskBelongsToSlug(taskId, slug)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.incidentSimHint.deleteMany({ where: { id: hintId, taskId } });
  return NextResponse.json({ ok: true });
}
