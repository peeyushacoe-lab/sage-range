import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Voucher codes are short, human-typable strings with no auth requirement —
  // without a limit here they're trivially brute-forceable.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "unknown";
  const rl = await rateLimit(`voucher:${ip}`, { max: 10, windowSec: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const { code } = parsed.data;

  const voucher = await db.voucher.findUnique({ where: { code } });

  if (!voucher || !voucher.active) {
    return NextResponse.json({ error: "Invalid voucher code." }, { status: 404 });
  }

  if (voucher.expiresAt && voucher.expiresAt < new Date()) {
    return NextResponse.json({ error: "This voucher has expired." }, { status: 410 });
  }

  if (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses) {
    return NextResponse.json({ error: "This voucher has no remaining uses." }, { status: 410 });
  }

  return NextResponse.json({
    valid: true,
    discountPct: voucher.discountPct,
    discountAmt: voucher.discountAmt,
  });
}
