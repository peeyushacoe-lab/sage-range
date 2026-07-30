import { NextResponse } from "next/server";

/**
 * Shared bearer-token gate for /api/cron/* routes.
 *
 * Returns a NextResponse to short-circuit with when the caller is not an
 * authorised scheduler, or null when the request may proceed.
 */
export function checkCronAuth(req: Request): NextResponse | null {
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ error: "cron_not_configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (authHeader.slice(7) !== expectedSecret) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  return null;
}
