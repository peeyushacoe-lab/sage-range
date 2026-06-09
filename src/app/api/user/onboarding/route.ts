import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

const ONBOARDING_COOKIE = "sage_onboarded";

const Body = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "RECRUITER"]),
  displayName: z.string().min(2).max(60),
  email: z.string().email().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  // Step 1 — auth
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session.userId;
  } catch (e) {
    console.error("[onboarding] auth() threw:", e);
    return NextResponse.json({ error: "auth_failed", detail: String(e) }, { status: 500 });
  }
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Step 2 — parse body
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { role, displayName, email: clientEmail = "" } = parsed.data;

  // Step 3 — DB
  try {
    const existingUser = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, email: true },
    });

    const email = existingUser?.email ?? clientEmail;

    let user;
    try {
      user = await db.user.upsert({
        where: { clerkId: userId },
        update: { role, displayName },
        create: { clerkId: userId, email, role, displayName },
        select: { email: true },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        user = await db.user.update({
          where: { email },
          data: { clerkId: userId, role, displayName },
          select: { email: true },
        });
      } else {
        throw e;
      }
    }

    if (!existingUser && user?.email) {
      sendWelcomeEmail(user.email, displayName, role).catch(() => null);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[onboarding] DB error:", msg);
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
