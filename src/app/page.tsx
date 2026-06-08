import Link from "next/link";
import { auth } from "@/auth";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const FEATURES = [
  {
    tag: "Training",
    color: "text-sage-400 bg-sage-500/10 border-sage-500/20",
    title: "Hands-on labs that actually teach",
    description:
      "14 interactive labs across CTF, Blue Team, and Red Team categories. Each lab walks you through real techniques — SQL injection, privilege escalation, memory forensics, Active Directory attacks — in a browser, with no setup.",
    items: ["14 labs across 3 categories", "3-level progressive hint system", "Auto-graded with XP rewards", "5 structured learning paths"],
  },
  {
    tag: "Cyber Range",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    title: "Live incident simulations powered by REDai",
    description:
      "A fully deterministic adversary engine generates a unique company, attack scenario, and live kill chain for every simulation. You make real decisions under real pressure — executives demanding updates, systems going offline, the clock running.",
    items: ["5 adversary personas (Ransomware to APT)", "MITRE ATT&CK mapped stages", "AI-written debrief + gap analysis", "Verified certificate on completion"],
  },
  {
    tag: "Education",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    title: "A classroom platform built for cyber instructors",
    description:
      "Create a classroom, share a join code, assign labs and simulation scenarios, and watch your students work in real time. Full analytics, printable reports, and observation mode — designed for university modules and professional bootcamps.",
    items: ["Live observation mode", "Per-student MITRE coverage analytics", "Printable classroom reports", "Announcement board + due dates"],
  },
  {
    tag: "Talent",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    title: "Hire based on what candidates can actually do",
    description:
      "Recruiters see simulation-verified scores, not self-reported skills. EXCEPTIONAL / STRONG / ADEQUATE / DEVELOPING ratings derived from live incident response. Every rating is backed by a verified certificate with a public URL.",
    items: ["Simulation-verified candidate ratings", "MITRE ATT&CK coverage per candidate", "Downloadable assessment reports", "Public certificate verification"],
  },
];

const STATS = [
  { value: "14", label: "Hands-on Labs" },
  { value: "5",  label: "Adversary Personas" },
  { value: "5",  label: "Simulation Scenarios" },
  { value: "7",  label: "Simulation Roles" },
];

const HOW = [
  { role: "Student",    color: "text-sage-400 border-sage-500/30",  steps: ["Create a free account", "Complete labs to build skill score", "Run live simulations", "Earn a verified certificate", "Appear in the talent marketplace"] },
  { role: "Instructor", color: "text-blue-400 border-blue-500/30",  steps: ["Create a classroom", "Share the join code", "Assign labs + scenarios", "Watch students live", "Download performance reports"] },
  { role: "Recruiter",  color: "text-amber-400 border-amber-500/30", steps: ["Browse verified candidates", "Filter by simulation rating", "View MITRE skill coverage", "Bookmark and post jobs", "Download assessment reports"] },
];

export default async function Home() {
  const session = await auth();
  const isSignedIn = !!session?.user?.id;
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900/60 px-4 py-1.5 text-xs font-medium text-zinc-400 mb-8">
          <span className="text-sage-500 font-bold">CyberSage</span>
          <span className="text-zinc-600">·</span>
          Cyber Range · Academy · Talent
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-tight mb-6">
          Train. Simulate.
          <br />
          <span className="text-sage-400">Get hired.</span>
        </h1>
        <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Sage Forge by CyberSage — the only platform that connects hands-on cyber training
          to verified talent assessment, for students, instructors, and the companies hiring them.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {!isSignedIn ? (
            <>
              <Link
                href="/sign-in"
                className="rounded-xl bg-sage-500 px-7 py-3.5 font-semibold text-black hover:bg-sage-400 transition text-base"
              >
                Start training free →
              </Link>
              <Link
                href="/pricing"
                className="rounded-xl border border-white/15 px-7 py-3.5 font-medium text-zinc-300 hover:border-white/30 hover:text-white transition text-base"
              >
                View pricing
              </Link>
            </>
          ) : (
            <Link
              href="/dashboard"
              className="rounded-xl bg-sage-500 px-7 py-3.5 font-semibold text-black hover:bg-sage-400 transition text-base"
            >
              Go to Dashboard →
            </Link>
          )}
        </div>
        <p className="text-xs text-zinc-600 mt-4">Free for students · No credit card required</p>
      </section>

      {/* Stats */}
      <section className="border-y border-white/8 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-bold text-sage-400">{value}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature pillars */}
      <section className="max-w-5xl mx-auto px-6 py-24 space-y-16">
        <h2 className="text-3xl font-bold text-center">Everything in one platform</h2>
        {FEATURES.map((f) => (
          <div key={f.tag} className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border rounded-full px-3 py-1 mb-4 ${f.color}`}>
                {f.tag}
              </span>
              <h3 className="text-2xl font-bold mb-4 leading-snug">{f.title}</h3>
              <p className="text-zinc-400 leading-relaxed text-sm mb-6">{f.description}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-zinc-900/50 p-6">
              <ul className="space-y-3">
                {f.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                    <span className="text-sage-500 shrink-0 mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </section>

      {/* The assessment loop */}
      <section className="border-y border-white/8 bg-zinc-900/20 py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">What makes Sage Forge different</p>
          <h2 className="text-3xl font-bold mb-4">The complete assessment loop</h2>
          <p className="text-zinc-400 text-sm leading-relaxed mb-10">
            Most platforms stop at the lab. Sage Forge connects training to hiring — so students earn
            verified evidence of their ability, and recruiters see exactly what candidates can do under pressure.
          </p>
          <div className="flex flex-col items-center gap-2">
            {["Train on live labs", "Run a live simulation", "Earn a verified certificate", "Appear in the talent marketplace", "Recruiter reviews real performance data"].map((step, i) => (
              <div key={step} className="flex flex-col items-center gap-1">
                <div className="rounded-xl border border-white/10 bg-zinc-900 px-6 py-3 text-sm font-medium text-zinc-200 w-72">
                  {step}
                </div>
                {i < 4 && <span className="text-zinc-700 text-lg">↓</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works per role */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold text-center mb-12">Built for three audiences</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW.map(({ role, color, steps }) => (
            <div key={role} className={`rounded-2xl border p-6 ${color.split(" ")[1]}`}>
              <span className={`text-xs font-bold uppercase tracking-widest ${color.split(" ")[0]} mb-4 block`}>
                {role}
              </span>
              <ol className="space-y-3">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-3 text-sm text-zinc-300">
                    <span className="text-zinc-600 shrink-0 font-mono text-xs mt-0.5">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-white/8 bg-zinc-900/30 py-20 text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to start?</h2>
        <p className="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
          Students train free. Instructors run classrooms from $149/month. Enterprises get a verified talent pipeline.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {!isSignedIn ? (
            <>
              <Link
                href="/sign-in"
                className="rounded-xl bg-sage-500 px-7 py-3.5 font-semibold text-black hover:bg-sage-400 transition"
              >
                Create free account →
              </Link>
              <Link
                href="/contact"
                className="rounded-xl border border-white/15 px-7 py-3.5 text-zinc-300 hover:text-white hover:border-white/30 transition"
              >
                Talk to us
              </Link>
            </>
          ) : (
            <Link href="/dashboard" className="rounded-xl bg-sage-500 px-7 py-3.5 font-semibold text-black hover:bg-sage-400 transition">
              Go to Dashboard →
            </Link>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
