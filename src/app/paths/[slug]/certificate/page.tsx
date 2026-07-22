import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { PrintBtn } from "./_components/print-btn";
import { LinkedInShareBtn } from "./_components/linkedin-share-btn";

export const dynamic = "force-dynamic";

const TASK_STAGES: Record<string, string[]> = {
  "welcome-ctf": ["task_1", "task_2", "task_3"],
  "sql-injection-101": ["task_1", "task_2", "task_3"],
  "soc-alert-investigation": ["investigation", "task_2", "task_3"],
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

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

  let canCert = false;
  if (hasModules) {
    // Module-based path: completed when all modules are done (set by module progress hook)
    canCert = !!userProgress?.completedAt;
  } else {
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

  const candidateName = user.displayName ?? user.email.split("@")[0];
  const completedDate = userProgress.completedAt
    ? formatDate(userProgress.completedAt)
    : formatDate(new Date());

  const irCert = await db.iRCertification.findUnique({
    where: { userId: user.id },
    select: { certId: true, unlockedAt: true },
  });

  return (
    <>
      <style>{`@media print { .no-print { display: none } }`}</style>
      <div className="no-print"><Navbar backHref={`/paths/${slug}`} backLabel="Path" /></div>

      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6 py-12">
        <div className="no-print flex items-center gap-4 mb-8 w-full max-w-2xl">
          <div className="flex-1" />
          <PrintBtn />
        </div>

        <div className="w-full max-w-2xl rounded-2xl border border-white/8 bg-zinc-900/60 p-12 flex flex-col items-center text-center gap-6">
          <div>
            <p className="text-sage-500 font-bold tracking-widest text-sm uppercase">SAGE VAULT</p>
          </div>

          <div className="w-16 h-px bg-white/10" />

          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Certificate of Completion</p>
            <p className="text-zinc-400 text-sm">This is to certify that</p>
            <p className="text-3xl font-bold mt-2 tracking-tight">{candidateName}</p>
            <p className="text-zinc-400 text-sm mt-3">has successfully completed</p>
            <p className="text-2xl font-bold mt-2 text-sage-500">{path.title}</p>
          </div>

          <div className="w-16 h-px bg-white/10" />

          <div className="text-xs text-zinc-500 space-y-1">
            <p>Completed on {completedDate}</p>
            <p>Skill Score at time of completion: {user.skillScore}</p>
          </div>

          <div className="w-16 h-px bg-white/10" />

          <p className="text-xs text-zinc-600 tracking-wide">
            Verified by Sage Vault · cybersagevault.uk
          </p>
        </div>

        <div className="no-print w-full max-w-2xl mt-6 rounded-xl border border-white/8 bg-zinc-900/50 p-6 flex flex-col items-center gap-4">
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
