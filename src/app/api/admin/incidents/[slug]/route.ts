import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const PatchBody = z.object({
  codename:         z.string().min(1).max(120).optional(),
  title:            z.string().min(1).max(200).optional(),
  companyId:        z.string().min(1).optional(),
  briefing:         z.string().min(1).max(4000).optional(),
  difficulty:       z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]).optional(),
  estimatedMinutes: z.number().int().min(1).max(600).optional(),
  points:           z.number().int().min(1).max(10000).optional(),
  randomized:       z.boolean().optional(),
  published:        z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.incidentSimulation.update({ where: { id: sim.id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.incidentSimulation.delete({ where: { id: sim.id } });
  return NextResponse.json({ ok: true });
}
