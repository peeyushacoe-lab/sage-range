import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { applyToJob } from "@/lib/jobs";

const Body = z.object({ coverNote: z.string().max(4000).optional() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const parsed = Body.safeParse((await req.json().catch(() => ({}))) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`job-apply:${user.id}`, { max: 30, windowSec: 86400 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const { jobId } = await params;
  const result = await applyToJob({
    jobId,
    applicantId: user.id,
    coverNote: parsed.data.coverNote,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data, { status: 201 });
}
