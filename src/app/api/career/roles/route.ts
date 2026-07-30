import { NextResponse } from "next/server";
import { listRoleProfiles } from "@/lib/career";

/** Published target roles a user can measure themselves against. */
export async function GET() {
  const roles = await listRoleProfiles();

  return NextResponse.json({
    roles: roles.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description,
      seniority: r.seniority,
      recommendedPathSlugs: r.recommendedPathSlugs,
    })),
  });
}
