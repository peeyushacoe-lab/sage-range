import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";

const Body = z.object({
  labId: z.string().min(1),
  stage: z.string().min(1),
  response: z.string().min(1).max(10000),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const lab = await db.lab.findUnique({ where: { id: parsed.data.labId } });
  if (!lab || !lab.published) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Check if this stage was already completed before the upsert (guards against double competition award)
  const existingStageResponse = await db.labResponse.findUnique({
    where: { userId_labId_stage: { userId: user.id, labId: parsed.data.labId, stage: parsed.data.stage } },
  });
  const isFirstStageCompletion = !existingStageResponse;

  const labResponse = await db.labResponse.upsert({
    where: {
      userId_labId_stage: {
        userId: user.id,
        labId: parsed.data.labId,
        stage: parsed.data.stage,
      },
    },
    create: {
      userId: user.id,
      labId: parsed.data.labId,
      stage: parsed.data.stage,
      response: parsed.data.response,
    },
    update: {
      response: parsed.data.response,
    },
  });

  // Ensure an IN_PROGRESS attempt exists with the current lab version (first touch)
  if (isFirstStageCompletion) {
    await db.attempt.upsert({
      where: { userId_labId: { userId: user.id, labId: lab.id } },
      create: { userId: user.id, labId: lab.id, status: "IN_PROGRESS", labVersion: lab.version },
      update: {},
    });
  }

  // Award competition points — only on first completion of this stage, with difficulty weighting
  if (isFirstStageCompletion && user.role === "STUDENT") {
    try {
      const DIFFICULTY_WEIGHT: Record<string, number> = { EASY: 1.0, MEDIUM: 1.5, HARD: 2.0, INSANE: 3.0 };
      const allStages = TASK_STAGES[lab.slug] ?? [];
      const stageCount = Math.max(allStages.length, 1);
      const perStageBase = Math.round(lab.points / stageCount);
      const weight = DIFFICULTY_WEIGHT[lab.difficulty] ?? 1.0;
      const competitionPoints = Math.round(perStageBase * weight);

      const now = new Date();
      const activeEntries = await db.competitionEntry.findMany({
        where: {
          userId: user.id,
          competition: {
            published: true,
            startDate: { lte: now },
            endDate: { gte: now },
          },
        },
        include: { competition: true },
      });
      for (const entry of activeEntries) {
        const slugs = entry.competition.labSlugs as string[];
        if (slugs.includes(lab.slug)) {
          await db.competitionEntry.update({
            where: { id: entry.id },
            data: { score: { increment: competitionPoints } },
          });
        }
      }
    } catch {
      // Never fail the main request due to competition scoring errors
    }
  }

  // Fire webhooks for classrooms where this student is enrolled and the lab is assigned
  try {
    const enrollments = await db.classroomEnrollment.findMany({
      where: { userId: user.id },
      include: { classroom: true },
    });
    for (const enrollment of enrollments) {
      const { classroom } = enrollment;
      if (!classroom.webhookUrl) continue;
      // Check if the lab is assigned to this classroom
      const assignment = await db.classroomLabAssignment.findUnique({
        where: { classroomId_labId: { classroomId: classroom.id, labId: parsed.data.labId } },
      });
      if (!assignment) continue;
      const payload = {
        event: "lab_stage_completed",
        studentEmail: user.email,
        labSlug: lab.slug,
        stage: parsed.data.stage,
        completedAt: new Date().toISOString(),
        classroomName: classroom.name,
      };
      // Fire-and-forget with a 5-second timeout
      fetch(classroom.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {/* ignore webhook errors */});
    }
  } catch {
    // Never fail the request due to webhook errors
  }

  // Auto-solve: if all defined task stages are now complete, mark Attempt as SOLVED
  const allStages = TASK_STAGES[lab.slug] ?? [];
  if (allStages.length > 0) {
    const allResponses = await db.labResponse.findMany({
      where: { userId: user.id, labId: lab.id },
      select: { stage: true },
    });
    const completedSet = new Set(allResponses.map((r) => r.stage));
    const allDone = allStages.every((s) => completedSet.has(s));
    if (allDone) {
      const existing = await db.attempt.findUnique({
        where: { userId_labId: { userId: user.id, labId: lab.id } },
      });
      if (!existing || existing.status !== "SOLVED") {
        const now = new Date();
        const startedAt = existing?.startedAt ?? now;
        const timeTakenSec = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
        const awardPoints = user.role === "STUDENT" ? lab.points : 0;
        await db.$transaction([
          db.attempt.upsert({
            where: { userId_labId: { userId: user.id, labId: lab.id } },
            create: { userId: user.id, labId: lab.id, status: "SOLVED", score: awardPoints, labVersion: lab.version, startedAt, solvedAt: now, timeTakenSec },
            update: { status: "SOLVED", score: awardPoints, solvedAt: now, timeTakenSec },
          }),
          db.user.update({
            where: { id: user.id },
            data: { skillScore: { increment: awardPoints }, xp: { increment: awardPoints } },
          }),
        ]);
      }
    }
  }

  return NextResponse.json({ id: labResponse.id });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const labId = searchParams.get("labId");
  if (!labId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const responses = await db.labResponse.findMany({
    where: { userId: user.id, labId },
    select: { stage: true, response: true, id: true },
  });

  return NextResponse.json({ responses });
}
