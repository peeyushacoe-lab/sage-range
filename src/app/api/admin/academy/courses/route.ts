import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const CreateBody = z.object({
  slug:         z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  title:        z.string().min(1).max(200),
  subtitle:     z.string().max(300).optional(),
  description:  z.string().min(1).max(5000),
  category:     z.enum(["FUNDAMENTALS","BLUE_TEAM","RED_TEAM","FORENSICS","SECURITY_ENGINEERING","NETWORKING","CLOUD"]),
  difficulty:   z.enum(["EASY","MEDIUM","HARD","INSANE"]),
  estimatedHrs: z.number().int().min(0).max(500).default(0),
  objectives:   z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  order:        z.number().int().min(0).default(0),
});

export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const courses = await db.academyCourse.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { modules: true, enrollments: true } },
    },
  });
  return NextResponse.json(courses);
}

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  const existing = await db.academyCourse.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) return NextResponse.json({ error: "slug_taken" }, { status: 409 });

  const course = await db.academyCourse.create({ data: parsed.data });
  return NextResponse.json({ id: course.id, slug: course.slug }, { status: 201 });
}
