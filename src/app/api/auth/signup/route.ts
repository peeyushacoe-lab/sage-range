import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { autoJoinOrganizationByDomain } from "@/lib/organization";

const Body = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role: z.enum(["STUDENT", "INSTRUCTOR", "RECRUITER"]).optional().default("STUDENT"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad_request" }, { status: 400 });
  }

  const { name, email, password, role } = parsed.data;
  const hashed = await bcrypt.hash(password, 12);

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    // Account exists with a password already — genuine duplicate
    if (existing.password) {
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    }
    // Account exists via OAuth (no password) — just add the password and role
    await db.user.update({
      where: { email },
      data: { password: hashed, displayName: existing.displayName ?? name, role },
    });
    return NextResponse.json({ ok: true });
  }

  const created = await db.user.create({ data: { email, password: hashed, displayName: name, role } });
  await autoJoinOrganizationByDomain(created.id, created.email);
  return NextResponse.json({ ok: true });
}
