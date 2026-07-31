import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { startRun } from "@/lib/crisis";

/** Open a crisis run, or resume the one already in progress. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const result = await startRun(user.id, slug);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  return NextResponse.json(result.data, { status: result.data.resumed ? 200 : 201 });
}
