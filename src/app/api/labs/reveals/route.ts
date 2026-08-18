import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { STAGE_ANSWERS } from "@/lib/labs/stage-answers";

/**
 * The flags a learner has earned on one lab.
 *
 * Lab components used to hard-code the flag each completion message shows, so
 * every flag in the range was sitting in the JavaScript bundle. They ask for
 * them here instead, and a flag is only returned for a stage this user has a
 * recorded — that is, server-verified — completion for.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const labId = searchParams.get("labId");
  if (!labId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const lab = await db.lab.findUnique({ where: { id: labId }, select: { slug: true } });
  if (!lab) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const done = await db.labResponse.findMany({
    where: { userId: user.id, labId },
    select: { stage: true },
  });

  const keys = STAGE_ANSWERS[lab.slug] ?? {};
  const flags: Record<string, string> = {};
  for (const { stage } of done) {
    const reveal = keys[stage]?.reveal;
    if (reveal) flags[stage] = reveal;
  }

  return NextResponse.json({ flags });
}
