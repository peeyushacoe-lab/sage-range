import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const organization = await db.organization.findUnique({ where: { joinCode: code.trim().toUpperCase() } });
  if (!organization) return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  if (!organization.active) return NextResponse.json({ error: "This organization license is inactive" }, { status: 403 });
  if (organization.expiresAt && organization.expiresAt < new Date()) {
    return NextResponse.json({ error: "This organization license has expired" }, { status: 403 });
  }

  const memberCount = await db.organizationMember.count({ where: { organizationId: organization.id } });
  if (memberCount >= organization.seats) {
    return NextResponse.json({ error: "Seat limit reached for this organization" }, { status: 403 });
  }

  await db.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    create: { organizationId: organization.id, userId: user.id },
    update: {},
  });

  return NextResponse.json({ id: organization.id, name: organization.name });
}
