import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { submitFindings } from "@/lib/missions";

const Body = z.object({
  suspectId: z.string().min(1),
  classification: z.string().min(1),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  evidenceKeys: z.array(z.string()).max(50),
  summary: z.string().min(1).max(4000),
});

/**
 * File a conclusion and grade it. Locks the session — one shot at this,
 * same as the single attempt at the investigation itself.
 */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const { sessionId } = await params;
  const result = await submitFindings(user.id, sessionId, parsed.data);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
