import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PROTECTED = [
  "/dashboard", "/labs", "/recruiter", "/profile", "/simulation",
  "/admin", "/analytics", "/billing", "/paths", "/classroom",
  "/competitions", "/institution", "/leaderboard",
];

const AUTH_PAGES = ["/sign-in", "/sign-up"];

function isProtected(p: string) { return PROTECTED.some((prefix) => p.startsWith(prefix)); }
function isApi(p: string) { return p.startsWith("/api"); }
function isOnboarding(p: string) { return p.startsWith("/onboarding"); }
function isCompleteProfile(p: string) { return p.startsWith("/complete-profile"); }
function isAuthPage(p: string) { return AUTH_PAGES.some((prefix) => p.startsWith(prefix)); }

function isStudentBlocked(p: string) {
  return p.startsWith("/recruiter") || p.startsWith("/analytics/recruiter") || p.startsWith("/analytics/instructor");
}
function isRecruiterBlocked(p: string) {
  return p.startsWith("/labs") || p.startsWith("/paths") || p.startsWith("/competitions") || p.startsWith("/analytics/instructor");
}
function isInstructorBlocked(p: string) {
  return p.startsWith("/competitions") || p.startsWith("/paths") || p.startsWith("/leaderboard") ||
    p.startsWith("/analytics/recruiter") || p.startsWith("/recruiter");
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (isApi(pathname)) return NextResponse.next();
  if (isOnboarding(pathname) || isCompleteProfile(pathname)) return NextResponse.next();

  // Redirect logged-in users away from sign-in/sign-up
  if (isAuthPage(pathname) && session) {
    const onboarded = req.cookies.get("sage_onboarded")?.value === "1";
    return NextResponse.redirect(new URL(onboarded ? "/dashboard" : "/api/user/fix-session", req.url));
  }

  // Redirect unauthenticated users to sign-in
  if (isProtected(pathname) && !session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (session) {
    const onboarded = req.cookies.get("sage_onboarded")?.value === "1";

    if (!onboarded) {
      // Go through fix-session which checks DB state and routes correctly
      return NextResponse.redirect(new URL("/api/user/fix-session", req.url));
    }

    const role = req.cookies.get("sage_role")?.value;
    if (role === "STUDENT"    && isStudentBlocked(pathname))    return NextResponse.redirect(new URL("/dashboard", req.url));
    if (role === "RECRUITER"  && isRecruiterBlocked(pathname))  return NextResponse.redirect(new URL("/recruiter", req.url));
    if (role === "INSTRUCTOR" && isInstructorBlocked(pathname)) return NextResponse.redirect(new URL("/classroom", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
