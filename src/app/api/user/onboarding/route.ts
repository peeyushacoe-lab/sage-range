import { NextResponse } from "next/server";
import { z } from "zod";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";

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

  // Fetch Clerk user + update metadata + check existing user — all in parallel.
  const client = await clerkClient();
  const [clerkUser, , existingUser] = await Promise.all([
    client.users.getUser(userId),
    client.users.updateUserMetadata(userId, {
      publicMetadata: { onboardingComplete: true, role },
    }),
    db.user.findUnique({ where: { clerkId: userId }, select: { id: true } }),
  ]);

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  // Upsert handles both new sign-ups (user not yet in DB) and returning users
  const user = await db.user.upsert({
    where: { clerkId: userId },
    update: { role, displayName },
    create: { clerkId: userId, email, role, displayName },
    select: { email: true },
  });

  const cookieOpts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
  // Send welcome email only on first onboarding — not on role changes or re-submissions.
  if (!existingUser && user?.email) {
    sendWelcomeEmail(user.email, displayName, role).catch(() => null);
  }

  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(ONBOARDING_COOKIE, "1", cookieOpts);
  res.cookies.set("sage_role", role, cookieOpts);
  return res;
}
