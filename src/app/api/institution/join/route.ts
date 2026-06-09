import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const institution = await db.institution.findUnique({ where: { joinCode: code.trim().toUpperCase() } });
  if (!institution) return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  if (!institution.active) return NextResponse.json({ error: "This institution license is inactive" }, { status: 403 });
  if (institution.expiresAt && institution.expiresAt < new Date()) {
    return NextResponse.json({ error: "This institution license has expired" }, { status: 403 });
  }

  const memberCount = await db.institutionMember.count({ where: { institutionId: institution.id } });
  if (memberCount >= institution.seats) {
    return NextResponse.json({ error: "Seat limit reached for this institution" }, { status: 403 });
  }

  await db.institutionMember.upsert({
    where: { institutionId_userId: { institutionId: institution.id, userId: user.id } },
    create: { institutionId: institution.id, userId: user.id },
    update: {},
  });

  return NextResponse.json({ id: institution.id, name: institution.name });
}
