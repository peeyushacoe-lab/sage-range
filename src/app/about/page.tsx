import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const PRODUCTS = [
  {
    name: "Sage Forge",
    tag: "Cyber Range & Training",
    tagColor: "text-sage-400 bg-sage-500/10 border-sage-500/20",
    description:
      "Our flagship cyber range and security simulation platform. Designed for universities, training providers, government organisations, and enterprise security teams, Sage Forge delivers immersive, AI-powered cybersecurity exercises that replicate real-world incidents and attack scenarios.",
    capabilities: [
      "AI-generated cybersecurity scenarios",
      "Realistic incident response simulations",
      "Blue Team and Red Team exercises",
      "Human-factor and insider-threat simulations",
      "Security operations centre (SOC) training",
      "Performance tracking and assessment",
      "Multi-user collaborative environments",
      "Enterprise and academic learning pathways",
    ],
    href: "/",
    current: true,
  },
  {
    name: "Brain Sentinel",
    tag: "AI Security Intelligence",
    tagColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    description:
      "CyberSage's AI-powered security intelligence platform. Built to assist analysts and security teams, Brain Sentinel helps identify threats, analyse security events, and provide actionable insights through advanced artificial intelligence — reducing analyst workload while improving visibility across modern environments.",
    capabilities: [
      "AI-driven threat detection",
      "Security event analysis",
      "Actionable risk insights",
      "Analyst workload reduction",
      "Modern environment visibility",
    ],
    href: null,
    current: false,
  },
  {
    name: "Nexus",
    tag: "Secure Workspace",
    tagColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    description:
      "CyberSage's secure digital workspace and collaboration platform. Created specifically for security-focused organisations, Nexus combines communication, collaboration, and productivity tools into a unified environment — providing a secure alternative for managing communication, knowledge sharing, and operational workflows.",
    capabilities: [
      "Secure team communication",
      "Knowledge management",
      "Operational workflow tools",
      "Security-first architecture",
      "Designed for security teams",
    ],
    href: null,
    current: false,
  },
];

const WHO_WE_SERVE = [
  "Universities and educational institutions",
  "Corporate security teams",
  "Government agencies",
  "Managed Security Service Providers (MSSPs)",
  "Cybersecurity consultants",
  "Security Operations Centres (SOCs)",
  "Students and aspiring cybersecurity professionals",
  "Red Team and Blue Team practitioners",
];

