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
  const emails: string[] = rawEmails
    .filter((e): e is string => typeof e === "string")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    return NextResponse.json({ enrolled: 0, notFound: 0, errors: ["No emails provided"] });
  }

  let enrolled = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const email of emails) {
    try {
      const found = await db.user.findFirst({ where: { email } });
      if (!found) {
        notFound++;
        continue;
      }
      await db.classroomEnrollment.upsert({
        where: { classroomId_userId: { classroomId: id, userId: found.id } },
        create: { classroomId: id, userId: found.id },
        update: {},
      });
      enrolled++;
    } catch (err) {
      errors.push(`${email}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  return NextResponse.json({ enrolled, notFound, errors });
}
