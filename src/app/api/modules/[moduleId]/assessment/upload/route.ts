import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { audit } from "@/lib/audit";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_TYPES: Record<string, string[]> = {
  PDF: ["application/pdf"],
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
  ZIP: ["application/zip", "application/x-zip-compressed"],
};

// Extension derived from MIME type — never trust the client-supplied filename extension
const MIME_TO_EXT: Record<string, string> = {
  "application/pdf":           "pdf",
  "image/jpeg":                "jpg",
  "image/png":                 "png",
  "image/webp":                "webp",
  "application/zip":           "zip",
  "application/x-zip-compressed": "zip",
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ moduleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId } = await params;
  const form = await req.formData();
  const file = form.get("file");
  const type = String(form.get("type") ?? "");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!ALLOWED_TYPES[type]) return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  if (!ALLOWED_TYPES[type].includes(file.type)) {
    return NextResponse.json({ error: `Invalid file type for ${type}` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type] ?? "bin";
  const blob = await put(
    `assessments/${moduleId}/${session.user.id}-${Date.now()}.${ext}`,
    file,
    { access: "public" }
  );

  audit({ actorId: session.user.id, action: "FILE_UPLOAD", target: blob.url,
    req, meta: { moduleId, mimeType: file.type, sizeBytes: file.size } });
  return NextResponse.json({ url: blob.url });
}
