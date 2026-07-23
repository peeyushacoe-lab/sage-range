import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PatchBody = z.object({
  title:        z.string().min(1).max(200).optional(),
  subtitle:     z.string().max(300).optional().nullable(),
  description:  z.string().min(1).max(5000).optional(),
  category:     z.enum(["FUNDAMENTALS","BLUE_TEAM","RED_TEAM","FORENSICS","SECURITY_ENGINEERING","NETWORKING","CLOUD"]).optional(),
  difficulty:   z.enum(["EASY","MEDIUM","HARD","INSANE"]).optional(),
  estimatedHrs: z.number().int().min(0).optional(),
  thumbnail:    z.string().url().optional().nullable(),
  published:    z.boolean().optional(),
  order:        z.number().int().min(0).optional(),
  objectives:   z.array(z.string()).optional(),
  prerequisites: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { courseId } = await params;
  const body = await req.json() as unknown;
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const course = await db.academyCourse.update({ where: { id: courseId }, data: parsed.data });
  return NextResponse.json(course);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { courseId } = await params;
  const course = await db.academyCourse.findUnique({
    where: { id: courseId },
    include: { _count: { select: { enrollments: true } } },
  });
  if (!course) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (course._count.enrollments > 0) return NextResponse.json({ error: "has_enrollments" }, { status: 409 });

  await db.academyCourse.delete({ where: { id: courseId } });
  return NextResponse.json({ ok: true });
}
