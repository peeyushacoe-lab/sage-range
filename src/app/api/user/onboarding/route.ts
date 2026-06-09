import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

const ONBOARDING_COOKIE = "sage_onboarded";

const Body = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "RECRUITER"]),
  displayName: z.string().min(2).max(60),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const userEmail = session.user.email;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { role, displayName } = parsed.data;

  try {
    await db.user.update({
      where: { id: userId },
      data: { role, displayName },
    });

    if (userEmail) sendWelcomeEmail(userEmail, displayName, role).catch(() => null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "db_failed", detail: msg }, { status: 500 });
  }

  const cookieOpts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(ONBOARDING_COOKIE, "1", cookieOpts);
  res.cookies.set("sage_role", role, cookieOpts);
  return res;
}
