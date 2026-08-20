import { NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { sweepExpiredRuns, concludeCompetition } from "@/lib/ozh";
import { OZH_CLOSES_AT } from "@/lib/ozh-engine";

export const dynamic = "force-dynamic";

/**
 * Close out Operation Zero Hour.
 *
 * Run this on a schedule through the competition: before the deadline it only
 * sweeps runs that have burned their three hours, and after the deadline it
 * freezes ranks and issues the seven awards. Safe to call repeatedly — awards
 * are unique per (run, kind), so a retried invocation cannot mint a second
 * certificate.
 */
export async function POST(req: Request) {
  const denied = checkCronAuth(req);
  if (denied) return denied;

  const now = new Date();
  const swept = await sweepExpiredRuns(now);

  if (now < OZH_CLOSES_AT) {
    return NextResponse.json({
      phase: "running",
      swept,
      closesAt: OZH_CLOSES_AT.toISOString(),
    });
  }

  const concluded = await concludeCompetition(now);
  if (!concluded.success) {
    return NextResponse.json({ error: concluded.error }, { status: concluded.statusCode });
  }
  return NextResponse.json({ phase: "concluded", swept, ...concluded.data });
}

// Vercel Cron invokes schedules with GET; keep POST for manual triggers.
// Its absence here is why this job — alone among the seven — never ran.
export const GET = POST;
