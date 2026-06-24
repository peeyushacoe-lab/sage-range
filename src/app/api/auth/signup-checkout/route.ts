import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getPlanPricing } from "@/lib/plan-pricing";

const Body = z.object({
  email: z.string().email(),
  role: z.enum(["INSTRUCTOR", "RECRUITER"]),
  // Final amount after voucher (in cents). Server re-validates to prevent tampering.
  voucherCode: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { email, role, voucherCode } = parsed.data;

  // Confirm user was just created
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Read price from DB (falls back to defaults if not seeded yet)
  const pricing = await getPlanPricing();
  const planRow = pricing.find((p) => p.role === role);
  if (!planRow || planRow.priceAmt === 0) {
    return NextResponse.json({ error: "No payment required for this role." }, { status: 400 });
  }

  const plan = { name: `${planRow.label} Plan`, amount: planRow.priceAmt, currency: "usd" };

  // Re-validate voucher server-side to compute final amount
  let finalAmount = plan.amount;
  if (voucherCode) {
    const code = voucherCode.toUpperCase();
    const voucher = await db.voucher.findUnique({ where: { code } });
    if (
      voucher &&
      voucher.active &&
      (!voucher.expiresAt || voucher.expiresAt >= new Date()) &&
      (voucher.maxUses === null || voucher.usedCount < voucher.maxUses)
    ) {
      if (voucher.discountPct > 0) {
        finalAmount = Math.round(finalAmount * (1 - voucher.discountPct / 100));
      }
      if (voucher.discountAmt > 0) {
        finalAmount = Math.max(0, finalAmount - voucher.discountAmt);
      }
    }
  }

  // If voucher brought price to 0 — no Stripe needed
  if (finalAmount <= 0) {
    await db.user.update({
      where: { email },
      data: { subscriptionStatus: "active", subscriptionPlan: role.toLowerCase() },
    });
    // Increment voucher use count
    if (voucherCode) {
      await db.voucher.update({
        where: { code: voucherCode.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      }).catch(() => null);
    }
    return NextResponse.json({ free: true });
  }

  // Create or reuse Stripe customer
  let customerId = user.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.displayName ?? user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const origin = new URL(req.url).origin;

  // Get or create a recurring price using lookup_key for idempotency — avoids creating
  // a new Stripe product+price object on every signup attempt.
  const lookupKey = `ruflo_${role.toLowerCase()}_${finalAmount}_monthly`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  let priceId: string;
  if (existing.data.length > 0) {
    priceId = existing.data[0].id;
  } else {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { plan: role.toLowerCase() },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: finalAmount,
      currency: plan.currency,
      recurring: { interval: "month" },
      lookup_key: lookupKey,
    });
    priceId = price.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { userId: user.id, plan: role.toLowerCase(), voucherCode: voucherCode ?? "" },
    },
    success_url: `${origin}/api/user/fix-session?signup=1`,
    cancel_url: `${origin}/sign-up?canceled=1`,
    metadata: { userId: user.id, plan: role.toLowerCase() },
  });

  return NextResponse.json({ url: session.url });
}
