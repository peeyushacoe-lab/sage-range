import Link from "next/link";
import { auth } from "@/auth";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const FEATURES = [
  {
    tag: "Training",
    color: "text-sage-400 bg-sage-500/10 border-sage-500/20",
    icon: "⬡",
    title: "Labs that teach through doing",
    description: "14 interactive labs across CTF, Blue Team, and Red Team. Every task is gated — you unlock the next stage by proving you understood the last one. No skipping, no guessing.",
    items: ["SQL injection, privilege escalation, memory forensics", "Evidence-gated task progression", "3-level hint system (costs XP)", "MITRE ATT&CK tracked per lab"],
  },
  {
    tag: "Cyber Range",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    icon: "◈",
    title: "Live incident simulations — not walkthroughs",
    description: "REDai generates a unique company, employees, attack timeline, and kill chain for every session. You run the SOC. Your decisions are scored. The organization reacts to what you do.",
    items: ["Ransomware → APT → Insider → Data breach → Cloud misconfig", "Evidence panel + live threat feed", "Employee panic scores and org health", "A–F leadership grade + AI debrief"],
  },
  {
    tag: "Education",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: "◻",
    title: "Classrooms built for cyber instructors",
    description: "Create a classroom, share a code, assign labs and simulations, watch students in real time, download reports. Designed for university modules and enterprise bootcamps.",
    items: ["Live observation mode during simulations", "MITRE ATT&CK coverage per student", "Printable class-wide reports", "Webhook integrations for LMS"],
  },
  {
    tag: "Talent",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: "◇",
    title: "Hire based on verified performance",
    description: "Recruiters see simulation scores, decision speed, MITRE coverage, and lab solve history — all verified by the platform. Post requirements, we surface candidates who qualify.",
    items: ["EXCEPTIONAL / STRONG / ADEQUATE ratings", "Decision speed + error pattern analysis", "Auto-matched candidates per job posting", "Publicly verifiable performance certificates"],
  },
];

const STATS = [
  { value: "14",    label: "Active labs",       sub: "CTF + Blue + Red" },
  { value: "5",     label: "Sim scenarios",     sub: "Each fully unique" },
  { value: "A–F",   label: "Leadership grade",  sub: "Per simulation" },
  { value: "100%",  label: "Browser-based",     sub: "No setup required" },
];

const HOW_IT_WORKS = [
  {
    role: "Student / Analyst",
    color: "sage",
    icon: "⬡",
    steps: [
      "Sign up and get started immediately",
      "Choose a learning path or jump into labs",
      "Complete tasks, earn XP, rank up",
      "Run live incident simulations",
      "Share your verified performance profile",
    ],
  },
  {
    role: "Instructor / Educator",
    color: "blue",
    icon: "◻",
    steps: [
      "Create a classroom with a join code",
      "Assign specific labs and sim scenarios",
      "Watch students work in real time",
      "Download MITRE coverage reports",
      "Identify skill gaps before the exam",
    ],
  },
  {
    role: "Recruiter / Hiring Manager",
    color: "amber",
    icon: "◇",
    steps: [
      "Browse candidates filtered by verified score",
      "Filter by simulation grade (A–F)",
      "View MITRE ATT&CK skill coverage",
      "Post job requirements — get auto-matches",
      "Download assessment reports",
    ],
  },
];

const TICKER_ITEMS = [
  "T1059.001 — PowerShell Execution",
  "T1078 — Valid Accounts",
  "T1566.001 — Spearphishing Attachment",
  "T1027 — Obfuscated Files",
  "T1055 — Process Injection",
  "T1021.002 — SMB/Windows Admin Shares",
  "T1041 — Exfiltration Over C2",
];

