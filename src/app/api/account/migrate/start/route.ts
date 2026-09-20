import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { startMigration } from "@/lib/account-migration";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ newEmail: z.string().trim().email().max(200) });

/** Authenticated — the whole point is moving *your own* account. */
export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(`migrate-start:${user.id}`, { max: 5, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });

  const result = await startMigration(user.id, parsed.data.newEmail);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: result.statusCode });

  return NextResponse.json({ ok: true });
}
