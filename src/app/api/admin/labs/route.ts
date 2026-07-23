import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const CreateBody = z.object({
  title:       z.string().min(1).max(200),
  slug:        z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1).max(2000),
  type:        z.enum(["CTF", "BLUE_TEAM", "RED_TEAM"]),
  difficulty:  z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]),
  category:    z.string().min(1).max(100),
  points:      z.number().int().min(1).max(10000),
});

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const existing = await db.lab.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

  const lab = await db.lab.create({ data: parsed.data });
  return NextResponse.json({ slug: lab.slug });
}
