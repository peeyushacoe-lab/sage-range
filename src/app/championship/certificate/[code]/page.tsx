import type { Metadata } from "next";
import Link from "next/link";
import { verifyChampionshipAward } from "@/lib/championships";
import { Card, Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

// Public: a recruiter checking a placing will not have an account.
export const dynamic = "force-dynamic";

const TIER_TONE = {
  CHAMPION: "amber",
  MEDALLIST: "purple",
  FINALIST: "blue",
  COMPETITOR: "zinc",
} as const;

const TIER_BLURB: Record<string, string> = {
  CHAMPION: "Finished first on the monthly leaderboard.",
  MEDALLIST: "Finished on the podium.",
  FINALIST: "Finished in the top tier of the field.",
  COMPETITOR: "Took part in the monthly championship.",
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const award = await verifyChampionshipAward(code);
  if (!award) return { title: "Championship Certificate — Sage Vault" };

  const title = `${award.holder} — ${award.championship} | Sage Vault`;
  const description = `Placed #${award.rank} in the ${award.championship}, verified ${formatDate(award.issuedAt)}.`;
  return { title, description, openGraph: { title, description, type: "website" } };
}

export default async function ChampionshipCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const award = await verifyChampionshipAward(code);

  if (!award) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
        <Card className="max-w-md p-8 text-center">
          <Icon name="alert" size={36} />
          <h1 className="mt-4 text-xl font-bold">No such certificate</h1>
          <p className="mt-2 text-sm text-zinc-400">
            No championship certificate matches{" "}
            <span className="font-mono text-zinc-300">{code}</span>.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm text-emerald-400 hover:underline">
            Go to Sage Vault →
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12 text-white">
      <div className="w-full max-w-lg">
        <Card className="p-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Icon name="trophy" size={28} />
            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
              Sage Vault championship
            </span>
          </div>

          <Badge tone={TIER_TONE[award.tier as keyof typeof TIER_TONE] ?? "zinc"}>
            {award.tier}
          </Badge>

          <h1 className="mt-4 text-2xl font-bold">{award.championship}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Awarded to <span className="text-zinc-200">{award.holder}</span>
          </p>

          <p className="my-6 font-mono text-6xl font-black tabular-nums text-emerald-400">
            #{award.rank}
          </p>

          <p className="text-sm text-zinc-400">{TIER_BLURB[award.tier] ?? ""}</p>

          <div className="mt-6 rounded-md border border-white/8 bg-zinc-900/50 px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Verification code
            </p>
            <p className="mt-1 font-mono text-sm font-bold text-emerald-400">
              {award.certCode}
            </p>
            <p className="mt-2 text-xs text-zinc-600">Issued {formatDate(award.issuedAt)}</p>
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
