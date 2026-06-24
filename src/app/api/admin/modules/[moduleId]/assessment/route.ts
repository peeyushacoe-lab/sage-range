import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session.user.id : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json();
  const { title, instructions } = body as { title: string; instructions: string };

  if (!title?.trim() || !instructions?.trim()) {
    return NextResponse.json({ error: "title and instructions required" }, { status: 400 });
  }

  const existing = await db.assessment.findUnique({ where: { moduleId } });
  if (existing) {
    return NextResponse.json({ error: "Assessment already exists. Use PATCH to update." }, { status: 409 });
  }

  const assessment = await db.assessment.create({
    data: { moduleId, title: title.trim(), instructions: instructions.trim() },
  });

  return NextResponse.json(assessment, { status: 201 });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json();
  const { title, instructions } = body as { title: string; instructions: string };

  const existing = await db.assessment.findUnique({ where: { moduleId } });
  if (!existing) {
    // Auto-create if missing
    const created = await db.assessment.create({
      data: { moduleId, title: title.trim(), instructions: instructions.trim() },
    });
    return NextResponse.json(created, { status: 201 });
  }

  const updated = await db.assessment.update({
    where: { moduleId },
    data: {
      ...(title?.trim() && { title: title.trim() }),
      ...(instructions?.trim() && { instructions: instructions.trim() }),
    },
  });

  return NextResponse.json(updated);
}
