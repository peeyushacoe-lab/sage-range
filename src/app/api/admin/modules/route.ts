import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session.user.id : null;
}

export async function POST(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { pathId, title, overview, readingMaterial, order } = body as {
    pathId: string;
    title: string;
    overview: string;
    readingMaterial: string;
    order: number;
  };

  if (!pathId || !title?.trim()) {
    return NextResponse.json({ error: "pathId and title required" }, { status: 400 });
  }

  const path = await db.learningPath.findUnique({ where: { id: pathId } });
  if (!path) return NextResponse.json({ error: "Path not found" }, { status: 404 });

  const mod = await db.module.create({
    data: {
      pathId,
      title: title.trim(),
      overview: (overview ?? "").trim(),
      readingMaterial: (readingMaterial ?? "").trim(),
      order: order ?? 0,
    },
  });

  return NextResponse.json(mod, { status: 201 });
}
