import { NextResponse } from "next/server";
import { listSkillAssessments } from "@/lib/career";

/** Published verified assessments. Question content is not included. */
export async function GET() {
  const assessments = await listSkillAssessments();
  return NextResponse.json({ assessments });
}
