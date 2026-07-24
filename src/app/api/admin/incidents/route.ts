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
  slug:             z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  codename:         z.string().min(1).max(120),
  title:            z.string().min(1).max(200),
  companyId:        z.string().min(1),
  briefing:         z.string().min(1).max(4000),
  difficulty:       z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]),
  estimatedMinutes: z.number().int().min(1).max(600),
  points:           z.number().int().min(1).max(10000),
  randomized:       z.boolean().default(false),
});

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const existing = await db.incidentSimulation.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

  const company = await db.companyEnvironment.findUnique({ where: { id: parsed.data.companyId }, select: { id: true } });
  if (!company) return NextResponse.json({ error: "company_not_found" }, { status: 400 });

  const sim = await db.incidentSimulation.create({
    data: { ...parsed.data, published: false },
  });
  return NextResponse.json({ slug: sim.slug });
}
