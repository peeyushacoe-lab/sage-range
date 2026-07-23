import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ courseId: z.string() });

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = Body.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const course = await db.academyCourse.findUnique({ where: { id: parsed.data.courseId } });
  if (!course || !course.published) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.academyEnrollment.upsert({
    where: { userId_courseId: { userId: user.id, courseId: parsed.data.courseId } },
    create: { userId: user.id, courseId: parsed.data.courseId },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
