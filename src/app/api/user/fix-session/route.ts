import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// Recovery endpoint: if DB role is set but the onboarding cookie is missing,
// re-sets the cookie and redirects to /dashboard.
export async function GET(req: Request) {
  const { userId } = await auth();
  const origin = new URL(req.url).origin;
  if (!userId) return NextResponse.redirect(new URL("/sign-in", origin));

  const user = await db.user.findUnique({ where: { clerkId: userId }, select: { role: true } });

  if (!user?.role) {
    return NextResponse.redirect(new URL("/onboarding", origin));
  }

  const cookieOpts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };
  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.set("sage_onboarded", "1", cookieOpts);
  res.cookies.set("sage_role", user.role ?? "STUDENT", cookieOpts);
  return res;
}
