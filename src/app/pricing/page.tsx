import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";
import { CheckoutBtn } from "./_components/checkout-btn";

const TIERS = [
  {
    name: "Student",
    price: "£15",
    period: "/month",
    description: "For individual learners building real-world cyber skills",
    color: "border-emerald-500/30",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    cta: "Get Started",
    ctaHref: "/sign-up",
    ctaStyle: "bg-emerald-500 text-black hover:bg-emerald-400",
    features: [
      "Full lab library (150+ hands-on labs)",
      "Learning pathways (SOC Analyst, Pen Tester, Cloud Security)",
      "Live cyber simulations (solo mode)",
      "Leaderboard & peer ranking",
      "Skill profile with verified competencies",
      "CV & project portfolio builder",
      "Community forum access",
    ],
    highlight: false,
  },
  {
    name: "Classroom",
    price: "$149",
    period: "/month per cohort",
    description: "For instructors running cyber security modules at universities or bootcamps",
    color: "border-blue-500/40",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    cta: "Start 14-day Trial",
    ctaHref: "/sign-up?plan=classroom",
    ctaStyle: "bg-blue-500 text-white hover:bg-blue-400",
    features: [
      "Everything in Student",
      "Unlimited classroom creation",
      "Assign labs & scenarios to cohorts",
      "Live student progress dashboards",
      "Instructor observation mode (live simulations)",
      "Simulation assessment reports (PDF)",
      "Classroom performance analytics",
      "EXCEPTIONAL / STRONG / ADEQUATE grading",
      "Announcement & comms tools",
      "Up to 50 students per classroom",
    ],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For companies recruiting, training teams, and running red-team exercises",
    color: "border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    cta: "Book a Demo",
    ctaHref: "mailto:support@cybersage.uk?subject=Enterprise%20Demo%20Request",
    ctaStyle: "bg-amber-500 text-black hover:bg-amber-400",
    features: [
      "Everything in Classroom",
      "Candidate assessment marketplace",
      "Simulation-verified talent profiles",
      "Candidate ranking by live scenario score",
      "Recruiter assessment reports (PDF)",
      "SSO / SAML 2.0 integration",
      "Audit logs & compliance exports",
      "Custom scenario development",
      "Dedicated customer success manager",
      "SLA-backed uptime guarantee",
      "Unlimited seats & classrooms",
    ],
    highlight: false,
  },
];

const FAQ = [
  {
    q: "How much does the Student tier cost?",
    a: "£15/month for individual learners. Labs, pathways, simulations, and the leaderboard are all included. No hidden fees.",
  },
  {
    q: "What counts as a 'cohort' in the Classroom plan?",
    a: "One classroom with up to 50 students. You can create multiple classrooms on one subscription — each classroom is one cohort.",
  },
  {
    q: "Can recruiters browse student profiles without paying?",
    a: "Recruiters need an Enterprise plan to access the assessment marketplace and candidate ranking. Free accounts can view public profiles but not simulation scores.",
  },
  {
    q: "Do you support real malware or live attack infrastructure?",
    a: "No. Simulations are scenario-driven decision engines, not live attack sandboxes. All scenarios are fully contained — no network exposure, no real payloads.",
  },
  {
    q: "What is 'Instructor Observation Mode'?",
    a: "Classroom instructors can watch a student's simulation live in read-only mode — seeing their current stage, decisions, and score in real time as they work through the scenario.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <main>
        {/* Hero */}
        <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
          <p className="text-xs uppercase tracking-widest text-sage-500 font-semibold mb-3">Pricing</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Simple, transparent pricing</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            From £15/month for students. Institutions pay once per cohort. Enterprises get simulation-verified talent pipelines.
          </p>
        </section>

        {/* Tiers */}
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-6 flex flex-col ${tier.color} ${tier.highlight ? "bg-blue-950/20 shadow-lg shadow-blue-500/10" : "bg-zinc-900/40"}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-blue-500 text-white px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <span className={`text-[10px] font-bold uppercase tracking-widest border rounded px-2 py-0.5 ${tier.badge}`}>
                    {tier.name}
                  </span>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && <span className="text-zinc-500 text-sm mb-1">{tier.period}</span>}
                  </div>
                  <p className="text-zinc-400 text-sm mt-2 leading-relaxed">{tier.description}</p>
                </div>

                <ul className="space-y-2.5 flex-1 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-300">
                      <span className="text-sage-500 shrink-0 mt-0.5">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                {tier.name === "Classroom" ? (
                  <CheckoutBtn className={`block w-full text-center rounded-xl py-2.5 font-semibold text-sm transition disabled:opacity-40 ${tier.ctaStyle}`} />
                ) : (
                  <a
                    href={tier.ctaHref}
                    className={`block text-center rounded-xl py-2.5 font-semibold text-sm transition ${tier.ctaStyle}`}
                  >
                    {tier.cta}
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Feature comparison callout */}
        <section className="max-w-3xl mx-auto px-6 pb-20">
          <div className="rounded-2xl border border-white/8 bg-zinc-900/40 p-8 text-center">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">For Enterprises</p>
            <h2 className="text-2xl font-bold mb-3">Built for talent-first organisations</h2>
            <p className="text-zinc-400 text-sm leading-relaxed max-w-xl mx-auto mb-6">
              Stop paying for certifications that don&apos;t predict performance. Sage Vault gives you simulation-verified
              candidates — ranked by live incident response scores, not self-reported skills.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { stat: "150+", label: "Hands-on labs" },
                { stat: "5", label: "Scenario archetypes" },
                { stat: "7", label: "Simulation roles" },
              ].map(({ stat, label }) => (
                <div key={label} className="rounded-xl border border-white/8 p-4">
                  <p className="text-3xl font-bold text-sage-400">{stat}</p>
                  <p className="text-xs text-zinc-500 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <a
              href="mailto:support@cybersage.uk?subject=Enterprise%20Demo%20Request"
              className="inline-block rounded-xl bg-amber-500 text-black font-semibold px-6 py-2.5 text-sm hover:bg-amber-400 transition"
            >
              Book Enterprise Demo →
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-6 pb-24">
          <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-8 text-center">Common Questions</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-white/8 bg-zinc-900/30 p-5">
                <p className="font-semibold text-sm text-white mb-2">{q}</p>
                <p className="text-sm text-zinc-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer CTA */}
        <section className="border-t border-white/8 py-16 text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-zinc-400 text-sm mb-8">From £15/month for students.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/sign-up"
              className="rounded-xl bg-sage-500 text-black font-semibold px-6 py-3 text-sm hover:bg-sage-700 hover:text-white transition"
            >
              Get Started →
            </Link>
            <a
              href="mailto:support@cybersage.uk?subject=Enterprise%20Demo%20Request"
              className="rounded-xl border border-white/20 text-zinc-300 font-semibold px-6 py-3 text-sm hover:border-white/40 hover:text-white transition"
            >
              Talk to Sales
            </a>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
