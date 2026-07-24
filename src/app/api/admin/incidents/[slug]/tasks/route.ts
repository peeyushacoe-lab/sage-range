import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const TaskBody = z.object({
  order:         z.number().int().min(1).max(100),
  title:         z.string().min(1).max(200),
  prompt:        z.string().min(1).max(4000),
  answerType:    z.enum(["FREE_TEXT", "RADIO"]),
  correctAnswer: z.string().min(1).max(2000),
  options:       z.array(z.string().min(1).max(500)).max(10).default([]),
  points:        z.number().int().min(1).max(2000),
});

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const parsed = TaskBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  if (parsed.data.answerType === "RADIO") {
    if (parsed.data.options.length < 2) {
      return NextResponse.json({ error: "radio_needs_2_options" }, { status: 400 });
    }
    if (!parsed.data.options.includes(parsed.data.correctAnswer)) {
      return NextResponse.json({ error: "correct_answer_not_in_options" }, { status: 400 });
    }
  }

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const task = await db.incidentSimTask.create({
    data: { simulationId: sim.id, ...parsed.data },
  });
  return NextResponse.json({ id: task.id });
}

const PatchBody = TaskBody.partial().extend({ taskId: z.string().min(1) });

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { taskId, ...data } = parsed.data;
  await db.incidentSimTask.updateMany({ where: { id: taskId, simulationId: sim.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { slug } = await params;

  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 });

  const sim = await db.incidentSimulation.findUnique({ where: { slug }, select: { id: true } });
  if (!sim) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.incidentSimTask.deleteMany({ where: { id: taskId, simulationId: sim.id } });
  return NextResponse.json({ ok: true });
}
