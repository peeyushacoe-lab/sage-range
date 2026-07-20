import Link from "next/link";
import { MarketingNav } from "@/components/marketing-nav";
import { MarketingFooter } from "@/components/marketing-footer";

const UPDATED = "1 June 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingNav />
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-3xl mx-auto px-6 py-12">
          <p className="text-xs text-zinc-500 mb-2">Last updated: {UPDATED}</p>
          <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
          <p className="text-zinc-400 text-sm mb-10">
            By creating an account or using Sage Vault, you agree to these terms.
            Please read them carefully.
          </p>

          <div className="space-y-10 text-sm leading-relaxed text-zinc-300">
            <section>
              <h2 className="text-base font-semibold text-white mb-3">1. Service Description</h2>
              <p className="text-zinc-400">
                Sage Vault is a cyber security training, assessment, and talent platform that provides hands-on labs,
                live incident response simulations, classroom management tools, and a recruiter talent marketplace.
                The platform is operated by CyberSage Ltd (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) under the Sage Vault brand.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">2. Acceptable Use</h2>
              <p className="text-zinc-400 mb-3">You agree not to:</p>
              <ul className="space-y-1 text-zinc-400">
                <li>Attempt to access other users&apos; accounts, data, or simulation sessions</li>
                <li>Reverse engineer, decompile, or extract the simulation engine, scenario content, or AI models</li>
                <li>Use the platform to train competing AI systems or build derivative products</li>
                <li>Submit false information in profiles or certificates</li>
                <li>Abuse the certification system by sharing flags or simulation answers</li>
                <li>Use automated tools to submit lab flags or complete simulations</li>
                <li>Harass other users or post inappropriate content in classrooms or profiles</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">3. Simulation Content</h2>
              <p className="text-zinc-400">
                All simulations are fully fictionalised scenarios. Company names, employee names, and scenarios
                are generated and do not represent real organisations or individuals. The platform does not
                execute real malware, connect to real infrastructure, or process real sensitive data.
                Techniques referenced are for educational purposes only, mapped to the MITRE ATT&amp;CK framework.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">4. Accounts &amp; Access</h2>
              <ul className="space-y-2 text-zinc-400">
                <li>You must be 16 years or older to create an account.</li>
                <li>You are responsible for keeping your credentials secure.</li>
                <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
                <li>Student accounts are free. Classroom and Enterprise plans require a paid subscription.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">5. Subscriptions &amp; Billing</h2>
              <ul className="space-y-2 text-zinc-400">
                <li>Classroom plans are billed monthly at $149 per cohort.</li>
                <li>A 14-day free trial is available for new Classroom subscribers. No charge during the trial.</li>
                <li>Subscriptions auto-renew monthly. You can cancel at any time from the billing portal.</li>
                <li>Cancellation takes effect at the end of the current billing period — no prorated refunds.</li>
                <li>Enterprise pricing is negotiated separately. Contact us for a quote.</li>
                <li>All payments are processed by Stripe. We do not store card data.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">6. Certificates &amp; Verification</h2>
              <p className="text-zinc-400">
                Simulation certificates are issued based on your actual in-session performance.
                They are verifiable via a public URL that includes your score, assessment rating,
                and scenario details. Certificates may not be altered, forged, or misrepresented.
                We reserve the right to revoke certificates if evidence of cheating or misuse is found.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">7. Intellectual Property</h2>
              <p className="text-zinc-400">
                All platform content — including simulation scenarios, lab content, assessment logic,
                the REDai adversary engine, and the Sage Vault brand — is the intellectual property of Sage Vault.
                You may not reproduce, distribute, or create derivative works without written permission.
                Your profile content (bio, skills, projects) remains your own.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">8. Privacy</h2>
              <p className="text-zinc-400">
                Your use of the platform is also governed by our{" "}
                <Link href="/legal/privacy" className="text-sage-400 hover:underline">Privacy Policy</Link>,
                which forms part of these terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">9. Disclaimers &amp; Limitation of Liability</h2>
              <p className="text-zinc-400 mb-3">
                The platform is provided &quot;as is&quot;. We do not guarantee uninterrupted availability.
                We are not liable for indirect, incidental, or consequential damages arising from your use of the platform.
              </p>
              <p className="text-zinc-400">
                Simulation scores and certificates are educational indicators. We make no warranty that they
                will result in employment, academic recognition, or professional certification.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">10. Changes to These Terms</h2>
              <p className="text-zinc-400">
                We may update these terms from time to time. Significant changes will be communicated by email.
                Continued use of the platform after changes constitutes acceptance of the revised terms.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">11. Governing Law</h2>
              <p className="text-zinc-400">
                These terms are governed by the laws of England and Wales.
                Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section>
              <h2 className="text-base font-semibold text-white mb-3">12. Contact</h2>
              <p className="text-zinc-400">
                For legal enquiries, email{" "}
                <a href="mailto:support@cybersage.uk" className="text-sage-400 hover:underline">support@cybersage.uk</a>.
              </p>
            </section>
          </div>

          <div className="mt-12 flex gap-4 text-xs text-zinc-500">
            <Link href="/legal/privacy" className="hover:text-zinc-300">Privacy Policy</Link>
            <Link href="/legal/cookies" className="hover:text-zinc-300">Cookie Policy</Link>
            <Link href="/"              className="hover:text-zinc-300">← Home</Link>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
