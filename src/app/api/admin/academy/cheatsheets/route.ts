import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const CreateBody = z.object({
  courseId:    z.string().optional().nullable(),
  title:       z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  content:     z.string().min(1),
  order:       z.number().int().min(0).default(0),
});

export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const sheets = await db.academyCheatSheet.findMany({ orderBy: [{ order: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(sheets);
}

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json() as unknown;
  const parsed = CreateBody.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const sheet = await db.academyCheatSheet.create({ data: parsed.data });
  return NextResponse.json({ id: sheet.id }, { status: 201 });
}
