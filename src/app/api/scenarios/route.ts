import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listScenarios } from "@/lib/simulation/runtime/scenarios/manifest";

export async function GET() {
  return NextResponse.json({ scenarios: listScenarios() });
}
