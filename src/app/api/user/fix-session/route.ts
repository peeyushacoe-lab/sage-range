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
  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.set("sage_onboarded", "1", cookieOpts);
  res.cookies.set("sage_role", user.role ?? "STUDENT", cookieOpts);
  return res;
}
