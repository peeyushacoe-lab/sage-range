import { NextResponse } from "next/server";
import { verifyCredential } from "@/lib/career";

/**
 * Public credential verification. Deliberately unauthenticated: a recruiter
 * checking a candidate's credential will not have an account.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const credential = await verifyCredential(code);

  if (!credential) {
    return NextResponse.json(
      { valid: false, error: "No credential with that code" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    valid: credential.status === "ACTIVE",
    credential,
  });
}
