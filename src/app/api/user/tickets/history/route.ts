import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getUserTicketHistory } from "@/lib/tickets";

const QuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).default("20"),
  offset: z.string().regex(/^\d+$/).transform(Number).default("0"),
});

export async function GET(req: Request) {
  try {
    const user = await getOrCreateAppUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // Parse query params
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      limit: url.searchParams.get("limit") || "20",
      offset: url.searchParams.get("offset") || "0",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters" },
        { status: 400 },
      );
    }

    // Ensure reasonable limits
    const limit = Math.min(parsed.data.limit, 100);
    const offset = Math.max(parsed.data.offset, 0);

    // Get user's ticket history
    const history = await getUserTicketHistory(user.id, limit, offset);

    return NextResponse.json({
      userId: user.id,
      items: history,
      count: history.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[GET /api/user/tickets/history] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
