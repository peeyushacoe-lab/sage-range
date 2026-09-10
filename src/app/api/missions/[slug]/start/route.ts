import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { startSession } from "@/lib/missions";

/**
 * Start or resume a Mission Analyst investigation.
 *
 * One attempt per person per scenario, enforced in the database — a repeated
 * POST resumes the existing session rather than starting a fresh one.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const result = await startSession(user.id, slug);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
