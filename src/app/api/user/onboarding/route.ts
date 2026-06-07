import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

const ONBOARDING_COOKIE = "sage_onboarded";

const Body = z.object({
  role: z.enum(["STUDENT", "INSTRUCTOR", "RECRUITER"]),
  displayName: z.string().min(2).max(60),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { role, displayName } = parsed.data;

  // Get Clerk user + check existing DB user — update metadata separately so a Clerk
  // API failure doesn't block account creation.
  let email = "";
  try {
    const client = await clerkClient();
    const [clerkUser, existingUser] = await Promise.all([
      client.users.getUser(userId),
      db.user.findUnique({ where: { clerkId: userId }, select: { id: true, email: true } }),
    ]);

    email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

    // Fire metadata update in background — non-blocking, not critical for routing
    client.users.updateUserMetadata(userId, {
      publicMetadata: { onboardingComplete: true, role },
    }).catch((e: unknown) => console.error("[onboarding] Clerk metadata update failed:", e));

    // Handle email collision: if email exists under a different clerkId, re-link it
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
        // Email already exists under different clerkId — re-link and update
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
