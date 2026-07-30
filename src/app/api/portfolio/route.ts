import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { generateUniqueSlug } from "@/lib/slug-utils";

export async function GET(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Get user's portfolio with all achievements
  const portfolio = await db.careerPortfolio.findUnique({
    where: { userId: user.id },
    include: {
      achievements: {
        orderBy: [{ displayOrder: "desc" }, { earnedAt: "desc" }],
      },
      mitreCoverage: true,
    },
  });

  if (!portfolio) {
    // First time access - create portfolio
    const slug = await generateUniqueSlug(user.displayName || user.email);
    const newPortfolio = await db.careerPortfolio.create({
      data: {
        userId: user.id,
        slug,
        visibility: "PRIVATE",
      },
      include: {
        achievements: true,
        mitreCoverage: true,
      },
    });
    return NextResponse.json(newPortfolio);
  }

  return NextResponse.json(portfolio);
}

const UpdateBioSchema = z.object({
  bio: z.string().max(5000).nullable(),
});

export async function PATCH(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = UpdateBioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error }, { status: 400 });
  }

  // Get or create portfolio
  let portfolio = await db.careerPortfolio.findUnique({
    where: { userId: user.id },
  });

  if (!portfolio) {
    const slug = await generateUniqueSlug(user.displayName || user.email);
    portfolio = await db.careerPortfolio.create({
      data: {
        userId: user.id,
        slug,
        bio: parsed.data.bio,
      },
    });
  } else {
    portfolio = await db.careerPortfolio.update({
      where: { userId: user.id },
      data: { bio: parsed.data.bio },
    });
  }

  return NextResponse.json(portfolio);
}
