import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(len = 6): string {
  return Array.from(randomBytes(len), (b) => ALPHABET[b % ALPHABET.length]).join("");
}

// Reject private/loopback IPs to prevent SSRF
const PRIVATE_IP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|169\.254\.|0\.0\.0\.0|::1$|localhost$)/i;

function isSafeWebhookUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    if (PRIVATE_IP.test(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const user = await getOrCreateAppUser();
  if (!user || user.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, webhookUrl } = await req.json() as { name?: string; webhookUrl?: string };
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const trimmedWebhook = webhookUrl?.trim();
  if (trimmedWebhook && !isSafeWebhookUrl(trimmedWebhook)) {
    return NextResponse.json({ error: "Webhook URL must be a public HTTPS address" }, { status: 400 });
  }

  let joinCode = makeCode();
  let tries = 0;
  while (tries < 5) {
    const exists = await db.classroom.findUnique({ where: { joinCode } });
    if (!exists) break;
    joinCode = makeCode();
    tries++;
  }

  const classroom = await db.classroom.create({
    data: {
      name: name.trim(),
      joinCode,
      instructorId: user.id,
      ...(trimmedWebhook ? { webhookUrl: trimmedWebhook } : {}),
    },
  });

  return NextResponse.json({ id: classroom.id, joinCode: classroom.joinCode });
}
