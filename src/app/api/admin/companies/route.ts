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
  name:          z.string().min(1).max(200),
  slug:          z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  industry:      z.enum(["FINANCE", "HEALTHCARE", "EDUCATION", "MANUFACTURING", "RETAIL", "GOVERNMENT", "TECHNOLOGY"]),
  description:   z.string().min(1).max(2000),
  employeeCount: z.number().int().min(1).max(1000000),
  networkNotes:  z.string().max(4000).optional(),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const companies = await db.companyEnvironment.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ companies });
}

export async function POST(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const existing = await db.companyEnvironment.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

  const company = await db.companyEnvironment.create({ data: parsed.data });
  return NextResponse.json({ id: company.id, slug: company.slug, name: company.name });
}
