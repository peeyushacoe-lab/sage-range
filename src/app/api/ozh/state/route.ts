import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getRunState, expireRun } from "@/lib/ozh";

export const dynamic = "force-dynamic";

/**
 * Poll for run state: time remaining, current phase, phases already locked.
 *
 * The console polls this rather than trusting its own countdown, so a tab left
 * open overnight or a clock nudged forward does not change when the run ends.
 * A run found past its deadline is closed and graded here rather than being
 * left open until the next sweep.
 */
export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const state = await getRunState(user.id);
  if (!state) return NextResponse.json({ run: null });

  if (state.expired) {
    await expireRun(state.runId);
    const closed = await getRunState(user.id);
    return NextResponse.json({ run: closed });
  }

  return NextResponse.json({ run: state });
}
