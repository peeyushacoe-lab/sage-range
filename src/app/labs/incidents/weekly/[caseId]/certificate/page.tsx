import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PageHeader, StatCard } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { CertificateCard } from "../../_components/certificate-card";

export const dynamic = "force-dynamic";

interface Certificate {
  id: string;
  certCode: string;
  season: number;
  weekNumber: number;
  issuedAt: string;
}

async function getCertificate(caseId: string): Promise<{
  earned: boolean;
  certificate: Certificate | null;
} | null> {
  try {
    const response = await fetch(
      `/api/incidents/weekly/${caseId}/certificate`,
      { cache: "no-store" }
    );

    if (!response.ok) return null;

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch certificate:", error);
    return null;
  }
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const certData = await getCertificate(caseId);
  if (!certData) {
    notFound();
  }

  const { earned, certificate } = certData;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar
        backHref={`/labs/incidents/weekly/${caseId}`}
        backLabel="Back to Case"
      />

      <div className="max-w-2xl mx-auto px-6 py-8">
        {earned && certificate ? (
          <>
            {/* Header */}
            <PageHeader
              className="mb-8"
              eyebrow="Certificate Earned"
              title="Weekly Incident Challenge Complete"
              subtitle="Congratulations on completing the weekly incident investigation. Your certificate is ready to share with the world."
            />

            {/* Certificate Card */}
            <div className="mb-8">
              <CertificateCard
                certCode={certificate.certCode}
                season={certificate.season}
                weekNumber={certificate.weekNumber}
                issuedAt={certificate.issuedAt}
                userEmail={user.email}
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <StatCard
                label="Certificate Code"
                value={certificate.certCode.slice(-6)}
                sub="last 6 characters"
              />
              <StatCard
                label="Verified by"
                value="Sage Vault"
                sub="incident platform"
              />
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-6">
              <div className="flex gap-3">
                <Icon name="info" size={20} className="text-zinc-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-zinc-100 mb-2">
                    What&apos;s Next?
                  </p>
                  <ul className="text-xs text-zinc-400 space-y-1">
                    <li>• Add this certificate to your LinkedIn profile</li>
                    <li>
                      • Your ranking appears on the public leaderboard for this week
                    </li>
                    <li>• Recruiters can verify your achievement</li>
                    <li>
                      • Complete future weekly challenges to build your streak
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="mt-8">
              <Link
                href={`/labs/incidents/weekly/${caseId}`}
                className="block w-full text-center px-6 py-3 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-600 transition"
              >
                Back to Case
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Header */}
            <PageHeader
              className="mb-8"
              eyebrow="Certificate Not Earned"
              title="Complete the Challenge to Earn Your Certificate"
              subtitle="Finish the incident investigation, categorize evidence, and submit your report before the Sunday deadline."
            />

            {/* Empty state */}
            <div className="rounded-xl border-2 border-amber-500/20 bg-amber-500/5 p-12 text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center">
                  <Icon name="lock" size={32} className="text-amber-400/60" />
                </div>
              </div>

              <p className="text-lg font-semibold text-white mb-2">
                Certificate Locked
              </p>
              <p className="text-sm text-zinc-400 mb-6 max-w-sm mx-auto">
                You haven&apos;t completed this week&apos;s incident challenge yet. Start
                the investigation, submit your evidence board categorization,
                and write your executive report to unlock your certificate.
              </p>

              <Link
                href={`/labs/incidents/weekly/${caseId}`}
                className="inline-block px-6 py-3 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-600 transition"
              >
                Start Investigation →
              </Link>
            </div>

            {/* Requirements */}
            <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-6 mb-8">
              <p className="text-sm font-semibold text-white mb-4">
                Requirements to Earn Certificate
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center">
                    <Icon name="check" size={12} className="text-zinc-500" />
                  </div>
                  <span className="text-zinc-400">
                    Complete the evidence board categorization
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center">
                    <Icon name="check" size={12} className="text-zinc-500" />
                  </div>
                  <span className="text-zinc-400">
                    Write and submit your executive report
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-white/20 flex items-center justify-center">
                    <Icon name="check" size={12} className="text-zinc-500" />
                  </div>
                  <span className="text-zinc-400">
                    Submit before Sunday 23:59 UTC
                  </span>
                </li>
              </ul>
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-white/8 bg-zinc-900/40 p-6">
              <div className="flex gap-3">
                <Icon name="info" size={20} className="text-zinc-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-zinc-100 mb-2">
                    Deadline Information
                  </p>
                  <p className="text-xs text-zinc-400">
                    Each weekly case is available from Monday 00:00 UTC through
                    Sunday 23:59 UTC. After the deadline, the case is archived
                    but you can still review it for learning purposes.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
