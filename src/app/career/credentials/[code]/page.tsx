import type { Metadata } from "next";
import Link from "next/link";
import { verifyCredential } from "@/lib/career";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

// Public page: a recruiter checking a candidate will not have an account, so
// this deliberately does not call getOrCreateAppUser or redirect to sign-in.
export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const credential = await verifyCredential(code);

  if (!credential) return { title: "Credential Verification — Sage Vault" };

  const title = `${credential.holder} — ${credential.assessment} | Sage Vault`;
  const description = `Verified Sage Vault credential ${credential.code}, issued ${formatDate(credential.issuedAt)}.`;

  return { title, description, openGraph: { title, description, type: "website" } };
}

const STATUS: Record<string, { tone: "emerald" | "amber" | "red"; label: string; note: string }> = {
  ACTIVE: {
    tone: "emerald",
    label: "Valid",
    note: "This credential is currently valid.",
  },
  EXPIRED: {
    tone: "amber",
    label: "Expired",
    note: "This credential was genuinely earned but has passed its validity period.",
  },
  REVOKED: {
    tone: "red",
    label: "Revoked",
    note: "This credential has been revoked and should not be relied upon.",
  },
};

export default async function CredentialVerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const credential = await verifyCredential(code);

  if (!credential) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <Card className="max-w-md p-8 text-center">
          <Icon name="alert" size={36} />
          <h1 className="mt-4 text-xl font-bold">No such credential</h1>
          <p className="mt-2 text-sm text-zinc-400">
            No Sage Vault credential matches the code{" "}
            <span className="font-mono text-zinc-300">{code}</span>. Check the code and try
            again.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm text-emerald-400 hover:underline"
          >
            Go to Sage Vault →
          </Link>
        </Card>
      </main>
    );
  }

  const status = STATUS[credential.status] ?? STATUS.REVOKED;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg">
        <Card className="p-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Icon name="verified" size={24} />
              <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                Sage Vault credential
              </span>
            </div>
            <Badge tone={status.tone}>{status.label}</Badge>
          </div>

          <h1 className="text-2xl font-bold">{credential.assessment}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Awarded to <span className="text-zinc-200">{credential.holder}</span>
          </p>

          <div className="my-6 grid grid-cols-2 gap-4 border-y border-white/8 py-5">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Score</p>
              <p className="mt-1 font-mono text-2xl font-black tabular-nums text-emerald-400">
                {credential.score}%
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Domain</p>
              <p className="mt-1 text-sm text-zinc-200">{credential.domain}</p>
              <p className="text-xs text-zinc-500">{credential.difficulty}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Issued</p>
              <p className="mt-1 text-sm text-zinc-200">{formatDate(credential.issuedAt)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Expires</p>
              <p className="mt-1 text-sm text-zinc-200">
                {credential.expiresAt ? formatDate(credential.expiresAt) : "No expiry"}
              </p>
            </div>
          </div>

          <p className="text-xs text-zinc-500">{status.note}</p>

          <div className="mt-6 rounded-md border border-white/8 bg-zinc-900/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Verification code
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
              {credential.code}
            </p>
          </div>
        </Card>

        <p className="mt-4 text-center text-xs text-zinc-600">
          Verified against Sage Vault records at time of viewing ·{" "}
          <Link href="/" className="text-zinc-500 hover:text-emerald-400">
            cybersagevault.uk
          </Link>
        </p>
      </div>
    </main>
  );
}
