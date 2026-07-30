import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { CertificateFrame, type SidebarStat } from "@/components/certificate/certificate-frame";
import { requestCertificateApproval } from "@/lib/certificate-approval";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

export default async function LabsCertificatePage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const labs = await db.lab.findMany({
    where: { published: true },
    select: { id: true, category: true, difficulty: true },
  });
  const totalLabs = labs.length;

  const solvedAttempts = await db.attempt.findMany({
    where: { userId: user.id, status: "SOLVED", labId: { in: labs.map((l) => l.id) } },
    select: { solvedAt: true },
  });

  // Requires 100% of every currently published lab — the hardest of the
  // platform's certificates by design (see conversation: certificates should
  // not be easy to earn).
  const canCert = totalLabs > 0 && solvedAttempts.length >= totalLabs;
  if (!canCert) redirect("/labs");

  const issuedOn = solvedAttempts.reduce<Date>(
    (latest, a) => (a.solvedAt && a.solvedAt > latest ? a.solvedAt : latest),
    new Date(0)
  );

  let approval = await db.certificateApproval.findUnique({
    where: { userId_kind_targetId: { userId: user.id, kind: "LABS", targetId: "" } },
  });
  if (!approval) {
    approval = await requestCertificateApproval(user.id, "LABS", "", "All Labs Completed");
  }

  if (approval?.status !== "APPROVED") {
    return (
      <>
        <div className="no-print"><Navbar backHref="/labs" backLabel="Labs" /></div>
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6 text-center gap-4">
          <p className="text-5xl flex justify-center">{approval?.status === "REJECTED" ? <Icon name="cross" size={48} /> : "⏳"}</p>
          <h1 className="text-2xl font-bold">
            {approval?.status === "REJECTED" ? "Certificate request not approved" : "Certificate pending admin approval"}
          </h1>
          <p className="text-zinc-400 max-w-md">
            {approval?.status === "REJECTED"
              ? "An admin reviewed your completed labs and did not approve the certificate. Contact your instructor for details."
              : "You've solved every lab on the platform — an admin needs to approve your certificate before you can view it. You'll get a notification the moment it's approved."}
          </p>
        </div>
      </>
    );
  }

  const candidateName = user.displayName ?? user.email.split("@")[0];
  const domains = [...new Set(labs.map((l) => l.category))].slice(0, 6);
  const DIFF_COUNT: Record<string, number> = { EASY: 0, MEDIUM: 0, HARD: 0, INSANE: 0 };
  for (const l of labs) DIFF_COUNT[l.difficulty] = (DIFF_COUNT[l.difficulty] ?? 0) + 1;

  const stats: SidebarStat[] = [
    { icon: "target", label: "Labs Completed", value: `${totalLabs} / ${totalLabs}` },
    { icon: "layers", label: "Categories Covered", value: `${domains.length}` },
    { icon: "shield", label: "Insane-Tier Labs", value: `${DIFF_COUNT.INSANE ?? 0}` },
  ];

  return (
    <>
      <style>{`@media print { .no-print { display: none } }`}</style>
      <div className="no-print"><Navbar backHref="/labs" backLabel="Labs" /></div>

      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-5xl">
          <CertificateFrame
            recipientName={candidateName}
            intro="has successfully completed"
            title="Every Lab on Sage Vault"
            detail="across CTF, Blue Team, and Red Team disciplines — including all Easy, Medium, Hard, and Insane-tier challenges."
            issuedOn={issuedOn}
            stats={stats}
            lists={domains.length > 0 ? [{ icon: "layers", label: "Covered Domains", items: domains }] : []}
          />
        </div>
      </div>
    </>
  );
}
