import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getReplayEligibleHints } from "@/lib/ai-mentor";

export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  try {
    // Get hints eligible for replay
    const eligible = await getReplayEligibleHints(user.id);

    return NextResponse.json({
      userId: user.id,
      eligible,
      totalEligible: eligible.length,
    });
  } catch (error) {
    console.error(
      "[AI Mentor] Error in GET /api/mentor/user/replay-eligible:",
      error
    );
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
