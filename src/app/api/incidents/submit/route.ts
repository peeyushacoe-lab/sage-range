import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";
import { coinsForPoints } from "@/lib/soc-league";
import { buildTokenMap, applyTokens, simSeed } from "@/lib/incident-randomizer";

const Body = z.object({
  taskId: z.string().min(1),
  answer: z.string().min(1).max(1024),
});

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const rl = await rateLimit(`incident-answer:${user.id}:${parsed.data.taskId}`, { max: 20, windowSec: 600 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Wait a few minutes before trying again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const task = await db.incidentSimTask.findUnique({
    where: { id: parsed.data.taskId },
    include: { simulation: { select: { id: true, published: true, randomized: true } } },
  });
  if (!task || !task.simulation.published) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const existing = await db.incidentSimProgress.findUnique({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
  });
  if (existing) {
    return NextResponse.json({ correct: true, alreadyCompleted: true });
  }

  // For randomized simulations, regenerate this student's exact token values
  // (same seed as the page render) and apply them to the stored template
  // correctAnswer before comparing.
  const expectedAnswer = task.simulation.randomized
    ? applyTokens(task.correctAnswer, buildTokenMap(simSeed(user.id, task.simulationId)))
    : task.correctAnswer;

  const correct = normalize(parsed.data.answer) === normalize(expectedAnswer);
  if (!correct) {
    return NextResponse.json({ correct: false });
  }

  const awardPoints = user.role === "STUDENT" ? task.points : 0;

  await db.$transaction([
    db.incidentSimProgress.create({
      data: { userId: user.id, simulationId: task.simulationId, taskId: task.id },
    }),
    db.user.update({
      where: { id: user.id },
      data: {
        skillScore: { increment: awardPoints },
        xp: { increment: awardPoints },
        coins: { increment: coinsForPoints(awardPoints) },
      },
    }),
  ]);

  audit({ actorId: user.id, action: "INCIDENT_TASK_SUBMIT", target: task.id,
    req, meta: { correct: true, points: awardPoints, simulationId: task.simulationId } });

  return NextResponse.json({ correct: true, points: awardPoints });
}
