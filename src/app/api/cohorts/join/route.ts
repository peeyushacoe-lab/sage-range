import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { joinCode } = await req.json();
  if (!joinCode?.trim()) return NextResponse.json({ error: "joinCode required" }, { status: 400 });

  const cohort = await db.cohort.findUnique({
    where: { joinCode: joinCode.trim().toUpperCase() },
    select: { id: true, name: true, published: true },
  });

  if (!cohort || !cohort.published) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  await db.cohortMember.upsert({
    where: { cohortId_userId: { cohortId: cohort.id, userId: session.user.id } },
    update: {},
    create: { cohortId: cohort.id, userId: session.user.id },
  });

  return NextResponse.json({ cohortId: cohort.id, name: cohort.name });
}
