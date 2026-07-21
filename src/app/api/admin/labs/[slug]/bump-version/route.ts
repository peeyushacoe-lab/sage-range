import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({ summary: z.string().min(1).max(500) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const lab = await db.lab.findUnique({ where: { slug } });
  if (!lab) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const newVersion = lab.version + 1;

  const [updated] = await db.$transaction([
    db.lab.update({
      where: { slug },
      data: { version: newVersion },
      select: { id: true, version: true },
    }),
    db.labChangelog.create({
      data: {
        labId: lab.id,
        version: newVersion,
        summary: parsed.data.summary,
        changedById: user.id,
      },
    }),
  ]);

  return NextResponse.json({ version: updated.version });
}
