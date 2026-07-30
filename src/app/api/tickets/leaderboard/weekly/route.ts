import { NextResponse } from "next/server";
import { getWeeklyTicketLeaderboard } from "@/lib/tickets";

export async function GET(req: Request) {
  try {
    // Get weekly leaderboard (top 100)
    const leaderboard = await getWeeklyTicketLeaderboard();

    return NextResponse.json({
      period: "WEEKLY",
      daysBack: 7,
      leaderboard,
      totalEntries: leaderboard.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/tickets/leaderboard/weekly] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
