import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/labs(.*)",
  "/recruiter(.*)",
  "/profile(.*)",
  "/simulation(.*)",
  "/admin(.*)",
  "/analytics(.*)",
  "/billing(.*)",
  "/api/stripe(.*)",
  "/api/labs(.*)",
  "/api/ai(.*)",
  "/api/profile(.*)",
  "/api/simulation(.*)",
  "/api/admin(.*)",
  "/api/user(.*)",
  "/api/classroom(.*)",
  "/paths(.*)",
  "/classroom(.*)",
  "/competitions(.*)",
  "/institution(.*)",
  "/leaderboard(.*)",
]);

const isOnboarding = createRouteMatcher(["/onboarding(.*)"]);
const isApi = createRouteMatcher(["/api(.*)"]);

// Students: no access to recruiter or instructor-only areas
const isStudentBlocked = createRouteMatcher(["/recruiter(.*)", "/analytics/recruiter(.*)", "/analytics/instructor(.*)"]);
// Recruiters: no access to student training content
const isRecruiterBlocked = createRouteMatcher(["/labs(.*)", "/paths(.*)", "/competitions(.*)", "/analytics/instructor(.*)"]);
// Instructors: no access to competitions, paths, leaderboard, recruiter areas
const isInstructorBlocked = createRouteMatcher(["/competitions(.*)", "/paths(.*)", "/leaderboard(.*)", "/analytics/recruiter(.*)", "/recruiter(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Protect all app routes
  if (isProtectedRoute(req)) await auth.protect();

  // Skip onboarding redirect for API routes and onboarding itself
  if (isApi(req) || isOnboarding(req)) return NextResponse.next();

  // Redirect authenticated users who haven't completed onboarding.
  // Clerk doesn't include publicMetadata in the JWT by default, so we also
  // check a plain cookie that the onboarding API sets on success.
  const { userId, sessionClaims } = await auth();
  if (userId) {
    const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    const onboarded = req.cookies.get("sage_onboarded")?.value === "1";
    if (!meta?.onboardingComplete && !onboarded) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // Role-based page guards (read from cookie set at onboarding/fix-session)
    const role = req.cookies.get("sage_role")?.value;
    if (role === "STUDENT" && isStudentBlocked(req)) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (role === "RECRUITER" && isRecruiterBlocked(req)) {
      return NextResponse.redirect(new URL("/recruiter", req.url));
    }
    if (role === "INSTRUCTOR" && isInstructorBlocked(req)) {
      return NextResponse.redirect(new URL("/classroom", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
