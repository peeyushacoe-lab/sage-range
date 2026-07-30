import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { submitTriagDecision } from "@/lib/tickets";

const TriageSchema = z.object({
  userAction: z.enum(["CLOSED", "ESCALATED", "RESOLVED", "IGNORED", "MONITOR"]),
  confidence: z.number().int().min(0).max(100),
  resolution: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shiftId: string; ticketId: string }> },
) {
  try {
    const user = await getOrCreateAppUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const { shiftId, ticketId } = await params;

    // Parse request body
    const body = await req.json().catch(() => null);
    const parsed = TriageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.errors },
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

    // Verify user has active attempt on this shift
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

    // Check shift deadline
    const deadline = new Date(attempt.startedAt.getTime() + shift.timeLimitSec * 1000);
    if (new Date() > deadline) {
      return NextResponse.json(
        { error: "Shift time expired" },
        { status: 403 },
      );
    }

    // Verify ticket exists in this shift
    const ticket = await db.shiftTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket || ticket.shiftId !== shiftId) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 },
      );
    }

    // Check if already triaged
    const existing = await db.shiftTicketTriage.findUnique({
      where: { ticketId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ticket already triaged" },
        { status: 400 },
      );
    }

    // Submit triage decision
    const result = await submitTriagDecision(
      ticketId,
      shiftId,
      attempt.id,
      parsed.data.userAction,
      parsed.data.confidence,
      parsed.data.resolution,
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[POST /api/tickets/queue/triage] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
