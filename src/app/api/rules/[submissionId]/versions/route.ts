import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getRuleVersions } from "@/lib/detection-rules";

export async function GET(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  try {
    const user = await getOrCreateAppUser();
    const { submissionId } = await params;
    const result = await getRuleVersions(submissionId, user?.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 404 });
    }

    return NextResponse.json(
      {
        submissionId,
        versions: result.versions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
