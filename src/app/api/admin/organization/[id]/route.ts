import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json() as {
    active?: boolean;
    plan?: string;
    seats?: number;
    expiresAt?: string | null;
    notes?: string;
    domain?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (typeof body.active === "boolean") data.active = body.active;
  if (body.plan) data.plan = body.plan;
  if (typeof body.seats === "number") data.seats = body.seats;
  if ("expiresAt" in body) data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  if (typeof body.notes === "string") data.notes = body.notes;
  if ("domain" in body) {
    const normalized = body.domain?.trim().toLowerCase().replace(/^@/, "") || null;
    if (normalized) {
      const clash = await db.organization.findUnique({ where: { domain: normalized } });
      if (clash && clash.id !== id) {
        return NextResponse.json({ error: "That domain is already registered to another organization." }, { status: 409 });
      }
    }
    data.domain = normalized;
  }

  await db.organization.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
