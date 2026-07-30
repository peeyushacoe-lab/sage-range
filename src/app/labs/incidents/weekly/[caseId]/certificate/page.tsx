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
    <main className="min-h-screen bg-surface-0 text-white">
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
            <div className="rounded-lg border border-edge bg-surface-1 p-6">
              <div className="flex gap-3">
                <Icon name="info" size={20} className="text-ink-3 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-ink mb-2">
                    What&apos;s Next?
                  </p>
                  <ul className="text-xs text-ink-2 space-y-1">
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
                className="block w-full text-center px-6 py-3 rounded-lg bg-accent-fill text-white font-semibold hover:bg-ok-wash transition"
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
            <div className="rounded-xl border-2 border-warn-edge bg-warn-wash p-12 text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-warn-wash border-2 border-warn-edge flex items-center justify-center">
                  <Icon name="lock" size={32} className="text-warn/60" />
                </div>
              </div>

              <p className="text-lg font-semibold text-white mb-2">
                Certificate Locked
              </p>
              <p className="text-sm text-ink-2 mb-6 max-w-sm mx-auto">
                You haven&apos;t completed this week&apos;s incident challenge yet. Start
                the investigation, submit your evidence board categorization,
                and write your executive report to unlock your certificate.
              </p>

              <Link
                href={`/labs/incidents/weekly/${caseId}`}
                className="inline-block px-6 py-3 rounded-lg bg-accent-fill text-white font-semibold hover:bg-ok-wash transition"
              >
                Start Investigation →
              </Link>
            </div>

            {/* Requirements */}
            <div className="rounded-lg border border-edge bg-surface-1 p-6 mb-8">
              <p className="text-sm font-semibold text-white mb-4">
                Requirements to Earn Certificate
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-edge-strong flex items-center justify-center">
                    <Icon name="check" size={12} className="text-ink-3" />
                  </div>
                  <span className="text-ink-2">
                    Complete the evidence board categorization
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-edge-strong flex items-center justify-center">
                    <Icon name="check" size={12} className="text-ink-3" />
                  </div>
                  <span className="text-ink-2">
                    Write and submit your executive report
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border border-edge-strong flex items-center justify-center">
                    <Icon name="check" size={12} className="text-ink-3" />
                  </div>
                  <span className="text-ink-2">
                    Submit before Sunday 23:59 UTC
                  </span>
                </li>
              </ul>
            </div>

            {/* Info box */}
            <div className="rounded-lg border border-edge bg-surface-1 p-6">
              <div className="flex gap-3">
                <Icon name="info" size={20} className="text-ink-3 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-ink mb-2">
                    Deadline Information
                  </p>
                  <p className="text-xs text-ink-2">
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
