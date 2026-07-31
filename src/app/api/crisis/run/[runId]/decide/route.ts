import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { submitDecision } from "@/lib/crisis";

const Body = z.object({
  injectId: z.string().min(1).max(128),
  optionId: z.string().min(1).max(128),
});

/**
 * Record a decision.
 *
 * Only the ids are taken from the request; the effects come from authored
 * content, so a crafted body cannot invent an option or its consequences.
 */
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
  const result = await submitDecision({
    runId,
    userId: user.id,
    injectId: parsed.data.injectId,
    optionId: parsed.data.optionId,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
