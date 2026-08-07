import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getPhase, submitPhase, logEvidenceView, getRunState, type PhaseAnswer } from "@/lib/ozh";
import { PHASE_ORDER, type OzhPhase } from "@/lib/ozh-engine";

export const dynamic = "force-dynamic";

const PhaseParam = z.enum(["TRIAGE", "INVESTIGATION", "HUNT", "RECONSTRUCTION", "RESPONSE", "REPORT"]);

/**
 * Per-phase answer shapes.
 *
 * Every field is bounded. The answer is stored verbatim for re-grading, so an
 * unbounded string array here would be an unbounded write, and the free-text
 * indicator boxes in Phase 3 are the obvious place someone would try it.
 */
const Answers = {
  TRIAGE: z.object({
    answers: z
      .array(
        z.object({
          alertId: z.string().max(32),
          verdict: z.enum(["BENIGN", "SUSPICIOUS", "MALICIOUS", "FALSE_POSITIVE"]).optional(),
          severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
          priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
          asset: z.string().max(64).optional(),
        }),
      )
      .max(40),
  }),
  INVESTIGATION: z.object({
    answers: z.array(z.object({ id: z.string().max(64), value: z.string().max(256) })).max(40),
  }),
  HUNT: z.object({
    answers: z
      .array(
        z.object({
          id: z.string().max(64),
          technique: z.string().max(32).optional(),
          indicator: z.string().max(256).optional(),
        }),
      )
      .max(40),
  }),
  RECONSTRUCTION: z.object({
    answer: z.object({
      order: z.array(z.string().max(32)).max(40),
      tactics: z.record(z.string().max(32), z.string().max(64)).optional(),
    }),
  }),
  RESPONSE: z.object({ selected: z.array(z.string().max(64)).max(60) }),
  REPORT: z.object({
    answer: z.object({
      severity: z.string().max(32).optional(),
      iocs: z.array(z.string().max(256)).max(40).optional(),
      assets: z.array(z.string().max(128)).max(40).optional(),
      techniques: z.array(z.string().max(32)).max(40).optional(),
      containment: z.array(z.string().max(256)).max(40).optional(),
      executiveSummary: z.string().max(8000).optional(),
      impact: z.string().max(8000).optional(),
      remediation: z.string().max(8000).optional(),
      recommendations: z.string().max(8000).optional(),
    }),
  }),
} as const;

async function resolvePhase(params: Promise<{ phase: string }>) {
  const { phase } = await params;
  return PhaseParam.safeParse(phase.toUpperCase());
}

/** Fetch one phase's content. Gated on the phase being the current one. */
export async function GET(_req: Request, { params }: { params: Promise<{ phase: string }> }) {
  const parsed = await resolvePhase(params);
  if (!parsed.success) return NextResponse.json({ error: "Unknown phase" }, { status: 404 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await getPhase(user.id, parsed.data as OzhPhase);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}

/**
 * Submit and lock a phase.
 *
 * The response deliberately carries no score. Phases lock on submission, so
 * returning one would tell the intern nothing they could act on — and would
 * turn the console into an oracle for anyone able to replay the request.
 */
export async function POST(req: Request, { params }: { params: Promise<{ phase: string }> }) {
  const parsed = await resolvePhase(params);
  if (!parsed.success) return NextResponse.json({ error: "Unknown phase" }, { status: 404 });

  const phase = parsed.data as OzhPhase;
  const body = await req.json().catch(() => null);
  const shape = Answers[phase].safeParse(body);
  if (!shape.success) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const submission = { phase, ...shape.data } as PhaseAnswer;
  const result = await submitPhase(user.id, submission);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.json({
    ...result.data,
    phasesTotal: PHASE_ORDER.length,
  });
}

const ViewBody = z.object({ recordId: z.string().max(64) });

/** Record that a piece of evidence was opened. Rule 5: every action is logged. */
export async function PATCH(req: Request, { params }: { params: Promise<{ phase: string }> }) {
  const parsed = await resolvePhase(params);
  if (!parsed.success) return NextResponse.json({ error: "Unknown phase" }, { status: 404 });

  const body = ViewBody.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const state = await getRunState(user.id);
  if (!state) return NextResponse.json({ error: "No run in progress" }, { status: 404 });

  await logEvidenceView(state.runId, user.id, parsed.data as OzhPhase, body.data.recordId);
  return NextResponse.json({ logged: true });
}
