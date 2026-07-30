import { NextResponse } from "next/server";
import { z } from "zod";
import { getCommunityRules } from "@/lib/detection-rules";

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(["score", "createdAt", "popularity"]).default("createdAt"),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const queryParams = {
      limit: url.searchParams.get("limit"),
      offset: url.searchParams.get("offset"),
      sortBy: url.searchParams.get("sortBy"),
    };

    const parsed = Query.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const result = await getCommunityRules(parsed.data.limit, parsed.data.offset, parsed.data.sortBy);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching community rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
