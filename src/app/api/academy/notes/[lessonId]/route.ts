import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ content: z.string().max(10000) });

export async function GET(_req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { lessonId } = await params;
  const note = await db.academyUserNote.findUnique({
    where: { userId_lessonId: { userId: user.id, lessonId } },
  });
  return NextResponse.json({ content: note?.content ?? "" });
}

export async function PUT(req: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { lessonId } = await params;
  const body = await req.json() as unknown;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const note = await db.academyUserNote.upsert({
    where: { userId_lessonId: { userId: user.id, lessonId } },
    create: { userId: user.id, lessonId, content: parsed.data.content },
    update: { content: parsed.data.content },
  });
  return NextResponse.json({ content: note.content });
}
