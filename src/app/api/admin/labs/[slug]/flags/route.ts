import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const FlagBody = z.object({
  value:         z.string().min(1).max(500),
  points:        z.number().int().min(0).max(10000),
  caseSensitive: z.boolean().default(true),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const parsed = FlagBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const lab = await db.lab.findUnique({ where: { slug }, select: { id: true } });
  if (!lab) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const flag = await db.flag.create({ data: { labId: lab.id, ...parsed.data } });
  return NextResponse.json({ id: flag.id });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const flagId = new URL(req.url).searchParams.get("flagId");
  if (!flagId) return NextResponse.json({ error: "flagId required" }, { status: 400 });

  const lab = await db.lab.findUnique({ where: { slug }, select: { id: true } });
  if (!lab) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.flag.deleteMany({ where: { id: flagId, labId: lab.id } });
  return NextResponse.json({ ok: true });
}
