import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { stripe, PLANS } from "@/lib/stripe";

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { plan } = await req.json().catch(() => ({ plan: "classroom" }));
  if (plan !== "classroom") {
    return NextResponse.json({ error: "invalid_plan" }, { status: 400 });
  }

  const origin = new URL(req.url).origin;

  // Already subscribed — send to portal instead of creating a second subscription.
  if (me.subscriptionStatus === "active" || me.subscriptionStatus === "trialing") {
    if (me.stripeCustomerId) {
      try {
        const portal = await stripe.billingPortal.sessions.create({
          customer: me.stripeCustomerId,
          return_url: `${origin}/billing`,
        });
        return NextResponse.json({ url: portal.url });
      } catch {
        // Portal creation failed; fall through to billing page redirect.
      }
    }
    return NextResponse.json({ url: `${origin}/billing` });
  }

  if (!PLANS.classroom.priceId) {
    console.error("STRIPE_CLASSROOM_PRICE_ID is not configured");
    return NextResponse.json({ error: "payment_not_configured" }, { status: 503 });
  }

  try {
    // Reuse existing Stripe customer if present.
    let customerId = me.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: me.email,
        name: me.displayName ?? me.email,
        metadata: { userId: me.id },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: me.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PLANS.classroom.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { userId: me.id, plan: "classroom" },
      },
      success_url: `${origin}/billing?success=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      metadata: { userId: me.id, plan: "classroom" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
