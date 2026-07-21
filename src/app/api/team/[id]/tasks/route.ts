import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PostBody = z.object({
  title: z.string().min(1).max(300),
  assignedRole: z.enum(["IR_LEAD", "FORENSICS", "LEGAL", "COMMS"]).optional(),
});

const PatchBody = z.object({
  taskId: z.string().min(1),
  done: z.boolean(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const teamSession = await db.teamSession.findUnique({ where: { id }, include: { members: true } });
  if (!teamSession) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!teamSession.members.some((m) => m.userId === user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const task = await db.teamTask.create({
    data: {
      teamSessionId: id,
      createdById: user.id,
      title: parsed.data.title,
      assignedRole: parsed.data.assignedRole ?? null,
    },
    include: { createdBy: { select: { displayName: true, email: true } } },
  });

  return NextResponse.json({
    id: task.id,
    title: task.title,
    assignedRole: task.assignedRole,
    done: task.done,
    createdByName: task.createdBy.displayName ?? task.createdBy.email,
    createdAt: task.createdAt.toISOString(),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const task = await db.teamTask.findUnique({ where: { id: parsed.data.taskId } });
  if (!task || task.teamSessionId !== id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updated = await db.teamTask.update({
    where: { id: parsed.data.taskId },
    data: { done: parsed.data.done },
  });

  return NextResponse.json({ id: updated.id, done: updated.done });
}
