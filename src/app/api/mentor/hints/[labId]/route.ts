import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getHintsByLab } from "@/lib/ai-mentor";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ labId: string }> }
) {
  try {
    const { labId } = await params;

    // Verify lab exists
    const lab = await db.lab.findUnique({ where: { id: labId } });
    if (!lab) {
      return NextResponse.json({ error: "lab_not_found" }, { status: 404 });
    }

    // Get hints grouped by stage with quality stats
    const hints = await getHintsByLab(labId);

    return NextResponse.json({
      labId,
      labTitle: lab.title,
      hints,
    });
  } catch (error) {
    console.error("[AI Mentor] Error in GET /api/mentor/hints/[labId]:", error);
    return NextResponse.json(
      { error: "internal_server_error" },
      { status: 500 }
    );
  }
}
