import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTicketLeaderboard } from "@/lib/tickets";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  try {
    const { shiftId } = await params;

    // Verify shift exists
    const shift = await db.socShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return NextResponse.json(
        { error: "Shift not found" },
        { status: 404 },
      );
    }

    // Get leaderboard (top 100)
    const leaderboard = await getTicketLeaderboard(shiftId, 100);

    return NextResponse.json({
      shiftId,
      shiftTitle: shift.title,
      leaderboard,
      totalEntries: leaderboard.length,
    });
  } catch (error) {
    console.error("[GET /api/tickets/leaderboard/shift] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