const COMMITMENTS = [
  {
    icon: "🧠",
    title: "Intelligence",
    body: "Every product we build leverages AI to surface threats, generate scenarios, and personalise learning — making advanced capabilities accessible without enterprise complexity.",
  },
  {
    icon: "🎯",
    title: "Simulation",
    body: "The best way to stop cyber attacks is to simulate them first. Our scenarios are based on real-world incidents — from ransomware campaigns to nation-state APT activity — so training reflects actual threats.",
  },
  {
    icon: "🛡️",
    title: "Resilience",
    body: "We measure success not by certifications but by outcomes — did the analyst make better decisions? Did the SOC team contain the breach faster? Resilience is built through practice, not theory.",
  },
  {
    icon: "🔓",
    title: "Accessibility",
    body: "Cybersecurity training should not be gated by budget. Students access Sage Forge free. We monetise through institutions and employers — ensuring that talent can be discovered regardless of financial background.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-sage-500 font-semibold mb-3">About CyberSage</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            Building the Future of Cybersecurity Through Intelligence, Simulation, and Innovation
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-6">
            CyberSage is a cybersecurity technology company dedicated to helping organisations,
            universities, and security professionals strengthen their defences against modern cyber
            threats. Our mission is simple: make advanced cybersecurity capabilities accessible,
            practical, and effective for everyone — from students beginning their careers to enterprise
            security teams defending critical infrastructure.
          </p>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Founded by cybersecurity professionals with a passion for innovation, CyberSage develops
            intelligent platforms that combine artificial intelligence, threat intelligence,
            cybersecurity training, and real-world simulation to prepare organisations for the
            evolving threat landscape.
          </p>
        </div>
      </section>

      {/* Mission statement */}
      <section className="border-y border-white/8 bg-zinc-900/20 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <blockquote className="text-2xl sm:text-3xl font-bold leading-snug mb-6">
            &ldquo;The best way to stop cyber attacks is to understand them, simulate them, and learn from them before they happen.&rdquo;
          </blockquote>
          <p className="text-zinc-500 text-sm italic">— The CyberSage founding principle</p>
        </div>
      </section>

      {/* The ecosystem */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Our Ecosystem</p>
          <h2 className="text-3xl font-bold mb-4">More than a single product</h2>
          <p className="text-zinc-400 leading-relaxed max-w-2xl">
            CyberSage is building a complete cybersecurity ecosystem designed to support learning,
            detection, response, and resilience. Three platforms. One mission.
          </p>
        </div>

        <div className="space-y-6">
          {PRODUCTS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-8 ${p.current ? "border-sage-500/30 bg-sage-500/4" : "border-white/8 bg-zinc-900/30"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border rounded-full px-3 py-1 mb-2 ${p.tagColor}`}>
                    {p.tag}
                  </span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold">{p.name}</h3>
                    {p.current && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-sage-500/15 text-sage-400 border border-sage-500/30 rounded-full px-2 py-0.5">
                        Live
                      </span>
                    )}
                    {!p.current && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
                {p.href && (
                  <a
                    href={p.href}
                    className="text-xs font-semibold text-sage-400 border border-sage-500/30 rounded-lg px-3 py-1.5 hover:bg-sage-500/10 transition"
                  >
                    Visit Sage Forge →
                  </a>
                )}
              </div>

              <p className="text-zinc-400 leading-relaxed text-sm mb-6">{p.description}</p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {p.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-zinc-300">
                    <span className={`shrink-0 mt-0.5 ${p.current ? "text-sage-500" : "text-zinc-600"}`}>✓</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section className="border-y border-white/8 bg-zinc-900/20 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Our Vision</p>
          <h2 className="text-3xl font-bold mb-6">Proactive defence through intelligent technology</h2>
          <p className="text-zinc-400 leading-relaxed text-lg">
            We envision a future where organisations can proactively defend themselves against cyber
            threats through intelligent technology, realistic training, and continuous learning.
            CyberSage is committed to advancing cybersecurity by developing solutions that bridge
            the gap between theory and practice — helping individuals and organisations build the
            skills and capabilities needed to thrive in a digital world.
          </p>
        </div>
      </section>

      {/* Who we serve */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Who We Serve</p>
            <h2 className="text-3xl font-bold mb-6">Built for the full security community</h2>
            <p className="text-zinc-400 leading-relaxed text-sm">
              From students taking their first SOC module to enterprise red teams running live exercises —
              CyberSage solutions are designed to meet you where you are and scale with your needs.
            </p>
          </div>
          <ul className="space-y-3">
            {WHO_WE_SERVE.map((w) => (
              <li key={w} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="h-1.5 w-1.5 rounded-full bg-sage-500 shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Commitment values */}
      <section className="border-y border-white/8 bg-zinc-900/20 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3 text-center">Our Commitment</p>
          <h2 className="text-3xl font-bold text-center mb-10">Intelligence. Simulation. Resilience.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/8 bg-zinc-900/40 p-6">
                <span className="text-2xl mb-3 block">{c.icon}</span>
                <h3 className="font-bold text-base mb-2">{c.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Join the CyberSage ecosystem</h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-xl mx-auto">
          Whether you&apos;re building skills, running a classroom, or hiring for your security team —
          Sage Forge is available today. Brain Sentinel and Nexus are coming soon.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/sign-up" className="rounded-xl bg-sage-500 px-6 py-3 font-semibold text-black hover:bg-sage-400 transition">
            Get started with Sage Forge →
          </Link>
          <Link href="/contact" className="rounded-xl border border-white/15 px-6 py-3 text-zinc-300 hover:text-white hover:border-white/30 transition">
            Talk to our team
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
