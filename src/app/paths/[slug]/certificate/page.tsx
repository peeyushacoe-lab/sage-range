import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PrintBtn } from "./_components/print-btn";
import { LinkedInShareBtn } from "./_components/linkedin-share-btn";
import { TASK_STAGES } from "@/app/labs/[slug]/_content";
import { CertificateFrame, type SidebarStat } from "@/components/certificate/certificate-frame";
import { certificateQrSvg } from "@/components/certificate/qr";
import { computeMitreCoverage } from "@/lib/insights/mitre";
import { requestCertificateApproval } from "@/lib/certificate-approval";

export const dynamic = "force-dynamic";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const path = await db.learningPath.findUnique({
    where: { slug },
    include: {
      labs: {
        include: { lab: true },
        orderBy: { order: "asc" },
      },
      modules: {
        where: { published: true },
        select: { id: true },
      },
    },
  });

  if (!path || !path.published) redirect(`/paths/${slug}`);

  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const userProgress = await db.userPathProgress.findUnique({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
  });

  const hasModules = path.modules.length > 0;

  // completedAt is authoritative for both path kinds — the path page (or the
  // module-progress hook) sets it once everything is done. The per-lab stage
  // check below is only a fallback for lab-based paths where the user finished
  // the last lab but hasn't revisited the path page to trigger that update.
  let canCert = !!userProgress?.completedAt;
  if (!canCert && !hasModules) {
    // Lab-based path: check all labs
    const labIds = path.labs.map((pl) => pl.labId);
    const labResponses = await db.labResponse.findMany({
      where: { userId: user.id, labId: { in: labIds } },
      select: { labId: true, stage: true },
    });
    const completedByLab = new Map<string, Set<string>>();
    for (const r of labResponses) {
      if (!completedByLab.has(r.labId)) completedByLab.set(r.labId, new Set());
      completedByLab.get(r.labId)!.add(r.stage);
    }
    canCert = path.labs.every((pl) => {
      const stages = TASK_STAGES[pl.lab.slug] ?? [];
      if (stages.length === 0) return false;
      const done = completedByLab.get(pl.labId);
      return stages.every((s) => done?.has(s));
    });
  }

  if (!canCert || !userProgress) redirect(`/paths/${slug}`);

  // Backfill an approval request if the path is complete but none exists yet
  // (pre-workflow completions / seeded progress). Idempotent.
  let approval = await db.certificateApproval.findUnique({
    where: { userId_kind_targetId: { userId: user.id, kind: "PATH", targetId: path.id } },
  });
  if (!approval) {
    approval = await requestCertificateApproval(user.id, "PATH", path.id, path.title);
  }

  if (approval?.status !== "APPROVED") {
    return (
      <>
        <div className="no-print"><Navbar backHref={`/paths/${slug}`} backLabel="Path" /></div>
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6 text-center gap-4">
          <p className="text-5xl">{approval?.status === "REJECTED" ? "✗" : "⏳"}</p>
          <h1 className="text-2xl font-bold">
            {approval?.status === "REJECTED" ? "Certificate request not approved" : "Certificate pending admin approval"}
          </h1>
          <p className="text-zinc-400 max-w-md">
            {approval?.status === "REJECTED"
              ? "An admin reviewed your completed path and did not approve the certificate. Contact your instructor for details."
              : "You've completed every requirement for this path — an admin needs to approve your certificate before you can view it. You'll get a notification the moment it's approved."}
          </p>
        </div>
      </>
    );
  }

  const candidateName = user.displayName ?? user.email.split("@")[0];

  const irCert = await db.iRCertification.findUnique({
    where: { userId: user.id },
    select: { certId: true, unlockedAt: true },
  });

  // Sidebar data: MITRE coverage from the user's real progress, covered
  // domains from this path's lab categories, curriculum hours estimated
  // from lab difficulty.
  const mitre = await computeMitreCoverage(user.id);
  const domains = [...new Set(path.labs.map((pl) => pl.lab.category))].slice(0, 6);
  const HOURS: Record<string, number> = { EASY: 1, MEDIUM: 1.5, HARD: 2.5, INSANE: 4 };
  const trainingHours = Math.max(1, Math.round(path.labs.reduce((s, pl) => s + (HOURS[pl.lab.difficulty] ?? 1), 0)));

  let capstone: string | undefined;
  if (path.capstoneSimulationSlug) {
    const capSim = await db.incidentSimulation.findUnique({
      where: { slug: path.capstoneSimulationSlug },
      select: { codename: true, title: true },
    });
    if (capSim) capstone = `${capSim.codename} · ${capSim.title}`;
  }

  const stats: SidebarStat[] = [
    { icon: "clock", label: "Training Hours", value: `${trainingHours} Hours` },
    { icon: "target", label: "MITRE ATT&CK Coverage", value: `${mitre.coveragePct}%` },
  ];
  if (irCert) stats.push({ icon: "shield", label: "Certificate ID", value: irCert.certId });
  stats.push({ icon: "doc", label: "Certificate No.", value: `CSV-${(userProgress.completedAt ?? new Date()).getFullYear()}-${userProgress.id.slice(-6).toUpperCase()}` });

  const verify = irCert
    ? {
        qrSvg: await certificateQrSvg(`https://www.cybersagevault.uk/verify/${irCert.certId}`),
        display: `cybersagevault.uk/verify/${irCert.certId}`,
      }
    : undefined;

  return (
    <>
      <style>{`@media print { .no-print { display: none } }`}</style>
      <div className="no-print"><Navbar backHref={`/paths/${slug}`} backLabel="Path" /></div>

      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-4 sm:px-6 py-12">
        <div className="no-print flex items-center gap-4 mb-8 w-full max-w-5xl">
          <div className="flex-1" />
          <PrintBtn />
        </div>

        <div className="w-full max-w-5xl">
          <CertificateFrame
            recipientName={candidateName}
            intro="has successfully completed the"
            title={path.title}
            detail="including all required laboratories, practical assessments, and hands-on exercises."
            capstone={capstone}
            issuedOn={userProgress.completedAt ?? new Date()}
            stats={stats}
            lists={domains.length > 0 ? [{ icon: "layers", label: "Covered Domains", items: domains }] : []}
            verify={verify}
          />
        </div>

        <div className="no-print w-full max-w-5xl mt-6 rounded-xl border border-white/8 bg-zinc-900/50 p-6 flex flex-col items-center gap-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">IR Commander Certification</p>
          {irCert ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-emerald-400 font-semibold text-sm">IR Commander Certificate earned</p>
              <p className="font-mono text-xs text-zinc-500">{irCert.certId}</p>
              <LinkedInShareBtn
                certId={irCert.certId}
                issueYear={irCert.unlockedAt.getFullYear()}
                issueMonth={irCert.unlockedAt.getMonth() + 1}
              />
            </div>
          ) : (
            <p className="text-sm text-zinc-400 text-center">
              Complete 3 B+ simulations and 2 paths to earn the IR Commander Certificate.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
