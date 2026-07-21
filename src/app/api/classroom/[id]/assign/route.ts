import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { sendLabAssignedEmail } from "@/lib/email";
import { createBulkNotifications } from "@/lib/notifications";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const classroom = await db.classroom.findUnique({ where: { id } });
  if (!classroom || classroom.instructorId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { labId, action, dueDate } = await req.json() as { labId?: string; action?: "assign" | "remove"; dueDate?: string };
  if (!labId) return NextResponse.json({ error: "labId required" }, { status: 400 });

  const parsedDueDate = dueDate ? new Date(dueDate) : undefined;

  if (action === "remove") {
    await db.classroomLabAssignment.deleteMany({ where: { classroomId: id, labId } });
    return NextResponse.json({ ok: true });
  }

  // Check if this is a new assignment (not an update to due date).
  const existing = await db.classroomLabAssignment.findUnique({
    where: { classroomId_labId: { classroomId: id, labId } },
  });

  await db.classroomLabAssignment.upsert({
    where: { classroomId_labId: { classroomId: id, labId } },
    create: { classroomId: id, labId, ...(parsedDueDate ? { dueDate: parsedDueDate } : {}) },
    update: { ...(parsedDueDate ? { dueDate: parsedDueDate } : {}) },
  });

  // Notify enrolled students on first assignment only (not on due date updates).
  if (!existing) {
    const [enrollments, lab] = await Promise.all([
      db.classroomEnrollment.findMany({
        where: { classroomId: id },
        include: { user: { select: { email: true, displayName: true } } },
      }),
      db.lab.findUnique({ where: { id: labId }, select: { title: true, slug: true } }),
    ]);

    if (lab && enrollments.length > 0) {
      const dueDateStr = parsedDueDate?.toLocaleDateString("en-GB", {
        day: "numeric", month: "long", year: "numeric",
      });
      for (const { user: student } of enrollments) {
        sendLabAssignedEmail(
          student.email,
          student.displayName ?? student.email.split("@")[0],
          lab.title,
          classroom.name,
          id,
          dueDateStr
        ).catch(() => null);
      }

      const studentIds = enrollments.map((e) => e.userId);
      createBulkNotifications(
        studentIds,
        "lab_assigned",
        `New lab assigned: ${lab.title}`,
        dueDateStr ? `Due ${dueDateStr} · ${classroom.name}` : classroom.name,
        `/labs/${lab.slug}`
      ).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true });
}
