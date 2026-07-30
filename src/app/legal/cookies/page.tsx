import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

import { Icon } from "@/components/ui/icon";
const UPDATED = "1 June 2026";

const COOKIES = [
  {
    name: "next-auth.session-token",
    provider: "Sage Vault (NextAuth)",
    purpose: "Authentication session token. Required for sign-in to work.",
    duration: "Session / up to 30 days",
    category: "Essential",
  },
  {
    name: "sage_onboarded",
    provider: "Sage Vault",
    purpose: "Records whether you have completed the onboarding flow. Used by the server to route you to the correct page on login.",
    duration: "1 year",
    category: "Essential",
  },
  {
    name: "sage_role",
    provider: "Sage Vault",
    purpose: "Stores your current platform role (Student / Instructor / Recruiter) so routing decisions can be made at the network edge without a database call.",
    duration: "1 year",
    category: "Essential",
  },
  {
    name: "sage_cookie_consent",
    provider: "Sage Vault",
    purpose: "Stores your cookie preference (accepted / declined) so the consent banner is not shown again.",
    duration: "Stored in localStorage (not a cookie)",
    category: "Functional",
  },
];

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-surface-0 text-white">
      <MarketingNav />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-xs text-ink-3 mb-2">Last updated: {UPDATED}</p>
        <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-ink-2 text-sm mb-10 leading-relaxed">
          This policy explains what cookies Sage Vault (by CyberSage) uses, why, and how you can control them.
        </p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-white mb-3">What are cookies?</h2>
            <p className="text-ink-2">
              Cookies are small text files stored in your browser when you visit a website. They are used to remember your preferences, keep you signed in, and help the site function correctly. Some functionality — like staying signed in — requires cookies and cannot work without them.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Cookies we use</h2>
            <div className="overflow-x-auto rounded-xl border border-edge">
              <table className="w-full text-xs min-w-[500px]">
                <thead>
                  <tr className="border-b border-edge text-ink-3 uppercase tracking-wider">
                    <th className="text-left p-3">Cookie / Storage</th>
                    <th className="text-left p-3">Provider</th>
                    <th className="text-left p-3">Purpose</th>
                    <th className="text-left p-3">Duration</th>
                    <th className="text-left p-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {COOKIES.map((c) => (
                    <tr key={c.name} className="align-top">
                      <td className="p-3 font-mono text-ink-2">{c.name}</td>
                      <td className="p-3 text-ink-2">{c.provider}</td>
                      <td className="p-3 text-ink-2 leading-relaxed">{c.purpose}</td>
                      <td className="p-3 text-ink-3 whitespace-nowrap">{c.duration}</td>
                      <td className="p-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          c.category === "Essential"  ? "text-ok border-ok-edge bg-ok-wash" :
                          c.category === "Functional" ? "text-info border-info-edge bg-info-wash" :
                          "text-ink-2 border-edge-strong bg-surface-2"
                        }`}>
                          {c.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">What we do NOT use</h2>
            <ul className="space-y-2 text-ink-2">
              <li className="flex items-start gap-2"><span className="text-danger shrink-0"><Icon name="cross" size={14} className="inline-block shrink-0" /></span> Advertising or tracking cookies</li>
              <li className="flex items-start gap-2"><span className="text-danger shrink-0"><Icon name="cross" size={14} className="inline-block shrink-0" /></span> Third-party analytics cookies (Google Analytics, Facebook Pixel, etc.)</li>
              <li className="flex items-start gap-2"><span className="text-danger shrink-0"><Icon name="cross" size={14} className="inline-block shrink-0" /></span> Fingerprinting or cross-site tracking</li>
              <li className="flex items-start gap-2"><span className="text-danger shrink-0"><Icon name="cross" size={14} className="inline-block shrink-0" /></span> Persistent advertising identifiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Cookie categories explained</h2>
            <div className="space-y-3">
              <div className="rounded-xl border border-ok-edge bg-ok-wash p-4">
                <p className="font-semibold text-ok mb-1">Essential cookies</p>
                <p className="text-ink-2">Required for the platform to function. Without them, you cannot sign in or use any authenticated features. These cannot be disabled if you use the service.</p>
              </div>
              <div className="rounded-xl border border-info-edge bg-info-wash p-4">
                <p className="font-semibold text-info mb-1">Functional storage</p>
                <p className="text-ink-2">Stores your preferences (like your cookie consent choice) in your browser&apos;s localStorage. Not shared with any server. You can clear it by clearing your browser&apos;s local storage.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">How to manage cookies</h2>
            <p className="text-ink-2 mb-3">
              You can manage or delete cookies through your browser settings. Note that disabling essential cookies will prevent you from signing in to Sage Vault.
            </p>
            <ul className="space-y-1 text-ink-2">
              <li><a href="https://support.google.com/chrome/answer/95647" className="text-ok hover:underline" target="_blank" rel="noreferrer">Chrome cookie settings ↗</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" className="text-ok hover:underline" target="_blank" rel="noreferrer">Firefox cookie settings ↗</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" className="text-ok hover:underline" target="_blank" rel="noreferrer">Safari cookie settings ↗</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-white mb-3">Contact</h2>
            <p className="text-ink-2">
              For cookie-related questions, email{" "}
              <a href="mailto:support@cybersage.uk" className="text-ok hover:underline">
                support@cybersage.uk
              </a>.
            </p>
          </section>
        </div>

        <div className="mt-12 flex gap-4 text-xs text-ink-3">
          <Link href="/legal/privacy" className="hover:text-ink-2">Privacy Policy</Link>
          <Link href="/legal/terms"   className="hover:text-ink-2">Terms of Service</Link>
          <Link href="/"              className="hover:text-ink-2">← Home</Link>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
