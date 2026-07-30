import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { submitAssessment } from "@/lib/career";

const Body = z.object({
  attemptId: z.string().min(1),
  responses: z.record(z.unknown()),
  proctorFlags: z.record(z.unknown()).optional(),
});

/** Submit and grade an attempt, issuing a credential on a pass. */
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await submitAssessment({
    userId: user.id,
    attemptId: parsed.data.attemptId,
    responses: parsed.data.responses,
    proctorFlags: parsed.data.proctorFlags,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
