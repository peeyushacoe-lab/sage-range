import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { skipAhead } from "@/lib/crisis";

const Body = z.object({ minutes: z.number().int().min(1).max(120) });

/** Advance the simulation clock without acting. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { runId } = await params;
  const result = await skipAhead({ runId, userId: user.id, minutes: parsed.data.minutes });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
