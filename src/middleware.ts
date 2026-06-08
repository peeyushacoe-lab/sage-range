import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PAGES = [
  "/dashboard", "/labs", "/recruiter", "/profile", "/simulation",
  "/admin", "/analytics", "/billing", "/paths", "/classroom",
  "/competitions", "/institution", "/leaderboard",
];

const STUDENT_BLOCKED  = ["/recruiter", "/analytics/recruiter", "/analytics/instructor"];
const RECRUITER_BLOCKED = ["/labs", "/paths", "/competitions", "/analytics/instructor"];
const INSTRUCTOR_BLOCKED = ["/competitions", "/paths", "/leaderboard", "/analytics/recruiter", "/recruiter"];

function startsWith(pathname: string, patterns: string[]): boolean {
  return patterns.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default auth((req: NextRequest & { auth: { user?: { id?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isAuthed = !!session?.user?.id;

  // Unauthenticated: redirect page routes to sign-in
  if (!isAuthed && startsWith(pathname, PROTECTED_PAGES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users who haven't finished onboarding
  if (isAuthed && !pathname.startsWith("/onboarding") && !pathname.startsWith("/api")) {
    const onboarded = req.cookies.get("sage_onboarded")?.value === "1";
    if (!onboarded && startsWith(pathname, PROTECTED_PAGES)) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  // Role-based page guards
  if (isAuthed) {
    const role = req.cookies.get("sage_role")?.value;
    if (role === "STUDENT" && startsWith(pathname, STUDENT_BLOCKED)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (role === "RECRUITER" && startsWith(pathname, RECRUITER_BLOCKED)) {
      return NextResponse.redirect(new URL("/recruiter", req.url));
    }
    if (role === "INSTRUCTOR" && startsWith(pathname, INSTRUCTOR_BLOCKED)) {
      return NextResponse.redirect(new URL("/classroom", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  // Exclude API, NextAuth, and static assets — those handle their own auth
  matcher: [
    "/((?!_next|api|trpc|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
