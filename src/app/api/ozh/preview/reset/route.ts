import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { resetPreviewRun } from "@/lib/ozh";
import { isPreviewer } from "@/lib/ozh-preview";

/**
 * Discard the caller's preview run so they can walk the console again.
 *
 * Two independent gates, deliberately: the caller must be on the allowlist
 * *and* the run itself must be flagged preview. Either one alone would be
 * enough to protect a competitor's attempt, which is exactly why both are
 * here — this endpoint deletes a run, and the cost of it being wrong is
 * someone's single attempt.
 */
export async function POST() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!isPreviewer(user.email)) {
    return NextResponse.json({ error: "Not available on this account" }, { status: 403 });
  }

  const result = await resetPreviewRun(user.id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
