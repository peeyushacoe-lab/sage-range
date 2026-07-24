import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { coinsForPoints } from "@/lib/soc-league";

const REPORT_COMPLETION_BONUS = 250;

const Body = z.object({
  simulationId: z.string().min(1),
  executiveSummary: z.string().max(4000),
  incidentTimeline: z.string().max(6000),
  technicalFindings: z.string().max(6000),
  mitreMapping: z.string().max(4000),
  indicatorsOfCompromise: z.string().max(4000),
  businessImpact: z.string().max(4000),
  containmentActions: z.string().max(4000),
  recommendations: z.string().max(4000),
  submit: z.boolean(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(`incident-report:${user.id}:${parsed.data.simulationId}`, { max: 30, windowSec: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const { simulationId, submit, ...fields } = parsed.data;

  const sim = await db.incidentSimulation.findUnique({
    where: { id: simulationId },
    select: { published: true },
  });
  if (!sim || !sim.published) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (submit) {
    const incomplete = Object.values(fields).some((v) => v.trim().length === 0);
    if (incomplete) return NextResponse.json({ error: "incomplete" }, { status: 400 });
  }

  const existing = await db.incidentSimReport.findUnique({
    where: { userId_simulationId: { userId: user.id, simulationId } },
  });

  // Already submitted — reports are final once locked in; don't let another
  // POST re-trigger the completion bonus or overwrite a graded report.
  if (existing?.submittedAt) {
    return NextResponse.json({ ok: true, submitted: true, alreadySubmitted: true });
  }

  const data = { ...fields, submittedAt: submit ? new Date() : null };

  await db.incidentSimReport.upsert({
    where: { userId_simulationId: { userId: user.id, simulationId } },
    update: data,
    create: { userId: user.id, simulationId, ...data },
  });

  if (submit) {
    const awardPoints = user.role === "STUDENT" ? REPORT_COMPLETION_BONUS : 0;
    await db.user.update({
      where: { id: user.id },
      data: {
        skillScore: { increment: awardPoints },
        xp: { increment: awardPoints },
        coins: { increment: coinsForPoints(awardPoints) },
      },
    });
    audit({ actorId: user.id, action: "INCIDENT_REPORT_SUBMIT", target: simulationId, req, meta: { points: awardPoints } });
  }

  return NextResponse.json({ ok: true, submitted: submit });
}
