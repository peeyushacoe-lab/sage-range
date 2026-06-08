import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedPage = createRouteMatcher([
  "/dashboard(.*)",
  "/labs(.*)",
  "/recruiter(.*)",
  "/profile(.*)",
  "/simulation(.*)",
  "/admin(.*)",
  "/analytics(.*)",
  "/billing(.*)",
  "/paths(.*)",
  "/classroom(.*)",
  "/competitions(.*)",
  "/institution(.*)",
  "/leaderboard(.*)",
]);

const isOnboarding      = createRouteMatcher(["/onboarding(.*)"]);
const isCompleteProfile = createRouteMatcher(["/complete-profile(.*)"]);

const isStudentBlocked   = createRouteMatcher(["/recruiter(.*)", "/analytics/recruiter(.*)", "/analytics/instructor(.*)"]);
const isRecruiterBlocked = createRouteMatcher(["/labs(.*)", "/paths(.*)", "/competitions(.*)", "/analytics/instructor(.*)"]);
const isInstructorBlocked = createRouteMatcher(["/competitions(.*)", "/paths(.*)", "/leaderboard(.*)", "/analytics/recruiter(.*)", "/recruiter(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedPage(req)) await auth.protect();

  // Let onboarding and complete-profile pages through without redirect loops
  if (isOnboarding(req) || isCompleteProfile(req)) return NextResponse.next();

  const { userId, sessionClaims } = await auth();
  if (userId) {
    const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    const onboarded = req.cookies.get("sage_onboarded")?.value === "1";

    // Step 1 only: if not yet onboarded → force role/name selection
    // complete-profile is enforced by the onboarding page's redirect, NOT middleware,
    // so existing users who pre-date the profile step are not affected.
    if (!meta?.onboardingComplete && !onboarded) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Role-based page guards
    const role = req.cookies.get("sage_role")?.value;
    if (role === "STUDENT"    && isStudentBlocked(req))    return NextResponse.redirect(new URL("/dashboard", req.url));
    if (role === "RECRUITER"  && isRecruiterBlocked(req))  return NextResponse.redirect(new URL("/recruiter", req.url));
    if (role === "INSTRUCTOR" && isInstructorBlocked(req)) return NextResponse.redirect(new URL("/classroom", req.url));
  }

  return NextResponse.next();
});

export const config = {
  // Exclude /api and /trpc — they handle their own auth via auth() in each handler.
  // Dev-browser redirect in clerkMiddleware runs before the function body, so API routes
  // must be excluded from the matcher entirely to avoid 404s on non-localhost deployments.
  matcher: [
    "/((?!_next|api|trpc|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/(.*)",
  ],
};
