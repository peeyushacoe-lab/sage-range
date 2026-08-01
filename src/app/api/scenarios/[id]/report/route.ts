import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import {
  canReportScenario,
  REPORT_REASONS,
  type ScenarioVisibility,
} from "@/lib/scenario-sharing";

const Body = z.object({
  reason: z.enum(REPORT_REASONS),
  detail: z.string().max(2000).optional(),
});

/**
 * Report a community scenario.
 *
 * Rate limited: reporting is a write available to every signed-in user, and
 * without a ceiling one account could flood the moderation queue. Re-reporting
 * the same scenario updates the existing row rather than adding another, so a
 * single reporter counts once towards priority.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(`scenario-report:${user.id}`, { max: 20, windowSec: 3600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many reports. Try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  const { id } = await params;
  const scenario = await db.customScenario.findUnique({ where: { id } });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const allowed = canReportScenario(
    {
      createdById: scenario.createdById,
      visibility: scenario.visibility as ScenarioVisibility,
      published: scenario.published,
      takenDownAt: scenario.takenDownAt,
    },
    { userId: user.id, isAdmin: user.role === "ADMIN" },
  );
  if (!allowed) {
    return NextResponse.json({ error: "You cannot report this scenario" }, { status: 403 });
  }

  await db.scenarioReport.upsert({
    where: { scenarioId_reporterId: { scenarioId: id, reporterId: user.id } },
    create: {
      scenarioId: id,
      reporterId: user.id,
      reason: parsed.data.reason,
      detail: parsed.data.detail?.trim() || null,
    },
    update: {
      reason: parsed.data.reason,
      detail: parsed.data.detail?.trim() || null,
      // Reopen if a previously closed report is filed again — the content may
      // have changed since it was dismissed.
      status: "OPEN",
      reviewedById: null,
      reviewedAt: null,
      resolution: null,
    },
    select: { id: true },
  });

  return NextResponse.json({ reported: true }, { status: 201 });
}
