import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me?.stripeCustomerId) {
    return NextResponse.json({ error: "no_subscription" }, { status: 404 });
  }

  const origin = new URL(req.url).origin;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: me.stripeCustomerId,
      return_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal error:", err);
    return NextResponse.json({ error: "portal_failed" }, { status: 500 });
  }
}
