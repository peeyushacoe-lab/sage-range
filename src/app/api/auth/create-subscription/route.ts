import { NextResponse } from "next/server";
import { z } from "zod";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getPlanPricing } from "@/lib/plan-pricing";

const Body = z.object({
  role: z.enum(["INSTRUCTOR", "RECRUITER"]),
  voucherCode: z.string().optional(),
});

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { role, voucherCode } = parsed.data;

  // Resolve price from DB
  const pricing = await getPlanPricing();
  const planRow = pricing.find((p) => p.role === role);
  if (!planRow || planRow.priceAmt === 0) {
    return NextResponse.json({ error: "No payment required for this role." }, { status: 400 });
  }

  // Apply voucher discount server-side
  let finalAmount = planRow.priceAmt;
  if (voucherCode) {
    const code = voucherCode.toUpperCase();
    const voucher = await db.voucher.findUnique({ where: { code } });
    if (
      voucher?.active &&
      (!voucher.expiresAt || voucher.expiresAt >= new Date()) &&
      (voucher.maxUses === null || voucher.usedCount < voucher.maxUses)
    ) {
      if (voucher.discountPct > 0) finalAmount = Math.round(finalAmount * (1 - voucher.discountPct / 100));
      if (voucher.discountAmt > 0) finalAmount = Math.max(0, finalAmount - voucher.discountAmt);
    }
  }

  if (finalAmount <= 0) {
    return NextResponse.json({ error: "Use the free path — price is $0 after discount." }, { status: 400 });
  }

  // Create or reuse Stripe customer
  let customerId = me.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: me.email,
      name: me.displayName ?? me.email,
      metadata: { userId: me.id },
    });
    customerId = customer.id;
    await db.user.update({ where: { id: me.id }, data: { stripeCustomerId: customerId } });
  }

  // Cancel any existing incomplete subscription for this customer to avoid duplicates
  const existingSubs = await stripe.subscriptions.list({
    customer: customerId,
    status: "incomplete",
    limit: 5,
  });
  for (const sub of existingSubs.data) {
    await stripe.subscriptions.cancel(sub.id).catch(() => null);
  }

  // Get or create a recurring price for this plan using lookup_key for idempotency.
  // Using lookup_key means Stripe returns the same price on subsequent calls instead of
  // creating a new product+price object on every API hit.
  const lookupKey = `ruflo_${role.toLowerCase()}_${finalAmount}_monthly`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  let price: { id: string };
  if (existing.data.length > 0) {
    price = existing.data[0];
  } else {
    const product = await stripe.products.create({
      name: `${planRow.label} Plan`,
      metadata: { plan: role.toLowerCase() },
    });
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: finalAmount,
      currency: "usd",
      recurring: { interval: "month" },
      lookup_key: lookupKey,
    });
  }

  // Create the subscription with payment_behavior: 'default_incomplete'
  // This creates the subscription but doesn't charge yet — returns a PaymentIntent client_secret
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: price.id }],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice.payment_intent"],
    metadata: { userId: me.id, plan: role.toLowerCase(), voucherCode: voucherCode ?? "" },
  });

  // Save the subscription ID on the user immediately
  await db.user.update({
    where: { id: me.id },
    data: {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: "incomplete",
      subscriptionPlan: role.toLowerCase(),
    },
  });

  // Increment voucher use count now (reserved — refund logic would live in webhooks)
  if (voucherCode) {
    await db.voucher.update({
      where: { code: voucherCode.toUpperCase() },
      data: { usedCount: { increment: 1 } },
    }).catch(() => null);
  }

  const invoice = subscription.latest_invoice as Stripe.Invoice & {
    payment_intent: Stripe.PaymentIntent | string | null;
  };
  // payment_intent is expanded (object) when we passed expand: ["latest_invoice.payment_intent"]
  const rawIntent = invoice.payment_intent;
  const clientSecret =
    rawIntent !== null && typeof rawIntent === "object"
      ? rawIntent.client_secret
      : null;

  if (!clientSecret) {
    return NextResponse.json({ error: "payment_intent_missing" }, { status: 500 });
  }

  return NextResponse.json({
    subscriptionId: subscription.id,
    clientSecret,
  });
}
