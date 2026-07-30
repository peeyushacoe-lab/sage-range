import Link from "next/link";
import Image from "next/image";

const LINKS = {
  "Sage Vault": [
    { label: "Pricing",     href: "/pricing" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Sign Up",     href: "/sign-up" },
  ],
  Company: [
    { label: "About CyberSage", href: "/about" },
    { label: "Contact",         href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy",  href: "/legal/privacy" },
    { label: "Terms of Service", href: "/legal/terms" },
    { label: "Cookie Policy",   href: "/legal/cookies" },
  ],
};

const COMING_SOON = [
  { name: "Brain Sentinel", desc: "AI security intelligence" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-edge bg-surface-0 text-ink-2">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-2">
          <div className="flex items-center gap-2.5 mb-1">
            <Image src="/logo.png" alt="Sage Vault" width={32} height={32} className="rounded-md" unoptimized />
            <span className="font-bold text-white tracking-tight">CyberSage</span>
          </div>
          <p className="text-xs text-ink-3 mb-4">Intelligence. Simulation. Resilience.</p>
          <p className="text-xs leading-relaxed text-ink-3 mb-4">
            A cybersecurity technology company building intelligent platforms for training, detection, and collaboration.
          </p>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-ink-3 mb-1.5">Ecosystem</p>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-ok-wash border border-ok-edge flex items-center justify-center">
                <span className="text-[8px] text-ok font-bold">SV</span>
              </div>
              <span className="text-xs text-ink-2">Sage Vault <span className="text-ok text-[10px]">· Live</span></span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-info-wash border border-info-edge flex items-center justify-center">
                <span className="text-[8px] text-info font-bold">NX</span>
              </div>
              <span className="text-xs text-ink-2">Nexus <span className="text-info text-[10px]">· Live</span></span>
            </div>
            {COMING_SOON.map((p) => (
              <div key={p.name} className="flex items-center gap-2 opacity-50">
                <div className="h-4 w-4 rounded-sm bg-surface-2 border border-edge-strong" />
                <span className="text-xs text-ink-3">{p.name} <span className="text-[10px]">· {p.desc}</span></span>
              </div>
            ))}
          </div>
        </div>

        {Object.entries(LINKS).map(([section, items]) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-ink-3 mb-3">{section}</p>
            <ul className="space-y-2">
              {items.map(({ label, href }) => (
                <li key={href}>
                  <Link href={href} className="text-sm hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-edge-subtle px-6 py-4 max-w-6xl mx-auto flex items-center justify-between text-xs text-ink-3 flex-wrap gap-2">
        <span>© 2026 CyberSage. All rights reserved.</span>
        <span className="text-ink-3 italic">Intelligence. Simulation. Resilience.</span>
      </div>
    </footer>
  );
}
