import { NextResponse } from "next/server";
import { z } from "zod";
import { confirmMigration } from "@/lib/account-migration";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ token: z.string().min(10).max(200) });

/**
 * Public — deliberately no session required. The token (256 bits, mailed
 * only to the new address) is the actual proof of ownership; requiring a
 * session too would break confirming from a different device or browser
 * than the one that started the migration, which is a completely normal
 * thing to do from an email link.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = await rateLimit(`migrate-confirm:${ip}`, { max: 20, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await confirmMigration(parsed.data.token);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: result.statusCode });

  return NextResponse.json({ ok: true, email: result.data.email });
}
