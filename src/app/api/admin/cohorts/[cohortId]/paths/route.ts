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
  { params }: { params: Promise<{ cohortId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { cohortId } = await params;
  const { pathId } = await req.json();

  if (!pathId) return NextResponse.json({ error: "pathId required" }, { status: 400 });

  const entry = await db.cohortPath.upsert({
    where: { cohortId_pathId: { cohortId, pathId } },
    update: {},
    create: { cohortId, pathId },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ cohortId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { cohortId } = await params;
  const { pathId } = await req.json();

  await db.cohortPath.deleteMany({ where: { cohortId, pathId } });
  return NextResponse.json({ ok: true });
}
