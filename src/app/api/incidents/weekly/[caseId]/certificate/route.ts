import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getUserWeeklyCertificate, getWeeklyCaseById } from "@/lib/weekly-incidents";

/**
 * GET /api/incidents/weekly/[caseId]/certificate
 * Returns the weekly certificate for the authenticated user, if earned.
 * User earns a certificate by completing the case on time (by deadline).
 *
 * Response (200):
 * {
 *   "earned": true,
 *   "certificate": {
 *     "id": "string",
 *     "certCode": "WIC-2026-W01-ABC123DEF",
 *     "season": 2026,
 *     "weekNumber": 1,
 *     "issuedAt": "2026-01-13T02:00:00Z"
 *   }
 * }
 *
 * Response (200): If not earned
 * {
 *   "earned": false,
 *   "certificate": null
 * }
 *
 * Response (401): Not authenticated
 * Response (404): Case not found
 */
export async function GET(req: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const user = await getOrCreateAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { caseId } = await params;

  // Validate case exists
  const case_ = await getWeeklyCaseById(caseId);
  if (!case_) {
    return NextResponse.json({ error: "case_not_found" }, { status: 404 });
  }

  const result = await getUserWeeklyCertificate(user.id, caseId);

  return NextResponse.json({
    earned: result.earned,
    certificate: result.certificate,
  });
}
