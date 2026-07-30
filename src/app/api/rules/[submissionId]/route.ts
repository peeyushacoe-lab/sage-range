import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getRuleById } from "@/lib/detection-rules";

export async function GET(req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  try {
    const user = await getOrCreateAppUser();
    const userId = user?.id;
    const { submissionId } = await params;

    const result = await getRuleById(submissionId, userId);

    if (!result.success) {
      const statusCode = result.statusCode || 404;
      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    return NextResponse.json(result.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching rule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
