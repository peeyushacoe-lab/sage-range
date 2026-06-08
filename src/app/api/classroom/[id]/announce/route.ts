import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ content: z.string().min(1).max(2000) });

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

  const ann = await db.classroomAnnouncement.create({
    data: { classroomId: id, content: parsed.data.content },
  });

  return NextResponse.json(ann);
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

  const annId = new URL(req.url).searchParams.get("annId");
  if (!annId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await db.classroomAnnouncement.deleteMany({
    where: { id: annId, classroomId: id },
  });

  return NextResponse.json({ ok: true });
}
