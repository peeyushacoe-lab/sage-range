import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const QueryParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "INSANE"]).optional(),
  category: z.string().optional(),
});

export async function GET(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Parse query parameters
  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsed = QueryParams.safeParse(queryParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "bad_request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { page, limit, difficulty, category } = parsed.data;
  const skip = (page - 1) * limit;

  // Build filter conditions
  const where: Record<string, unknown> = { published: true };
  if (difficulty) where.difficulty = difficulty;
  if (category) where.category = category;

  // Fetch datasets and total count
  const [datasets, total] = await Promise.all([
    db.huntDataset.findMany({
      where,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        difficulty: true,
        category: true,
        logCount: true,
        formatType: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.huntDataset.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    datasets,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
  });
}