export default async function Home() {
  const session = await auth();
  const isSignedIn = !!session;

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-x-hidden">
      <MarketingNav />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 py-20 overflow-hidden">

        {/* Background grid */}
        <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/6 blur-3xl animate-orb-drift pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-emerald-400/5 blur-3xl animate-orb-drift-2 pointer-events-none" />
        <div className="absolute top-2/3 left-1/2 w-64 h-64 rounded-full bg-teal-500/4 blur-3xl animate-orb-drift-3 pointer-events-none" />

        {/* Radial glow center */}
        <div className="absolute inset-0 bg-radial-gradient pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-1.5 text-xs font-mono text-emerald-400 mb-8 animate-fade-down">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            SAGE VAULT · CYBER RANGE · LIVE
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-none animate-fade-up">
            Train under{" "}
            <span className="relative">
              <span className="gradient-text text-glow">real pressure.</span>
            </span>
            <br />
            <span className="text-zinc-200">Get hired on proof.</span>
          </h1>

          <p className="text-zinc-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10 animate-fade-up delay-150">
            The only cyber training platform where your score is verified by the simulation engine —
            not a quiz. Labs, live incident response, classroom tools, and a recruiter marketplace.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-up delay-300">
            {!isSignedIn && (
              <>
                <Link
                  href="/sign-in"
                  className="btn-glow rounded-xl bg-emerald-500 px-8 py-3.5 font-bold text-black text-base"
                >
                  Start training →
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-white/12 px-8 py-3.5 font-medium text-zinc-300 hover:border-white/25 hover:text-white transition-all text-base"
                >
                  For teams & universities
                </Link>
              </>
            )}
            {isSignedIn && (
              <Link href="/dashboard" className="btn-glow rounded-xl bg-emerald-500 px-8 py-3.5 font-bold text-black text-base">
                Go to Command Center →
              </Link>
            )}
          </div>

          <p className="text-xs text-zinc-600 mt-5 animate-fade-up delay-500 font-mono">
            Browser-based · No setup required · Live simulations
          </p>

          {/* MITRE ticker */}
          <div className="mt-12 overflow-hidden animate-fade-up delay-700">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-700">
              <span className="text-emerald-700 font-bold shrink-0">MITRE ATT&CK</span>
              <div className="flex gap-6 overflow-x-auto pb-1 no-scrollbar">
                {TICKER_ITEMS.map((t) => (
                  <span key={t} className="whitespace-nowrap opacity-60 hover:opacity-100 hover:text-emerald-600 transition-colors cursor-default">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/6 bg-zinc-900/40 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(({ value, label, sub }, i) => (
            <div
              key={label}
              className="text-center animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <p className="text-3xl font-black gradient-text tabular-nums">{value}</p>
              <p className="text-sm font-semibold text-zinc-300 mt-1">{label}</p>
              <p className="text-xs text-zinc-600 mt-0.5 font-mono">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature pillars ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24 space-y-20">
        <div className="text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-2">Platform capabilities</p>
          <h2 className="text-3xl font-bold">Built different. Intentionally.</h2>
        </div>

        {FEATURES.map((f, i) => (
          <div
            key={f.tag}
            className={`grid grid-cols-1 md:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}
          >
            <div className={i % 2 === 1 ? "md:order-2" : ""}>
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-block text-xs font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${f.color}`}>{f.tag}</span>
              </div>
              <h3 className="text-2xl font-bold mb-3 leading-snug">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">{f.description}</p>
              <ul className="space-y-2.5">
                {f.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-zinc-300">
                    <span className="text-emerald-500 shrink-0 mt-0.5 font-bold">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Feature visual */}
            <div className={`relative ${i % 2 === 1 ? "md:order-1" : ""}`}>
              <div className="card-hover rounded-2xl border border-white/8 bg-zinc-900/60 p-8 h-56 flex flex-col items-center justify-center gap-3 overflow-hidden">
                <div className="absolute inset-0 bg-grid-sm opacity-50" />
                <div className={`absolute inset-0 opacity-10 ${f.color.split(" ")[0].replace("text-", "bg-")}`}
                  style={{ background: `radial-gradient(ellipse at center, ${f.tag === "Training" ? "rgba(16,185,129,0.15)" : f.tag === "Cyber Range" ? "rgba(239,68,68,0.15)" : f.tag === "Education" ? "rgba(59,130,246,0.15)" : "rgba(245,158,11,0.15)"} 0%, transparent 70%)` }}
                />
                <span className="relative text-6xl font-black opacity-20">{f.icon}</span>
                <div className="relative text-center">
                  <p className={`text-xs font-mono font-bold uppercase tracking-widest ${f.color.split(" ")[0]}`}>{f.tag}</p>
                  <p className="text-xs text-zinc-600 mt-1">{f.items.length} capabilities</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="border-t border-white/6 bg-zinc-900/20 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-2">Three roles. One platform.</p>
            <h2 className="text-3xl font-bold max-w-xl mx-auto leading-snug">
              Training → Credentialing → Hiring. All in one loop.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((h) => {
              const borderColor = h.color === "sage" ? "border-emerald-500/20 hover:border-emerald-500/40" : h.color === "blue" ? "border-blue-500/20 hover:border-blue-500/40" : "border-amber-500/20 hover:border-amber-500/40";
              const textColor = h.color === "sage" ? "text-emerald-400" : h.color === "blue" ? "text-blue-400" : "text-amber-400";
              const bgColor = h.color === "sage" ? "bg-emerald-500/5" : h.color === "blue" ? "bg-blue-500/5" : "bg-amber-500/5";
              return (
                <div key={h.role} className={`card-hover rounded-xl border ${borderColor} ${bgColor} p-6`}>
                  <div className="flex items-center gap-2 mb-5">
                    <span className={`text-lg ${textColor}`}>{h.icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${textColor}`}>{h.role}</p>
                  </div>
                  <ol className="space-y-3">
                    {h.steps.map((step, i) => (
                      <li key={step} className="flex items-start gap-3 text-sm text-zinc-400">
                        <span className={`shrink-0 text-xs font-black ${textColor} opacity-50 mt-0.5 tabular-nums`}>{String(i + 1).padStart(2, "0")}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(16,185,129,0.08) 0%, transparent 70%)" }}
        />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono mb-4">Ready?</p>
          <h2 className="text-4xl font-black mb-4 leading-tight">
            Your score is your{" "}
            <span className="gradient-text text-glow">résumé now.</span>
          </h2>
          <p className="text-zinc-400 text-sm mb-10 leading-relaxed">
            Students get full platform access. Instructors get classroom tools from £149/month.
            Enterprises get a verified talent pipeline — not a list of certifications.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {!isSignedIn && (
              <>
                <Link href="/sign-in" className="btn-glow rounded-xl bg-emerald-500 px-8 py-3.5 font-bold text-black text-base">
                  Create your account →
                </Link>
                <Link href="/contact" className="rounded-xl border border-white/12 px-8 py-3.5 text-zinc-300 hover:text-white hover:border-white/25 transition-all text-base">
                  Talk to us
                </Link>
              </>
            )}
            {isSignedIn && (
              <Link href="/dashboard" className="btn-glow rounded-xl bg-emerald-500 px-8 py-3.5 font-bold text-black text-base">
                Go to Command Center →
              </Link>
            )}
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
