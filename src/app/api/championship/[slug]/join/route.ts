import { NextResponse } from "next/server";
import { getOrCreateAppUser } from "@/lib/current-user";
import { joinChampionship, syncEntryScore, getChampionshipBySlug } from "@/lib/championships";

/** Enter the current user into a championship. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const result = await joinChampionship(user.id, slug);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }

  // Credit anything already solved inside the window, so entering late does
  // not discard work done earlier in the month.
  const championship = await getChampionshipBySlug(slug);
  if (championship) await syncEntryScore(championship.id, user.id);

  return NextResponse.json({ entryId: result.data.entryId }, { status: 201 });
}
