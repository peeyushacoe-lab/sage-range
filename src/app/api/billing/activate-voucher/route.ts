import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getPlanPricing } from "@/lib/plan-pricing";

const Body = z.object({ voucherCode: z.string().min(1) });

/**
 * Redeems a voucher for an already-signed-up user stuck on /complete-payment
 * — the equivalent of signup-checkout's free path, but for someone who
 * abandoned the wizard rather than someone mid-signup. Only ever activates
 * the account when the voucher brings the price to exactly $0; a partial
 * discount still goes through real Stripe payment via create-subscription.
 */
export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const pricing = await getPlanPricing();
  const planRow = pricing.find((p) => p.role === user.role);
  if (!planRow) return NextResponse.json({ error: "No plan configured for this role." }, { status: 400 });

  const code = parsed.data.voucherCode.trim().toUpperCase();
  const voucher = await db.voucher.findUnique({ where: { code } });
  if (
    !voucher ||
    !voucher.active ||
    (voucher.expiresAt && voucher.expiresAt < new Date()) ||
    (voucher.maxUses !== null && voucher.usedCount >= voucher.maxUses)
  ) {
    return NextResponse.json({ error: "Invalid or expired voucher." }, { status: 400 });
  }

  let finalAmount = planRow.priceAmt;
  if (voucher.discountPct > 0) finalAmount = Math.round(finalAmount * (1 - voucher.discountPct / 100));
  if (voucher.discountAmt > 0) finalAmount = Math.max(0, finalAmount - voucher.discountAmt);

  if (finalAmount > 0) {
    return NextResponse.json({ free: false, finalAmount });
  }

  await db.user.update({
    where: { id: user.id },
    data: { subscriptionStatus: "active", subscriptionPlan: user.role.toLowerCase() },
  });
  await db.voucher.update({ where: { code }, data: { usedCount: { increment: 1 } } }).catch(() => null);

  return NextResponse.json({ free: true });
}
