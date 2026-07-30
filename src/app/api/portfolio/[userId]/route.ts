import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const resolvedParams = await params;
  const { userId } = resolvedParams;
  const currentUser = await getOrCreateAppUser();

  // Find portfolio
  const portfolio = await db.careerPortfolio.findUnique({
    where: { userId },
    include: {
      achievements: {
        orderBy: [{ displayOrder: "desc" }, { earnedAt: "desc" }],
      },
      mitreCoverage: true,
      user: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          email: true,
          role: true,
          university: true,
          company: true,
          jobTitle: true,
          linkedIn: true,
          github: true,
          website: true,
        },
      },
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "portfolio_not_found" }, { status: 404 });
  }

  // Check visibility
  if (portfolio.visibility === "PRIVATE") {
    // Only owner can see private portfolio
    if (!currentUser || currentUser.id !== userId) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (portfolio.visibility === "RECRUITER_ONLY") {
    // Only recruiters can see recruiter-only portfolios
    if (!currentUser || currentUser.role !== "RECRUITER") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  // PUBLIC portfolios are visible to everyone

  // Log visitor (optional)
  if (currentUser) {
    await db.portfolioVisitorLog.create({
      data: {
        portfolioId: portfolio.id,
        visitorId: currentUser.id,
      },
    });
  }

  // Return portfolio without sensitive data
  return NextResponse.json({
    ...portfolio,
    user: portfolio.user,
  });
}
