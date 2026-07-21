import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const competition = await db.competition.findUnique({
    where: { slug },
    include: {
      entries: {
        orderBy: { score: "desc" },
        take: 3,
      },
    },
  });

  if (!competition || new Date() <= competition.endDate) {
    return NextResponse.json({ ok: false });
  }

  const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
  for (let i = 0; i < competition.entries.length; i++) {
    const entry = competition.entries[i];
    const existing = await db.notification.findFirst({
      where: { userId: entry.userId, type: "competition_win", href: `/competitions/${slug}` },
    });
    if (!existing) {
      await createNotification(
        entry.userId,
        "competition_win",
        `${medals[i]} — ${competition.name}`,
        `Final score: ${entry.score} pts${competition.prizeDesc ? ` · ${competition.prizeDesc}` : ""}`,
        `/competitions/${slug}`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
