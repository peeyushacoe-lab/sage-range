import Link from "next/link";
import { Show } from "@clerk/nextjs";
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
    title: "Hire based on what people can actually do",
    description:
      "Recruiters see simulation scores, MITRE ATT&CK skill coverage, decision speed, and lab performance — all verified by the platform. Post job requirements and we surface candidates who meet them.",
    items: ["EXCEPTIONAL / STRONG / ADEQUATE ratings", "MITRE skill coverage per candidate", "Job posting with auto-matched candidates", "Simulation-verified certificates"],
  },
];

const STATS = [
  { value: "14+", label: "Labs" },
  { value: "5",   label: "Sim scenarios" },
  { value: "∞",   label: "Unique sessions" },
  { value: "100%", label: "Browser-based" },
];

const HOW_IT_WORKS = [
  { role: "Student",    color: "text-sage-400 border-sage-500/30",   steps: ["Sign up free", "Choose a learning path", "Complete labs + earn XP", "Run incident simulations", "Share your verified profile"] },
  { role: "Instructor", color: "text-blue-400 border-blue-500/30",  steps: ["Create a classroom", "Share the join code", "Assign labs + scenarios", "Watch students live", "Download performance reports"] },
  { role: "Recruiter",  color: "text-amber-400 border-amber-500/30", steps: ["Browse verified candidates", "Filter by simulation rating", "View MITRE skill coverage", "Bookmark and post jobs", "Download assessment reports"] },
];

export default function Home() {
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
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Train. Simulate.{" "}
          <span className="text-sage-500">Get Hired.</span>
        </h1>
        <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10">
          Sage Forge by CyberSage — the only platform that connects hands-on cyber training
          to verified talent assessment, for students, instructors, and the companies hiring them.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Show when="signed-out">
            <Link
              href="/sign-up"
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
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-xl bg-sage-500 px-7 py-3.5 font-semibold text-black hover:bg-sage-400 transition text-base"
            >
              Go to Dashboard →
            </Link>
          </Show>
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
              <span className={`inline-block text-xs font-bold uppercase tracking-widest border rounded px-2 py-0.5 mb-4 ${f.color}`}>{f.tag}</span>
              <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-5">{f.description}</p>
              <ul className="space-y-2">
                {f.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-sage-500 shrink-0">✓</span>{item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/8 bg-zinc-900/50 h-52 flex items-center justify-center">
              <p className={`text-5xl font-black ${f.color.split(" ")[0]}`}>{f.tag[0]}</p>
            </div>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="border-t border-white/8 bg-zinc-900/20 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs text-zinc-500 uppercase tracking-widest text-center mb-3">What makes Sage Forge different</p>
          <h2 className="text-3xl font-bold text-center mb-12">
            Most platforms stop at the lab. Sage Forge connects training to hiring — so students earn
            credentials recruiters can actually verify.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((h) => (
              <div key={h.role} className={`rounded-xl border p-6 ${h.color}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${h.color.split(" ")[0]}`}>{h.role}</p>
                <ol className="space-y-2">
                  {h.steps.map((step, i) => (
                    <li key={step} className="flex items-start gap-2 text-sm text-zinc-400">
                      <span className={`shrink-0 w-4 text-right font-bold ${h.color.split(" ")[0]} opacity-60`}>{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/8 bg-zinc-900/30 py-20 text-center">
        <h2 className="text-3xl font-bold mb-3">Ready to start?</h2>
        <p className="text-zinc-400 text-sm mb-8 max-w-md mx-auto">
          Students train free. Instructors run classrooms from $149/month. Enterprises get a verified talent pipeline.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Show when="signed-out">
            <Link
              href="/sign-up"
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
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="rounded-xl bg-sage-500 px-7 py-3.5 font-semibold text-black hover:bg-sage-400 transition">
              Go to Dashboard →
            </Link>
          </Show>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
