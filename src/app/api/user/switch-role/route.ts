import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const VALID_ROLES = ["STUDENT", "INSTRUCTOR", "RECRUITER"] as const;
type SwitchRole = (typeof VALID_ROLES)[number];

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const me = await getOrCreateAppUser();

  if (!me) return NextResponse.redirect(new URL("/sign-in", origin));

  // Role switching is restricted to ADMINs in all environments
  if (me.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const role = new URL(req.url).searchParams.get("role") as SwitchRole | null;
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "invalid_role" }, { status: 400 });
  }

  await db.user.update({ where: { id: me.id }, data: { role } });

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
