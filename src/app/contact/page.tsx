import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const CONTACTS = [
  {
    title: "General Enquiries",
    description: "Questions about CyberSage, our products, partnerships, or press.",
    email: "support@cybersage.uk",
    subject: "General Enquiry — CyberSage",
    badge: null,
    badgeColor: null,
  },
  {
    title: "Student Support",
    description: "Help with labs, simulations, certificates, or your account.",
    email: "support@cybersage.uk",
    subject: "Student Support — Sage Vault",
    badge: "Free",
    badgeColor: "text-sage-400 border-sage-500/30 bg-sage-500/8",
  },
  {
    title: "Classroom & University Plans",
    description: "Setting up a classroom, billing, custom cohort pricing, or institution access.",
    email: "support@cybersage.uk",
    subject: "Classroom Plan Enquiry — Sage Vault",
    badge: "$149/mo",
    badgeColor: "text-blue-400 border-blue-500/30 bg-blue-500/8",
  },
  {
    title: "Enterprise & Recruiting",
    description: "Talent assessment, bulk seat licensing, custom scenarios, SSO, or a demo.",
    email: "support@cybersage.uk",
    subject: "Enterprise Demo Request — Sage Vault",
    badge: "Custom",
    badgeColor: "text-amber-400 border-amber-500/30 bg-amber-500/8",
  },
];

const FAQ = [
  {
    q: "How quickly do you respond?",
    a: "We aim to respond to all enquiries within 1 business day. Enterprise and classroom enquiries are prioritised.",
  },
  {
    q: "I found a security vulnerability. How do I report it?",
    a: "Please email us directly with subject line 'Security Disclosure'. We take all reports seriously and will respond within 24 hours. Please don't post public issues for security vulnerabilities.",
  },
  {
    q: "Can I request a live demo?",
    a: "Yes — email us with the Enterprise subject line above and we'll schedule a 30-minute walkthrough of the full platform.",
  },
  {
    q: "I'm a student and something isn't working. What should I do?",
    a: "Email student support with your account email and a description of what's happening. Screenshots are very helpful.",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-12 text-center">
        <p className="text-xs uppercase tracking-widest text-sage-500 font-semibold mb-3">Contact</p>
        <h1 className="text-4xl font-bold mb-4">Get in touch</h1>
        <p className="text-zinc-400 leading-relaxed">
          Whether you&apos;re a student with a question, an instructor setting up a classroom,
          or an enterprise looking for a demo — we&apos;ll get back to you quickly.
        </p>
      </section>

      {/* Contact cards */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTACTS.map((c) => (
            <a
              key={c.title}
              href={`mailto:${c.email}?subject=${encodeURIComponent(c.subject)}`}
              className="group rounded-2xl border border-white/8 bg-zinc-900/40 p-6 hover:border-white/15 hover:bg-zinc-900/60 transition flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold text-zinc-100 group-hover:text-white transition">{c.title}</h3>
                {c.badge && (
                  <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-full px-2 py-0.5 shrink-0 ${c.badgeColor}`}>
                    {c.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed flex-1">{c.description}</p>
              <div className="flex items-center gap-2 text-sm text-sage-400 font-medium">
                <span>{c.email}</span>
                <span className="opacity-0 group-hover:opacity-100 transition">→</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Direct email block */}
      <section className="border-y border-white/8 bg-zinc-900/20 py-16">
        <div className="max-w-xl mx-auto px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-4">Prefer email directly?</p>
          <a
            href="mailto:support@cybersage.uk"
            className="text-2xl font-bold text-sage-400 hover:text-sage-300 transition break-all"
          >
            support@cybersage.uk
          </a>
          <p className="text-zinc-500 text-sm mt-3">
            We read and respond to every message personally.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-sm uppercase tracking-widest text-zinc-500 mb-8 text-center">Before you write</h2>
        <div className="space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-white/8 bg-zinc-900/30 p-5">
              <p className="font-semibold text-sm text-white mb-2">{q}</p>
              <p className="text-sm text-zinc-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <section className="border-t border-white/8 bg-zinc-900/30 py-12 text-center">
        <p className="text-zinc-500 text-sm mb-4">You might also be looking for:</p>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link href="/pricing" className="text-zinc-400 hover:text-white transition">Pricing →</Link>
          <Link href="/about"   className="text-zinc-400 hover:text-white transition">About us →</Link>
          <Link href="/legal/privacy" className="text-zinc-400 hover:text-white transition">Privacy Policy →</Link>
          <Link href="/legal/terms"   className="text-zinc-400 hover:text-white transition">Terms of Service →</Link>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
