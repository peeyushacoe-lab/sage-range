import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ content: z.string().min(1).max(1000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const teamSession = await db.teamSession.findUnique({ where: { id }, include: { members: true } });
  if (!teamSession) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!teamSession.members.some((m) => m.userId === user.id)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const note = await db.teamNote.create({
    data: { teamSessionId: id, authorId: user.id, content: parsed.data.content },
    include: { author: { select: { displayName: true, email: true } } },
  });

  return NextResponse.json({
    id: note.id,
    content: note.content,
    authorName: note.author.displayName ?? note.author.email,
    createdAt: note.createdAt.toISOString(),
  });
}
