import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { shareRule } from "@/lib/detection-rules";
import { audit } from "@/lib/audit";

const Body = z.object({
  accessType: z.enum(["PRIVATE", "COMMUNITY", "RECRUITER_ONLY"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  try {
    const user = await getOrCreateAppUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { submissionId } = await params;
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const result = await shareRule(submissionId, user.id, parsed.data.accessType);

    if (!result.success) {
      const statusCode = result.statusCode || 404;
      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    // Audit log for sharing
    audit({
      actorId: user.id,
      action: "DETECTION_CHALLENGE_SUBMIT",
      target: submissionId,
      req,
      meta: { action: "share", accessType: parsed.data.accessType },
    });

    return NextResponse.json(result.acl, { status: 200 });
  } catch (error) {
    console.error("Error sharing rule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
