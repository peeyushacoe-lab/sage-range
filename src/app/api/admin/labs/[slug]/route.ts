import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const UpdateBody = z.object({
  title:       z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  type:        z.enum(["CTF", "BLUE_TEAM", "RED_TEAM"]).optional(),
  difficulty:  z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]).optional(),
  category:    z.string().min(1).max(100).optional(),
  points:      z.number().int().min(1).max(10000).optional(),
  published:   z.boolean().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const parsed = UpdateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const lab = await db.lab.findUnique({ where: { slug }, select: { id: true } });
  if (!lab) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.lab.update({ where: { slug }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const lab = await db.lab.findUnique({
    where: { slug },
    select: { id: true, _count: { select: { attempts: true } } },
  });
  if (!lab) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (lab._count.attempts > 0) return NextResponse.json({ error: "has_attempts" }, { status: 409 });

  await db.lab.delete({ where: { slug } });
  return NextResponse.json({ ok: true });
}
