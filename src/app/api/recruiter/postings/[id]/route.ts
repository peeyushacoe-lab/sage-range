import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const PatchBody = z.object({
  active: z.boolean(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "RECRUITER" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const posting = await db.jobPosting.findUnique({ where: { id }, select: { recruiterId: true } });
  if (!posting) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (posting.recruiterId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const updated = await db.jobPosting.update({
    where: { id },
    data: { active: parsed.data.active },
    select: { id: true, active: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "RECRUITER" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const posting = await db.jobPosting.findUnique({ where: { id }, select: { recruiterId: true } });
  if (!posting) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (posting.recruiterId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Soft-delete: set active false
  await db.jobPosting.update({ where: { id }, data: { active: false } });

  return NextResponse.json({ ok: true });
}
