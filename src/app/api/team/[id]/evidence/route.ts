import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const VALID_TAGS = ["INDICATOR", "TIMELINE", "AFFECTED", "IOC", "ACTION"] as const;

const PostBody = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  tag: z.enum(VALID_TAGS).optional().default("INDICATOR"),
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

  const evidence = await db.teamEvidence.create({
    data: {
      teamSessionId: id,
      pinnedById: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
      tag: parsed.data.tag,
    },
    include: { pinnedBy: { select: { displayName: true, email: true } } },
  });

  return NextResponse.json({
    id: evidence.id,
    title: evidence.title,
    content: evidence.content,
    tag: evidence.tag,
    pinnedByName: evidence.pinnedBy.displayName ?? evidence.pinnedBy.email,
    createdAt: evidence.createdAt.toISOString(),
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { evidenceId } = await req.json().catch(() => ({})) as { evidenceId?: string };
  if (!evidenceId) return NextResponse.json({ error: "evidenceId required" }, { status: 400 });

  const evidence = await db.teamEvidence.findUnique({ where: { id: evidenceId } });
  if (!evidence || evidence.teamSessionId !== id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (evidence.pinnedById !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await db.teamEvidence.delete({ where: { id: evidenceId } });
  return NextResponse.json({ ok: true });
}
