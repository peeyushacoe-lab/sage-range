import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { audit } from "@/lib/audit";

const Body = z.object({
  action: z.enum(["UPHOLD", "DISMISS", "RESTORE"]),
  resolution: z.string().max(2000).optional(),
});

/**
 * Resolve a scenario report.
 *
 * UPHOLD removes the scenario from circulation and closes every open report
 * against it — a moderator should not have to click through five reports of
 * the same thing. DISMISS closes this report alone. RESTORE reverses a
 * takedown, which only an admin can do.
 *
 * Every outcome is audited: moderation decisions affect someone else's work
 * and need to be attributable.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { reportId } = await params;
  const report = await db.scenarioReport.findUnique({
    where: { id: reportId },
    include: { scenario: { select: { id: true, title: true, createdById: true } } },
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const now = new Date();
  const resolution = parsed.data.resolution?.trim() || null;

  if (parsed.data.action === "UPHOLD") {
    await db.$transaction([
      db.customScenario.update({
        where: { id: report.scenarioId },
        data: {
          takenDownAt: now,
          takedownReason: resolution,
          // Drop it out of the gallery immediately rather than relying on the
          // takedown filter alone.
          visibility: "PRIVATE",
          published: false,
        },
      }),
      // Close every open report on this scenario, not just the one actioned.
      db.scenarioReport.updateMany({
        where: { scenarioId: report.scenarioId, status: "OPEN" },
        data: {
          status: "UPHELD",
          reviewedById: user.id,
          reviewedAt: now,
          resolution,
        },
      }),
    ]);
  } else if (parsed.data.action === "DISMISS") {
    await db.scenarioReport.update({
      where: { id: reportId },
      data: { status: "DISMISSED", reviewedById: user.id, reviewedAt: now, resolution },
    });
  } else {
    await db.$transaction([
      db.customScenario.update({
        where: { id: report.scenarioId },
        data: { takenDownAt: null, takedownReason: null },
      }),
      db.scenarioReport.updateMany({
        where: { scenarioId: report.scenarioId, status: "UPHELD" },
        data: { status: "DISMISSED", reviewedById: user.id, reviewedAt: now, resolution },
      }),
    ]);
  }

  await audit({
    actorId: user.id,
    action: "ADMIN_SCENARIO_MODERATE",
    target: report.scenarioId,
    meta: {
      reportId,
      decision: parsed.data.action,
      scenarioTitle: report.scenario.title,
      authorId: report.scenario.createdById,
      reason: report.reason,
    },
    req,
  });

  return NextResponse.json({ ok: true, action: parsed.data.action });
}
