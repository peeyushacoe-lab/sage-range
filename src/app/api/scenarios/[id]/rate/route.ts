import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { canRateScenario, isValidStars, type ScenarioVisibility } from "@/lib/scenario-sharing";

const Body = z.object({
  stars: z.number().int().min(1).max(5),
  review: z.string().max(2000).optional(),
});

/** Rate a scenario. Re-rating updates the existing row rather than stacking. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || !isValidStars(parsed.data.stars)) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const scenario = await db.customScenario.findUnique({ where: { id } });
  if (!scenario) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });

  const allowed = canRateScenario(
    {
      createdById: scenario.createdById,
      visibility: scenario.visibility as ScenarioVisibility,
      published: scenario.published,
    },
    { userId: user.id, isAdmin: user.role === "ADMIN" },
  );
  if (!allowed) {
    return NextResponse.json({ error: "You cannot rate this scenario" }, { status: 403 });
  }

  const rating = await db.scenarioRating.upsert({
    where: { scenarioId_userId: { scenarioId: id, userId: user.id } },
    create: {
      scenarioId: id,
      userId: user.id,
      stars: parsed.data.stars,
      review: parsed.data.review?.trim() || null,
    },
    update: {
      stars: parsed.data.stars,
      review: parsed.data.review?.trim() || null,
    },
    select: { id: true, stars: true },
  });

  return NextResponse.json(rating);
}
