import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "RECRUITER" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { candidateId, jobId, note } = parsed.data;

  // Verify candidate exists
  const candidate = await db.user.findUnique({ where: { id: candidateId }, select: { id: true } });
  if (!candidate) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Toggle: delete if exists, create if not
  const existing = await db.candidateBookmark.findUnique({
    where: { recruiterId_candidateId: { recruiterId: me.id, candidateId } },
  });

  if (existing) {
    await db.candidateBookmark.delete({ where: { id: existing.id } });
    return NextResponse.json({ bookmarked: false });
  }

  await db.candidateBookmark.create({
    data: {
      recruiterId: me.id,
      candidateId,
      jobId: jobId ?? null,
      note: note ?? null,
    },
  });

  return NextResponse.json({ bookmarked: true });
}
