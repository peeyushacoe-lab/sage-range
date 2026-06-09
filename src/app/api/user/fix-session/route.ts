import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const user = await getOrCreateAppUser();

  if (!user) return NextResponse.redirect(new URL("/sign-in", origin));

  const cookieOpts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };

  // User has never been updated = brand new, needs to pick role
  const needsOnboarding = user.updatedAt.getTime() === user.createdAt.getTime();

  if (needsOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", origin));
  }

  // Existing user — restore cookies and send to the right home
  const destination = user.role === "ADMIN" ? "/admin" : "/dashboard";
  const res = NextResponse.redirect(new URL(destination, origin));
  res.cookies.set("sage_onboarded", "1", cookieOpts);
  res.cookies.set("sage_role", user.role, cookieOpts);
  return res;
}
