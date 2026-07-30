import { NextResponse } from "next/server";
import { listInterviewKits } from "@/lib/career";

/** Published mock interview kits. Ideal answers are not included. */
export async function GET() {
  const kits = await listInterviewKits();
  return NextResponse.json({ kits });
}
