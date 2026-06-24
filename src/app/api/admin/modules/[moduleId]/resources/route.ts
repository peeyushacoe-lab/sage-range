import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const VALID_TYPES = new Set(["PDF", "ARTICLE", "DOCUMENTATION", "GITHUB", "EXTERNAL_LINK", "TOOL_DOWNLOAD"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session.user.id : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { moduleId } = await params;
  const body = await req.json();
  const { type, title, url, order } = body as { type: string; title: string; url: string; order: number };

  if (!VALID_TYPES.has(type) || !title?.trim() || !url?.trim()) {
    return NextResponse.json({ error: "type, title, and url required" }, { status: 400 });
  }

  const resource = await db.moduleResource.create({
    data: {
      moduleId,
      type: type as "PDF" | "ARTICLE" | "DOCUMENTATION" | "GITHUB" | "EXTERNAL_LINK" | "TOOL_DOWNLOAD",
      title: title.trim(),
      url: url.trim(),
      order: order ?? 0,
    },
  });

  return NextResponse.json(resource, { status: 201 });
}
