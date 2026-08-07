import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { startRun } from "@/lib/ozh";
import { isPreviewer } from "@/lib/ozh-preview";

/**
 * Start Operation Zero Hour.
 *
 * Takes no body. The run is keyed on the authenticated user, and the single
 * attempt is enforced in the database — a repeated POST resumes rather than
 * restarting, so a double-click cannot cost someone their one attempt.
 *
 * Preview status is read from the server's allowlist against the session's
 * email. It is never accepted from the request, or anyone could grant
 * themselves a run that is exempt from the leaderboard and resettable.
 */
export async function POST() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await startRun(user.id, new Date(), isPreviewer(user.email));
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
