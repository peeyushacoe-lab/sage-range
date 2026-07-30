import { redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { ScenarioForm } from "./_components/scenario-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scenario Builder — Sage Vault" };

export default async function ScenarioBuilderPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "ADMIN" && user.role !== "INSTRUCTOR") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        <Link href="/simulation/new" className="text-xs text-ink-3 hover:text-ink-2 transition tracking-wide">
          ← Simulations
        </Link>

        <div className="mt-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold">Scenario Builder</p>
            <span className="text-[10px] font-bold uppercase tracking-widest border border-ok-edge bg-ok-wash text-ok rounded px-2 py-0.5">
              {user.role}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Build a Custom Scenario</h1>
          <p className="text-ink-2 mt-2 text-sm max-w-2xl leading-relaxed">
            Compose a custom incident for your students. Choose a threat actor persona, industry, and simulation engine template — then write your own narrative briefing and learning objectives.
          </p>
        </div>

        <ScenarioForm />
      </main>
    </div>
  );
}
