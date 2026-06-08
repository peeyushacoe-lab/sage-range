import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { sendClassroomJoinEmail } from "@/lib/email";

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await req.json() as { code?: string };
  if (!code?.trim()) {
    return NextResponse.json({ error: "Join code required" }, { status: 400 });
  }

  const classroom = await db.classroom.findUnique({
    where: { joinCode: code.trim().toUpperCase() },
    include: { instructor: { select: { displayName: true, email: true } } },
  });
  if (!classroom) {
    return NextResponse.json({ error: "Invalid join code" }, { status: 404 });
  }

  const existing = await db.classroomEnrollment.findUnique({
    where: { classroomId_userId: { classroomId: classroom.id, userId: user.id } },
  });
  await db.classroomEnrollment.upsert({
    where: { classroomId_userId: { classroomId: classroom.id, userId: user.id } },
    create: { classroomId: classroom.id, userId: user.id },
    update: {},
  });

  // Send join notification only on first enrolment
  if (!existing) {
    const instructorName = classroom.instructor.displayName ?? classroom.instructor.email.split("@")[0];
    sendClassroomJoinEmail(
      user.email,
      user.displayName ?? user.email.split("@")[0],
      classroom.name,
      instructorName,
      classroom.id
    ).catch(() => null);
  }

  return NextResponse.json({ id: classroom.id, name: classroom.name });
}
