import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED = [
  "/dashboard", "/labs", "/recruiter", "/profile", "/simulation",
  "/admin", "/analytics", "/billing", "/paths", "/classroom",
  "/competitions", "/institution", "/leaderboard",
];

function isProtected(p: string) { return PROTECTED.some((prefix) => p.startsWith(prefix)); }
function isApi(p: string) { return p.startsWith("/api"); }
function isOnboarding(p: string) { return p.startsWith("/onboarding"); }
function isCompleteProfile(p: string) { return p.startsWith("/complete-profile"); }

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

  if (isApi(pathname)) return NextResponse.next();
  if (isOnboarding(pathname) || isCompleteProfile(pathname)) return NextResponse.next();

  const session = req.auth;

  if (isProtected(pathname) && !session) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (session) {
    const onboarded = req.cookies.get("sage_onboarded")?.value === "1";
    if (!onboarded) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
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
