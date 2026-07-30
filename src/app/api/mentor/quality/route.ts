import { NextResponse } from "next/server";
import { getTopQualityHints } from "@/lib/ai-mentor";

export async function GET(req: Request) {
  try {
    // Optional limit parameter
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);

    if (limit < 1 || limit > 500) {
      return NextResponse.json(
        { error: "invalid_limit" },
        { status: 400 }
      );
    }

    // Get top quality hints
    const hints = await getTopQualityHints(limit);

    return NextResponse.json({
      hints,
      total: hints.length,
    });
  } catch (error) {
    console.error("[AI Mentor] Error in GET /api/mentor/quality:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
