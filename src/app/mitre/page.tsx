import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { computeMitreCoverage } from "@/lib/insights/mitre";
import { MitreTacticGrid, MitreCoverageHeader } from "@/components/insights/mitre-tactic-grid";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";
export const metadata = { title: "MITRE ATT&CK Progress · Sage Vault" };

export default async function MitrePage() {
  const me = await getOrCreateAppUser();
  if (!me) redirect("/sign-in");

  const coverage = await computeMitreCoverage(me.id);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">MITRE ATT&CK Framework</p>
            <h1 className="text-2xl font-bold">Kill Chain Coverage</h1>
            <p className="text-sm text-zinc-500 mt-1">Your coverage across 14 Enterprise tactics</p>
          </div>
          <MitreCoverageHeader coverage={coverage} />
        </div>

        <MitreTacticGrid coverage={coverage} />
      </main>
    </div>
  );
}
