import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { rateLimit } from "@/lib/rate-limit";
import {
  requestMentorship,
  respondToMentorship,
  listMentorships,
} from "@/lib/social";

const PostBody = z.object({
  mentorId: z.string().min(1),
  focus: z.string().max(200).optional(),
});

const PatchBody = z.object({
  pairId: z.string().min(1),
  accept: z.boolean(),
});

/** Every mentorship touching the caller, in both directions. */
export async function GET() {
  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { asMentor, asMentee } = await listMentorships(user.id);

  return NextResponse.json({
    asMentor: asMentor.map((p) => ({
      id: p.id,
      status: p.status,
      focus: p.focus,
      startedAt: p.startedAt,
      mentee: {
        id: p.mentee.id,
        displayName: p.mentee.displayName || p.mentee.email,
        avatarUrl: p.mentee.avatarUrl,
      },
    })),
    asMentee: asMentee.map((p) => ({
      id: p.id,
      status: p.status,
      focus: p.focus,
      startedAt: p.startedAt,
      mentor: {
        id: p.mentor.id,
        displayName: p.mentor.displayName || p.mentor.email,
        avatarUrl: p.mentor.avatarUrl,
      },
    })),
  });
}

/** Ask someone to mentor you. */
export async function POST(req: Request) {
  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await rateLimit(`mentorship-request:${user.id}`, {
    max: 20,
    windowSec: 86400,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "86400" } },
    );
  }

  const result = await requestMentorship({
    menteeId: user.id,
    mentorId: parsed.data.mentorId,
    focus: parsed.data.focus,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data, { status: 201 });
}

/** Accept or decline a request addressed to the caller as mentor. */
export async function PATCH(req: Request) {
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const user = await getOrCreateAppUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await respondToMentorship({
    mentorId: user.id,
    pairId: parsed.data.pairId,
    accept: parsed.data.accept,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode });
  }
  return NextResponse.json(result.data);
}
