import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

const VALID_ROLES = ["STUDENT", "INSTRUCTOR", "RECRUITER", "ADMIN"] as const;
type Role = typeof VALID_ROLES[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { role } = await req.json() as { role?: string };
  if (!role || !VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Prevent demoting yourself
  if (id === me.id && role !== "ADMIN") {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  await db.user.update({ where: { id }, data: { role: role as Role } });
  return NextResponse.json({ ok: true });
}
