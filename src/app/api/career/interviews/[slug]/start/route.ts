import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import { startInterview } from "@/lib/career";

/** Begin a mock interview. Only prompts are returned, never ideal answers. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`interview-start:${user.id}`, {
    max: 20,
    windowSec: 86400,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const { slug } = await params;
  const result = await startInterview(user.id, slug);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data, { status: 201 });
}
