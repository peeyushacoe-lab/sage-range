import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // Claim this event ID — if already processed, the unique constraint fires and we return early.
  try {
    await db.stripeWebhookEvent.create({ data: { stripeEventId: event.id } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ received: true }); // duplicate — already processed
    }
    throw e;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || session.mode !== "subscription") break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await db.user.update({
          where: { id: userId },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: sub.status,
            subscriptionPlan: session.metadata?.plan ?? "classroom",
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await db.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            subscriptionStatus: sub.status,
            ...(sub.metadata?.plan ? { subscriptionPlan: sub.metadata.plan } : {}),
            trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          },
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db.user.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data: {
            subscriptionStatus: "canceled",
            stripeSubscriptionId: null,
          },
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id;
        if (!customerId) break;

        await db.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "past_due" },
        });
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
