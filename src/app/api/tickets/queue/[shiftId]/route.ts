import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getTicketQueue } from "@/lib/tickets";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  try {
    const user = await getOrCreateAppUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const { shiftId } = await params;

    // Verify shift exists and is published
    const shift = await db.socShift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      return NextResponse.json(
        { error: "Shift not found" },
        { status: 404 },
      );
    }

    if (!shift.published) {
      return NextResponse.json(
        { error: "Shift not available" },
        { status: 403 },
      );
    }

    // Check if user has active attempt
    const attempt = await db.socShiftAttempt.findFirst({
      where: {
        userId: user.id,
        shiftId: shift.id,
        completedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "No active shift attempt" },
        { status: 403 },
      );
    }

    // Get ticket queue with SLA countdown
    const queue = await getTicketQueue(shiftId);

    return NextResponse.json({
      queue,
      totalCount: queue.length,
    });
  } catch (error) {
    console.error("[GET /api/tickets/queue] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
