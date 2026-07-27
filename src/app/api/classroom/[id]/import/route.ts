import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateAppUser();
  if (!user || (user.role !== "INSTRUCTOR" && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const classroom = await db.classroom.findUnique({ where: { id } });
  if (!classroom || classroom.instructorId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null) as { emails?: unknown[] } | null;
  const rawEmails = Array.isArray(body?.emails) ? body.emails : [];
  const emails: string[] = [...new Set(
    rawEmails
      .filter((e): e is string => typeof e === "string")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )].slice(0, 500);

  if (emails.length === 0) {
    return NextResponse.json({ enrolled: 0, notFound: 0, errors: ["No emails provided"] });
  }

  const found = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  const notFound = emails.length - found.length;

  const result = found.length > 0
    ? await db.classroomEnrollment.createMany({
        data: found.map((u) => ({ classroomId: id, userId: u.id })),
        skipDuplicates: true,
      })
    : { count: 0 };

  return NextResponse.json({ enrolled: result.count, notFound, errors: [] });
}
