import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const VALID_ROLES = ["STUDENT", "INSTRUCTOR", "RECRUITER"] as const;
type SwitchRole = (typeof VALID_ROLES)[number];

// GET /api/user/switch-role?role=INSTRUCTOR
// Development-only endpoint for testing role switching.
// In production, only ADMIN accounts can switch roles.
export async function GET(req: Request) {
  const { userId } = await auth();
  const origin = new URL(req.url).origin;

  if (!userId) return NextResponse.redirect(new URL("/sign-in", origin));

  const me = await getOrCreateAppUser();
  if (!me) return NextResponse.redirect(new URL("/sign-in", origin));

  // Block in production for non-admin accounts
  if (process.env.NODE_ENV === "production" && me.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const role = new URL(req.url).searchParams.get("role") as SwitchRole | null;
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  await db.user.update({ where: { clerkId: userId }, data: { role } });

  const cookieOpts = {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  };

  const res = NextResponse.redirect(new URL("/dashboard", origin));
  res.cookies.set("sage_role", role, cookieOpts);
  res.cookies.set("sage_onboarded", "1", cookieOpts);
  return res;
}
