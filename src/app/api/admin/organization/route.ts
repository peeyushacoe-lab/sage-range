import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

function makeCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

const PLAN_SEATS: Record<string, number> = {
  TRIAL: 30,
  BASIC: 100,
  PRO: 500,
  ENTERPRISE: 9999,
};

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me || me.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, contactEmail, domain, plan, seats, expiresAt, notes } =
    await req.json() as {
      name?: string;
      contactEmail?: string;
      domain?: string;
      plan?: string;
      seats?: number;
      expiresAt?: string;
      notes?: string;
    };

  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  if (!contactEmail?.trim()) return NextResponse.json({ error: "Contact email required" }, { status: 400 });

  const resolvedPlan = (plan ?? "TRIAL") as "TRIAL" | "BASIC" | "PRO" | "ENTERPRISE";
  const resolvedSeats = seats ?? PLAN_SEATS[resolvedPlan] ?? 30;

  const normalizedDomain = domain?.trim().toLowerCase().replace(/^@/, "") || undefined;
  if (normalizedDomain) {
    const domainClash = await db.organization.findUnique({ where: { domain: normalizedDomain } });
    if (domainClash) return NextResponse.json({ error: "That domain is already registered to another organization." }, { status: 409 });
  }

  let joinCode = makeCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db.organization.findUnique({ where: { joinCode } });
    if (!exists) break;
    joinCode = makeCode();
  }

  const organization = await db.organization.create({
    data: {
      name: name.trim(),
      contactEmail: contactEmail.trim(),
      plan: resolvedPlan,
      seats: resolvedSeats,
      joinCode,
      ...(normalizedDomain ? { domain: normalizedDomain } : {}),
      ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
    },
  });

  return NextResponse.json({ id: organization.id, joinCode: organization.joinCode });
}
