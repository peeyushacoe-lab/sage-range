import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/current-user";
import { decideCertificate } from "@/lib/certificate-approval";

const Body = z.object({
  userId:   z.string().min(1),
  kind:     z.enum(["PATH", "ACADEMY", "IR", "LABS", "SIMULATION"]),
  targetId: z.string(),           // "" for IR
  title:    z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
});

export async function PATCH(req: Request) {
  const admin = await getOrCreateAppUser();
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  await decideCertificate({ ...parsed.data, adminId: admin.id });

  return NextResponse.json({ ok: true });
}
