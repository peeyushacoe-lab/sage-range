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

const isApi            = createRouteMatcher(["/api(.*)"]);
const isOnboarding     = createRouteMatcher(["/onboarding(.*)"]);
const isCompleteProfile = createRouteMatcher(["/complete-profile(.*)"]);

const isStudentBlocked   = createRouteMatcher(["/recruiter(.*)", "/analytics/recruiter(.*)", "/analytics/instructor(.*)"]);
const isRecruiterBlocked = createRouteMatcher(["/labs(.*)", "/paths(.*)", "/competitions(.*)", "/analytics/instructor(.*)"]);
const isInstructorBlocked = createRouteMatcher(["/competitions(.*)", "/paths(.*)", "/leaderboard(.*)", "/analytics/recruiter(.*)", "/recruiter(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // API routes pass through immediately — they call auth() themselves and return 401 if unauthed.
  // They must be in the matcher so auth() can detect the middleware context.
  if (isApi(req)) return NextResponse.next();

  if (isProtectedPage(req)) await auth.protect();
  if (isOnboarding(req) || isCompleteProfile(req)) return NextResponse.next();

  const { userId, sessionClaims } = await auth();
  if (userId) {
    const meta = sessionClaims?.publicMetadata as Record<string, unknown> | undefined;
    const onboarded = req.cookies.get("sage_onboarded")?.value === "1";

    if (!meta?.onboardingComplete && !onboarded) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    const role = req.cookies.get("sage_role")?.value;
    if (role === "STUDENT"    && isStudentBlocked(req))    return NextResponse.redirect(new URL("/dashboard", req.url));
    if (role === "RECRUITER"  && isRecruiterBlocked(req))  return NextResponse.redirect(new URL("/recruiter", req.url));
    if (role === "INSTRUCTOR" && isInstructorBlocked(req)) return NextResponse.redirect(new URL("/classroom", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Include all routes except static files so auth() works everywhere it's called
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
