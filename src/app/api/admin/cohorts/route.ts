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
  const { name, description, startDate, endDate, joinCode } = body as {
    name: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    joinCode: string;
  };

  if (!name?.trim() || !joinCode?.trim()) {
    return NextResponse.json({ error: "name and joinCode required" }, { status: 400 });
  }

  const cohort = await db.cohort.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      joinCode: joinCode.trim().toUpperCase(),
    },
  });

  return NextResponse.json(cohort, { status: 201 });
}
