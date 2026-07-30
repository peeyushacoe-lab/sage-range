import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { generateUniqueSlug } from "@/lib/slug-utils";

const VisibilitySchema = z.object({
  visibility: z.enum(["PRIVATE", "PUBLIC", "RECRUITER_ONLY"]),
});

export async function PATCH(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json() as unknown;
  const parsed = VisibilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error }, { status: 400 });
  }

  // Get or create portfolio
  let portfolio = await db.careerPortfolio.findUnique({
    where: { userId: user.id },
  });

  if (!portfolio) {
    // Generate slug if creating new portfolio
    const slug = await generateUniqueSlug(user.displayName || user.email);
    portfolio = await db.careerPortfolio.create({
      data: {
        userId: user.id,
        slug,
        visibility: parsed.data.visibility,
      },
    });
  } else {
    portfolio = await db.careerPortfolio.update({
      where: { userId: user.id },
      data: { visibility: parsed.data.visibility },
    });
  }

  return NextResponse.json(portfolio);
}
