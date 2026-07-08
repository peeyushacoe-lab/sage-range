import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const members = await db.organizationMember.findMany({
    where: { organizationId: id },
    include: { user: { select: { displayName: true, email: true, role: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({ members });
}
