import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

import { Icon, type IconName } from "@/components/ui/icon";
import { IconTile } from "@/components/ui/icon-tile";
const PRODUCTS = [
  {
    name: "Sage Vault",
    tag: "Cyber Range & Training",
    tagColor: "text-ok bg-ok-wash border-ok-edge",
    description:
      "Our flagship cyber range and security simulation platform. Designed for universities, training providers, government organisations, and enterprise security teams, Sage Vault delivers immersive, AI-powered cybersecurity exercises that replicate real-world incidents and attack scenarios.",
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
    tagColor: "text-accent bg-accent-wash border-accent-edge",
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
    tagColor: "text-info bg-info-wash border-info-edge",
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

const COMMITMENTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "aiMentor",
    title: "Intelligence",
    body: "Every product we build leverages AI to surface threats, generate scenarios, and personalise learning — making advanced capabilities accessible without enterprise complexity.",
  },
  {
    icon: "simulations",
    title: "Simulation",
    body: "The best way to stop cyber attacks is to simulate them first. Our scenarios are based on real-world incidents — from ransomware campaigns to nation-state APT activity — so training reflects actual threats.",
  },
  {
    icon: "blueTeam",
    title: "Resilience",
    body: "We measure success not by certifications but by outcomes — did the analyst make better decisions? Did the SOC team contain the breach faster? Resilience is built through practice, not theory.",
  },
  {
    icon: "graduation",
    title: "Accessibility",
    body: "Cybersecurity training should not be gated by budget. Students access Sage Vault free. We monetise through institutions and employers — ensuring that talent can be discovered regardless of financial background.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-widest text-ink-3 font-semibold mb-3">About CyberSage</p>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-6">
            Building the Future of Cybersecurity Through Intelligence, Simulation, and Innovation
          </h1>
          <p className="text-ink-2 text-lg leading-relaxed mb-6">
            CyberSage is a cybersecurity technology company dedicated to helping organisations,
            universities, and security professionals strengthen their defences against modern cyber
            threats. Our mission is simple: make advanced cybersecurity capabilities accessible,
            practical, and effective for everyone — from students beginning their careers to enterprise
            security teams defending critical infrastructure.
          </p>
          <p className="text-ink-2 text-lg leading-relaxed">
            Founded by cybersecurity professionals with a passion for innovation, CyberSage develops
            intelligent platforms that combine artificial intelligence, threat intelligence,
            cybersecurity training, and real-world simulation to prepare organisations for the
            evolving threat landscape.
          </p>
        </div>
      </section>

      {/* Mission statement */}
      <section className="border-y border-edge bg-surface-1 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <blockquote className="text-2xl sm:text-3xl font-bold leading-snug mb-6">
            &ldquo;The best way to stop cyber attacks is to understand them, simulate them, and learn from them before they happen.&rdquo;
          </blockquote>
          <p className="text-ink-3 text-sm italic">— The CyberSage founding principle</p>
        </div>
      </section>

      {/* The ecosystem */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="mb-12">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-2">Our Ecosystem</p>
          <h2 className="text-3xl font-bold mb-4">More than a single product</h2>
          <p className="text-ink-2 leading-relaxed max-w-2xl">
            CyberSage is building a complete cybersecurity ecosystem designed to support learning,
            detection, response, and resilience. Three platforms. One mission.
          </p>
        </div>

        <div className="space-y-6">
          {PRODUCTS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl border p-8 ${p.current ? "border-ok-edge bg-ok-wash" : "border-edge bg-surface-1"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-widest border rounded-full px-3 py-1 mb-2 ${p.tagColor}`}>
                    {p.tag}
                  </span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold">{p.name}</h3>
                    {p.current && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-ok-wash text-ink-3 border border-ok-edge rounded-full px-2 py-0.5">
                        Live
                      </span>
                    )}
                    {!p.current && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-surface-2 text-ink-3 border border-edge-strong rounded-full px-2 py-0.5">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
                {p.href && (
                  <a
                    href={p.href}
                    className="text-xs font-semibold text-ok border border-ok-edge rounded-lg px-3 py-1.5 hover:bg-ok-wash transition"
                  >
                    Visit Sage Vault →
                  </a>
                )}
              </div>

              <p className="text-ink-2 leading-relaxed text-sm mb-6">{p.description}</p>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {p.capabilities.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm text-ink-2">
                    <span className={`shrink-0 mt-0.5 ${p.current ? "text-ok" : "text-ink-3"}`}><Icon name="check" size={14} className="inline-block shrink-0" /></span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section className="border-y border-edge bg-surface-1 py-20">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Our Vision</p>
          <h2 className="text-3xl font-bold mb-6">Proactive defence through intelligent technology</h2>
          <p className="text-ink-2 leading-relaxed text-lg">
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
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Who We Serve</p>
            <h2 className="text-3xl font-bold mb-6">Built for the full security community</h2>
            <p className="text-ink-2 leading-relaxed text-sm">
              From students taking their first SOC module to enterprise red teams running live exercises —
              CyberSage solutions are designed to meet you where you are and scale with your needs.
            </p>
          </div>
          <ul className="space-y-3">
            {WHO_WE_SERVE.map((w) => (
              <li key={w} className="flex items-center gap-3 text-sm text-ink-2">
                <span className="h-1.5 w-1.5 rounded-full bg-ok shrink-0" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Commitment values */}
      <section className="border-y border-edge bg-surface-1 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs uppercase tracking-widest text-ink-3 mb-3 text-center">Our Commitment</p>
          <h2 className="text-3xl font-bold text-center mb-10">Intelligence. Simulation. Resilience.</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {COMMITMENTS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-edge bg-surface-1 p-6">
                <IconTile name={c.icon} size={44} className="mb-3" />
                <h3 className="font-bold text-base mb-2">{c.title}</h3>
                <p className="text-sm text-ink-2 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Join the CyberSage ecosystem</h2>
        <p className="text-ink-2 text-sm leading-relaxed mb-8 max-w-xl mx-auto">
          Whether you&apos;re building skills, running a classroom, or hiring for your security team —
          Sage Vault is available today. Brain Sentinel and Nexus are coming soon.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/sign-up" className="rounded-xl bg-accent-fill px-6 py-3 font-semibold text-white hover:bg-accent-hover transition">
            Get started with Sage Vault →
          </Link>
          <Link href="/contact" className="rounded-xl border border-edge-strong px-6 py-3 text-ink-2 hover:text-white hover:border-edge-strong transition">
            Talk to our team
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
