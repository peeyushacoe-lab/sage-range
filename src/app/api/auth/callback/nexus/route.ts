import { NextResponse, type NextRequest } from "next/server";

// This exact path (/api/auth/callback/nexus) is what Nexus's /sso/authorize
// redirect_uri points at. It's a more specific route than NextAuth's catch-all
// ([...nextauth]) handler, so Next.js routes requests here instead — this is
// intentionally NOT going through NextAuth's OAuth callback machinery, since
// our "nexus" provider is a Credentials provider, not an OAuth one.
//
// This route does no verification itself — it just forwards the token to
// /auth/nexus, which does the real work via the already-proven client-side
// signIn("nexus", { token }) flow used elsewhere in the app.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? req.nextUrl.searchParams.get("code");
  const url = new URL("/auth/nexus", req.url);
  if (token) url.searchParams.set("token", token);
  return NextResponse.redirect(url);
}
