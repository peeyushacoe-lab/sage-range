import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session.user.id : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json();

  const mod = await db.module.findUnique({ where: { id: moduleId } });
  if (!mod) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.module.update({
    where: { id: moduleId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.overview !== undefined && { overview: body.overview }),
      ...(body.readingMaterial !== undefined && { readingMaterial: body.readingMaterial }),
      ...(body.published !== undefined && { published: body.published }),
      ...(body.order !== undefined && { order: body.order }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { moduleId } = await params;
  await db.module.delete({ where: { id: moduleId } });
  return NextResponse.json({ ok: true });
}
