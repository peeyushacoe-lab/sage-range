import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Portfolio Hub Page
 * Redirects authenticated users to their portfolio
 */
export default async function PortfolioHubPage() {
  const user = await getOrCreateAppUser();
  if (!user) {
    redirect("/sign-in");
  }

  // Get user's portfolio to access slug
  const portfolio = await db.careerPortfolio.findUnique({
    where: { userId: user.id },
    select: { slug: true },
  });

  if (!portfolio) {
    // Shouldn't happen (should be auto-created), but fallback to dashboard
    redirect("/dashboard");
  }

  // Redirect to user's public portfolio page
  redirect(`/profile/user/${portfolio.slug}`);
}
