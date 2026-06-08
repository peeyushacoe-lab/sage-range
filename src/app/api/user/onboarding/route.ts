import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

const ONBOARDING_COOKIE = "sage_onboarded";

const Body = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "RECRUITER"]),
  displayName: z.string().min(2).max(60),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { role, displayName } = parsed.data;
  const externalId = session.user.id;
  const email = session.user.email;

  if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

  let isNew = false;
  try {
    const existing = await db.user.findUnique({ where: { externalId }, select: { id: true } });
    isNew = !existing;

    try {
      await db.user.upsert({
        where: { externalId },
        update: { role, displayName },
        create: { externalId, email, role, displayName },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        // Email collision under a different externalId — re-link
        await db.user.update({
          where: { email },
          data: { externalId, role, displayName },
        });
      } else {
        throw e;
      }
    }

    if (isNew) sendWelcomeEmail(email, displayName, role).catch(() => null);
  } catch (e) {
    console.error("[onboarding] Error:", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
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
