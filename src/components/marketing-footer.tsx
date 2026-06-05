import Link from "next/link";

const LINKS = {
  "Sage Forge": [
    { label: "Pricing",     href: "/pricing" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Sign Up Free", href: "/sign-up" },
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
  { name: "Nexus",          desc: "Secure workspace" },
];

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/8 bg-zinc-950 text-zinc-400">
      <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 sm:grid-cols-5 gap-8">
        {/* Brand */}
        <div className="col-span-2 sm:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-6 w-6 rounded bg-sage-500" />
            <span className="font-bold text-white tracking-tight">CyberSage</span>
          </div>
          <p className="text-xs text-zinc-600 mb-4">Intelligence. Simulation. Resilience.</p>
          <p className="text-xs leading-relaxed text-zinc-500 mb-4">
            A cybersecurity technology company building intelligent platforms for training, detection, and collaboration.
          </p>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1.5">Ecosystem</p>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-sage-500/20 border border-sage-500/30 flex items-center justify-center">
                <span className="text-[8px] text-sage-400 font-bold">SR</span>
              </div>
              <span className="text-xs text-zinc-400">Sage Forge <span className="text-sage-500 text-[10px]">Live</span></span>
            </div>
            {COMING_SOON.map((p) => (
              <div key={p.name} className="flex items-center gap-2 opacity-50">
                <div className="h-4 w-4 rounded-sm bg-zinc-800 border border-zinc-700" />
                <span className="text-xs text-zinc-500">{p.name} <span className="text-[10px]">· {p.desc}</span></span>
              </div>
            ))}
          </div>
        </div>

        {Object.entries(LINKS).map(([section, items]) => (
          <div key={section}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">{section}</p>
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

      <div className="border-t border-white/5 px-6 py-4 max-w-6xl mx-auto flex items-center justify-between text-xs text-zinc-600 flex-wrap gap-2">
        <span>© 2026 CyberSage. All rights reserved.</span>
        <span className="text-zinc-700 italic">Intelligence. Simulation. Resilience.</span>
      </div>
    </footer>
  );
}
