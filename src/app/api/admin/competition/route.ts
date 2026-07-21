import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const Body = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  freezeAt: z.string().datetime().optional(),
  prizeDesc: z.string().max(500).optional(),
  labSlugs: z.array(z.string()).min(1),
});

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });
  }

  const { name, description, startDate, endDate, freezeAt, prizeDesc, labSlugs } = parsed.data;
  const slug = toSlug(name);

  const competition = await db.competition.create({
    data: {
      name,
      slug,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      ...(freezeAt && { freezeAt: new Date(freezeAt) }),
      ...(prizeDesc && { prizeDesc }),
      labSlugs,
      published: false,
    },
    select: { id: true, slug: true },
  });

  return NextResponse.json(competition);
}
