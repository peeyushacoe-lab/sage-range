import { NextResponse } from "next/server";
import { z } from "zod";
import { submitPilotApplication } from "@/lib/campus-pilot";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  universityName: z.string().trim().min(2).max(200),
  contactName: z.string().trim().min(2).max(150),
  contactEmail: z.string().trim().email().max(200),
  contactRole: z.string().trim().min(2).max(150),
  department: z.string().trim().max(150).optional(),
  studentEstimate: z.string().trim().max(50).optional(),
  country: z.string().trim().max(100).optional(),
  message: z.string().trim().max(4000).optional(),
  heardFrom: z.string().trim().max(200).optional(),
  // Honeypot — a real browser never fills this in; a bot filling every
  // field usually does. Accepts any value here (rejecting a non-empty one
  // at the schema level would 400 it, which tells a bot exactly which
  // field tripped the trap) — the actual "was it filled in" check happens
  // below, after validation, where the response is a plain 200 either way.
  website: z.string().max(500).optional(),
});

/** Public — no account required. Rate-limited by IP since there's no session to key on. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = await rateLimit(`campus-pilot:${ip}`, { max: 5, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429, headers: { "Retry-After": "3600" } });
  }

  if (parsed.data.website) {
    // Honeypot tripped — report success so the bot moves on, but drop it.
    return NextResponse.json({ ok: true });
  }

  const { website: _honeypot, ...input } = parsed.data;
  await submitPilotApplication(input);

  return NextResponse.json({ ok: true });
}
