import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const Body = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "bad_request" }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const hashed = await bcrypt.hash(password, 12);

  const existing = await db.user.findUnique({ where: { email } });

  if (existing) {
    // Account exists with a password already — genuine duplicate
    if (existing.password) {
      return NextResponse.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    }
    // Account exists via OAuth (no password) — just add the password
    await db.user.update({ where: { email }, data: { password: hashed, displayName: existing.displayName ?? name } });
    return NextResponse.json({ ok: true });
  }

  await db.user.create({ data: { email, password: hashed, displayName: name } });
  return NextResponse.json({ ok: true });
}
