import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { BillingClient } from "./_components/billing-client";

import { Icon } from "@/components/ui/icon";
export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; canceled?: string }>;
}) {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const { success, canceled } = await searchParams;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-surface-0 text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Account</p>
            <h1 className="text-2xl font-bold">Billing</h1>
            <p className="text-ink-2 text-sm mt-1">{user.email}</p>
          </div>

          {success === "1" && (
            <div className="rounded-xl border border-ok-edge bg-ok-wash p-4 mb-6 flex items-center gap-3">
              <span className="text-ok text-lg"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
              <div>
                <p className="font-semibold text-ok text-sm">Subscription activated</p>
                <p className="text-xs text-ink-2 mt-0.5">Your 14-day trial has started. Full Classroom access is now unlocked.</p>
              </div>
            </div>
          )}

          {canceled === "1" && (
            <div className="rounded-xl border border-warn-edge bg-warn-wash p-4 mb-6">
              <p className="text-sm text-warn">Checkout cancelled — no charge was made.</p>
            </div>
          )}

          <BillingClient
            plan={user.subscriptionPlan ?? null}
            status={user.subscriptionStatus ?? null}
            trialEndsAt={user.trialEndsAt?.toISOString() ?? null}
            hasSubscription={!!user.stripeSubscriptionId}
          />

          <div className="mt-10 rounded-xl border border-edge bg-surface-1 p-5">
            <p className="text-xs uppercase tracking-widest text-ink-3 mb-3">Classroom Plan Includes</p>
            <ul className="space-y-2">
              {[
                "Unlimited classrooms",
                "Assign labs and simulation scenarios",
                "Live student progress dashboards",
                "Instructor observation mode",
                "Printable classroom performance reports",
                "Up to 50 students per classroom",
                "Email support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-ink-2">
                  <span className="text-ok shrink-0"><Icon name="check" size={14} className="inline-block shrink-0" /></span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-ink-3 text-center mt-8">
            Need an Enterprise plan with SSO, unlimited seats, or a custom contract?{" "}
            <a href="mailto:support@cybersage.uk?subject=Enterprise%20Inquiry" className="text-ink-2 hover:text-ink underline">
              Contact sales
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
