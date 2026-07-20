import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "@/auth";

// GET: Nexus redirects here after SSO — forward the token to our client-side
// SSO page at /auth/nexus which calls signIn("nexus", { token }).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? req.nextUrl.searchParams.get("code");
  const url = new URL("/auth/nexus", req.url);
  if (token) url.searchParams.set("token", token);
  return NextResponse.redirect(url);
}

// POST: NextAuth v5 POSTs to /api/auth/callback/<provider-id> for Credentials
// providers. Our specific route takes precedence over [...nextauth], so we
// must delegate here or the request returns 405.
export const POST = handlers.POST;
