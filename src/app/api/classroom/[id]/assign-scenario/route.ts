import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getScenario } from "@/lib/simulation/runtime/scenarios/manifest";

const Body = z.object({
  scenarioId: z.string().min(1),
  dueDate: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "INSTRUCTOR" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const classroom = await db.classroom.findUnique({ where: { id } });
  if (!classroom || classroom.instructorId !== me.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const scenario = getScenario(parsed.data.scenarioId);
  if (!scenario) return NextResponse.json({ error: "invalid_scenario" }, { status: 400 });

  const assignment = await db.classroomSimAssignment.upsert({
    where: { classroomId_scenarioId: { classroomId: id, scenarioId: parsed.data.scenarioId } },
    create: {
      classroomId: id,
      scenarioId: parsed.data.scenarioId,
      title: scenario.title,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
    update: {
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  return NextResponse.json(assignment);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "INSTRUCTOR" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const scenarioId = new URL(req.url).searchParams.get("scenarioId");
  if (!scenarioId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await db.classroomSimAssignment.deleteMany({ where: { classroomId: id, scenarioId } });
  return NextResponse.json({ ok: true });
}
