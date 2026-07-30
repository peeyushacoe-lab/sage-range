import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getTicketQueueProgress } from "@/lib/tickets";

const QuerySchema = z.object({
  attemptId: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  try {
    const user = await getOrCreateAppUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { shiftId } = await params;

    // Parse query params
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      attemptId: url.searchParams.get("attemptId") || "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Missing attemptId query parameter" },
        { status: 400 },
      );
    }

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

    // Verify attempt belongs to user and shift
    const attempt = await db.socShiftAttempt.findUnique({
      where: { id: parsed.data.attemptId },
    });

    if (!attempt || attempt.userId !== user.id || attempt.shiftId !== shiftId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get progress
    const progress = await getTicketQueueProgress(shiftId, parsed.data.attemptId);

    return NextResponse.json(progress);
  } catch (error) {
    console.error("[GET /api/tickets/queue/progress] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
