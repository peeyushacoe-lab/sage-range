import { NextResponse } from "next/server";
import { listScenarios } from "@/lib/simulation/runtime/scenarios/manifest";

export async function GET() {
  return NextResponse.json({ scenarios: listScenarios() });
}
