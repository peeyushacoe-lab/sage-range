import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 3 MB)" }, { status: 400 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });

  // Delete old blob if one exists
  if (user?.avatarUrl) {
    try { await del(user.avatarUrl); } catch { /* ignore if already gone */ }
  }

  const ext = file.type.split("/")[1] ?? "jpg";
  const blob = await put(`avatars/${session.user.id}.${ext}`, file, {
    access: "public",
    addRandomSuffix: false,
  });

  await db.user.update({
    where: { id: session.user.id },
    data: { avatarUrl: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  if (user?.avatarUrl) {
    try { await del(user.avatarUrl); } catch { /* ignore */ }
  }

  await db.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });
  return NextResponse.json({ ok: true });
}
