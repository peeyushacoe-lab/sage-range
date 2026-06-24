import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (!user || user.role !== "ADMIN") return null;
  return session.user.id;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { assessmentId } = await params;
  const body = await req.json();
  const { label, maxScore } = body as { label: string; maxScore?: number };

  if (!label?.trim()) return NextResponse.json({ error: "label is required" }, { status: 400 });

  const assessment = await db.assessment.findUnique({ where: { id: assessmentId }, select: { id: true } });
  if (!assessment) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  // Upsert rubric (one per assessment)
  const rubric = await db.assessmentRubric.upsert({
    where: { assessmentId },
    update: {},
    create: { assessmentId },
  });

  const count = await db.rubricCriterion.count({ where: { rubricId: rubric.id } });

  const criterion = await db.rubricCriterion.create({
    data: {
      rubricId: rubric.id,
      label: label.trim(),
      maxScore: Math.max(1, Math.min(100, maxScore ?? 10)),
      order: count,
    },
  });

  return NextResponse.json({ rubricId: rubric.id, criterionId: criterion.id });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ assessmentId: string }> }
) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { assessmentId } = await params;
  const { searchParams } = new URL(req.url);
  const criterionId = searchParams.get("criterionId");

  if (!criterionId) return NextResponse.json({ error: "criterionId required" }, { status: 400 });

  const rubric = await db.assessmentRubric.findUnique({ where: { assessmentId }, select: { id: true } });
  if (!rubric) return NextResponse.json({ error: "Rubric not found" }, { status: 404 });

  await db.rubricCriterion.deleteMany({ where: { id: criterionId, rubricId: rubric.id } });

  return NextResponse.json({ ok: true });
}
