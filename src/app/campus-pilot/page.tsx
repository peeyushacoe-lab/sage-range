import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { PilotForm } from "./_components/pilot-form";

export const metadata = {
  title: "Campus Pilot Program · Sage Vault",
  description: "Bring hands-on cybersecurity training to your students — apply for the Sage Vault Campus Pilot Program.",
};

const INCLUDED = [
  "Full lab library and learning pathways for your cohort",
  "Live cyber simulations and Operation Zero Hour-style events",
  "Instructor dashboard — see every student's skill matrix and MITRE coverage",
  "Direct line to our team during the pilot — we shape the program around how you actually teach",
];

export default function CampusPilotPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />

      <div className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-500">
            For universities & bootcamps
          </p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Campus Pilot Program</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-zinc-400">
            Give your students hands-on, hireable cybersecurity skills — labs, live incident simulations, and a
            skill profile employers actually recognize. We&apos;re onboarding a small number of institutions for
            this pilot; tell us about your program and we&apos;ll reach out.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6">
              <p className="mb-4 text-[10px] uppercase tracking-widest text-zinc-500">What&apos;s included in the pilot</p>
              <ul className="space-y-3">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex gap-3 text-sm text-zinc-300">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-zinc-600">
              No cost, no commitment to sign up here — this starts a conversation, not a contract. We&apos;ll get
              back to you within a few business days to talk through your cohort size and what you&apos;re looking
              to run.
            </p>
          </div>

          <PilotForm />
        </div>
      </div>

      <MarketingFooter />
    </main>
  );
}
