import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { startDailyHuntAttempt } from "@/lib/daily-hunt";

export async function POST() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const hunt = await startDailyHuntAttempt(user.id);
  if (!hunt) return NextResponse.json({ error: "no_hunt_available" }, { status: 404 });

  return NextResponse.json({ labSlug: hunt.lab.slug });
}
