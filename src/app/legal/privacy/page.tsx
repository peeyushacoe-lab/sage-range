import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const UPDATED = "1 June 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <main>
        <div className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs text-zinc-500 mb-2">Last updated: {UPDATED}</p>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-zinc-400 text-sm mb-10">
            CyberSage Ltd, operating Sage Forge (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;), is committed to protecting your personal information.
            This policy explains what data we collect, how we use it, and your rights.
          </p>

          <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-white mb-3">1. Data We Collect</h2>
              <p className="text-zinc-400 mb-3">We collect the following categories of data when you use Sage Forge:</p>
              <ul className="space-y-2 text-zinc-400">
                <li><span className="text-white font-medium">Account data:</span> Email address, display name, role (Student / Instructor / Recruiter), university, profile fields you choose to fill in (bio, skills, CV URL, LinkedIn, GitHub, company, job title).</li>
                <li><span className="text-white font-medium">Activity data:</span> Lab attempts and progress, simulation session events, learning path progress, competition entries, leaderboard scores.</li>
                <li><span className="text-white font-medium">Simulation data:</span> Decisions made during simulations, timing, scores, and the generated company/scenario context for each session.</li>
                <li><span className="text-white font-medium">Classroom data:</span> Classroom enrollments, lab assignments, instructor-posted announcements.</li>
                <li><span className="text-white font-medium">Payment data:</span> Stripe customer ID and subscription status. We do not store card numbers — all payment processing is handled by Stripe.</li>
                <li><span className="text-white font-medium">Technical data:</span> Session token cookie set by NextAuth (our authentication provider) and two httpOnly cookies we set for role and onboarding state.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">2. How We Use Your Data</h2>
              <ul className="space-y-2 text-zinc-400">
                <li>Provide and operate the Sage Forge platform</li>
                <li>Generate your skill profile, certificates, and debrief reports</li>
                <li>Allow instructors to track student progress in their classrooms</li>
                <li>Allow recruiters to browse simulation-assessed candidate profiles (only with your consent via public profile settings)</li>
                <li>Send transactional emails (welcome, classroom join confirmations, certificate notifications)</li>
                <li>Process subscription payments via Stripe</li>
                <li>Improve the platform through aggregated, anonymised analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">3. Data Sharing</h2>
              <p className="text-zinc-400 mb-3">We do not sell your personal data. We share data only with:</p>
              <ul className="space-y-2 text-zinc-400">
                <li><span className="text-white font-medium">Google / GitHub</span> — OAuth sign-in via NextAuth</li>
                <li><span className="text-white font-medium">Stripe</span> — payment processing for paid subscriptions</li>
                <li><span className="text-white font-medium">Resend</span> — transactional email delivery</li>
                <li><span className="text-white font-medium">Supabase / Neon</span> — PostgreSQL database hosting</li>
                <li><span className="text-white font-medium">Vercel</span> — application hosting and edge functions</li>
                <li><span className="text-white font-medium">OpenAI</span> — generation of AI debrief reports (your scenario context is sent; no PII is included in prompts)</li>
              </ul>
              <p className="text-zinc-400 mt-3">Recruiters with an Enterprise plan can view your public simulation profile only if your profile is set to visible. Simulation scores and certificates are not shared without your action.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">4. Data Retention</h2>
              <ul className="space-y-2 text-zinc-400">
                <li><span className="text-white font-medium">Active accounts:</span> Data is retained for the lifetime of your account.</li>
                <li><span className="text-white font-medium">Deleted accounts:</span> Personal data is deleted within 30 days of account deletion. Anonymised aggregate analytics may be retained indefinitely.</li>
                <li><span className="text-white font-medium">Simulation events:</span> Session event logs are retained to power debriefs, certificates, and verification. They are deleted when you delete your account.</li>
                <li><span className="text-white font-medium">Payment records:</span> Stripe retains billing records as required by financial regulations (typically 7 years).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">5. Your Rights</h2>
              <p className="text-zinc-400 mb-3">Under GDPR and UK data protection law, you have the right to:</p>
              <ul className="space-y-1 text-zinc-400">
                <li>Access a copy of the data we hold about you</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your account and associated data</li>
                <li>Object to processing for marketing purposes</li>
                <li>Data portability (export your profile and simulation history)</li>
              </ul>
              <p className="text-zinc-400 mt-3">
                To exercise any of these rights, email us at{" "}
                <a href="mailto:support@cybersage.uk" className="text-sage-400 hover:underline">support@cybersage.uk</a>.
                We will respond within 30 days.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">6. Cookies</h2>
              <p className="text-zinc-400">We use the following cookies:</p>
              <ul className="space-y-2 text-zinc-400 mt-3">
                <li><span className="font-mono text-xs text-zinc-300">next-auth.session-token</span> — Authentication session. Required for login.</li>
                <li><span className="font-mono text-xs text-zinc-300">sage_onboarded</span> — Whether you&apos;ve completed onboarding. httpOnly, expires in 1 year.</li>
                <li><span className="font-mono text-xs text-zinc-300">sage_role</span> — Your current role for edge routing. httpOnly, expires in 1 year.</li>
              </ul>
              <p className="text-zinc-400 mt-3">We do not use advertising cookies or third-party tracking.</p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">7. Security</h2>
              <p className="text-zinc-400">
                All data is transmitted over HTTPS. Authentication is handled via NextAuth with industry-standard JWT tokens.
                Database access is restricted to application servers. Simulation sessions are isolated per user.
                We conduct periodic security reviews and address vulnerabilities promptly.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">8. Contact</h2>
              <p className="text-zinc-400">
                For privacy questions or data requests, contact us at{" "}
                <a href="mailto:support@cybersage.uk" className="text-sage-400 hover:underline">support@cybersage.uk</a>.
              </p>
            </section>
          </div>

          <div className="mt-12 flex gap-4 text-xs text-zinc-500">
            <Link href="/legal/terms"   className="hover:text-zinc-300">Terms of Service</Link>
            <Link href="/legal/cookies" className="hover:text-zinc-300">Cookie Policy</Link>
            <Link href="/"              className="hover:text-zinc-300">← Home</Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
