import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { gradeTicketTriage } from "@/lib/tickets";
import { audit } from "@/lib/audit";

const GradeSchema = z.object({
  ticketId: z.string().min(1),
  isCorrect: z.boolean(),
  pointsAward: z.number().int().min(0),
  feedback: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shiftId: string }> },
) {
  try {
    const user = await getOrCreateAppUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Verify user is admin
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const { shiftId } = await params;

    // Parse request body
    const body = await req.json().catch(() => null);
    const parsed = GradeSchema.safeParse(body);

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

    // Verify ticket exists in this shift
    const ticket = await db.shiftTicket.findUnique({
      where: { id: parsed.data.ticketId },
    });

    if (!ticket || ticket.shiftId !== shiftId) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 },
      );
    }

    // Verify triage entry exists
    const triage = await db.shiftTicketTriage.findUnique({
      where: { ticketId: parsed.data.ticketId },
    });

    if (!triage) {
      return NextResponse.json(
        { error: "Triage record not found" },
        { status: 404 },
      );
    }

    // Grade the triage
    await gradeTicketTriage(
      parsed.data.ticketId,
      parsed.data.isCorrect,
      parsed.data.pointsAward,
    );

    // Audit log the grading action
    await audit({
      actorId: user.id,
      action: "INCIDENT_TASK_SUBMIT", // Reusing as closest audit action
      target: `ticket:${parsed.data.ticketId}`,
      meta: {
        shiftId,
        isCorrect: parsed.data.isCorrect,
        pointsAward: parsed.data.pointsAward,
        feedback: parsed.data.feedback || null,
      },
      req,
    });

    return NextResponse.json({
      message: "Ticket graded successfully",
      ticketId: parsed.data.ticketId,
      isCorrect: parsed.data.isCorrect,
      pointsAward: parsed.data.pointsAward,
    });
  } catch (error) {
    console.error("[POST /api/admin/tickets/grade] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
