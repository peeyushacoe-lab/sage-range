import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";

const RequirementsSchema = z.object({
  minSimGrade: z.enum(["A", "B", "C", "D", "F"]).optional(),
  minScore: z.number().int().min(0).optional(),
  requiredPaths: z.array(z.string()).optional(),
});

const PostBody = z.object({
  title: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  requirements: RequirementsSchema,
});

export async function GET() {
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "RECRUITER" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const postings = await db.jobPosting.findMany({
    where: { recruiterId: me.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(postings);
}

export async function POST(req: Request) {
  const me = await getOrCreateAppUser();
  if (!me || (me.role !== "RECRUITER" && me.role !== "ADMIN")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = PostBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request", issues: parsed.error.issues }, { status: 400 });
  }

  const { title, company, description, requirements } = parsed.data;

  const posting = await db.jobPosting.create({
    data: {
      recruiterId: me.id,
      title,
      company,
      description,
      requirements,
      active: true,
    },
  });

  return NextResponse.json(posting, { status: 201 });
}
