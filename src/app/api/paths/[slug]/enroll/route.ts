import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;

  const path = await db.learningPath.findUnique({ where: { slug } });
  if (!path) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await db.userPathProgress.upsert({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
    update: {},
    create: { userId: user.id, pathId: path.id },
  });

  return NextResponse.json({ pathId: path.id });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;

  const path = await db.learningPath.findUnique({ where: { slug } });
  if (!path) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const progress = await db.userPathProgress.findUnique({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
  });

  return NextResponse.json({
    enrolled: !!progress,
    completedAt: progress?.completedAt?.toISOString() ?? null,
  });
}
