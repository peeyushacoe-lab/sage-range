import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;

  const dataset = await db.huntDataset.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      difficulty: true,
      category: true,
      logCount: true,
      formatType: true,
      // Do NOT include expectedArtifacts or hints in student responses
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!dataset || !dataset.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Check if user has already started a session with this dataset
  const existingSession = await db.huntInvestigationSession.findFirst({
    where: {
      userId: user.id,
      datasetId: dataset.id,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return NextResponse.json({
    dataset,
    hasActiveSession: !!existingSession,
  });
}
