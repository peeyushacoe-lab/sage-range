import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

async function requireAdmin() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

const CreateBody = z.object({
  title:   z.string().min(1).max(160),
  body:    z.string().min(1).max(2000),
  href:    z.string().max(500).optional(),
});

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const announcements = await db.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ announcements });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });

  const announcement = await db.announcement.create({
    data: { ...parsed.data, createdById: admin.id },
  });
  return NextResponse.json({ id: announcement.id });
}

export async function PATCH(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null) as { id?: string; published?: boolean } | null;
  if (!body?.id || typeof body.published !== "boolean") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  await db.announcement.update({ where: { id: body.id }, data: { published: body.published } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!await requireAdmin()) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("announcementId");
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  await db.announcement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
