import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { computeSkillGap } from "@/lib/career";

/**
 * Recompute the caller's readiness for a role.
 *
 * POST rather than GET because it writes a snapshot; the result is returned
 * directly so the UI does not need a follow-up read.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const result = await computeSkillGap(user.id, slug);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
