import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { gradeBlock } from "@/lib/academy/block-grading";

const Body = z.object({
  answer: z.string().max(4000),
  attempts: z.number().int().min(0).max(999).optional(),
});

/**
 * Mark a knowledge check or practice answer.
 *
 * Both used to be marked in the browser against fields shipped with the page.
 * The answer now only exists on this side, and a learner has to be enrolled on
 * the course the block belongs to before it will mark anything for them.
 */
export async function POST(req: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { blockId } = await params;
  const block = await db.academyLessonBlock.findUnique({
    where: { id: blockId },
    select: { lesson: { select: { module: { select: { courseId: true } } } } },
  });
  if (!block) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const enrollment = await db.academyEnrollment.findUnique({
    where: {
      userId_courseId: { userId: user.id, courseId: block.lesson.module.courseId },
    },
    select: { id: true },
  });
  if (!enrollment) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const result = await gradeBlock(blockId, parsed.data.answer, parsed.data.attempts ?? 1);
  if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(result);
}
