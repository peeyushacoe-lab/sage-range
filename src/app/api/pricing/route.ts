import { NextResponse } from "next/server";
import { getPlanPricing } from "@/lib/plan-pricing";

// Public — used by the sign-up form
export async function GET() {
  const pricing = await getPlanPricing();
  return NextResponse.json(pricing);
}
