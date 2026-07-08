import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, userId } = await params;
  const { isLead } = await req.json() as { isLead?: boolean };
  if (typeof isLead !== "boolean") return NextResponse.json({ error: "isLead must be a boolean" }, { status: 400 });

  await db.organizationMember.update({
    where: { organizationId_userId: { organizationId: id, userId } },
    data: { isLead },
  });

  return NextResponse.json({ ok: true });
}
