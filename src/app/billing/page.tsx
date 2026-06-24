import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { BillingClient } from "./_components/billing-client";

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
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Account</p>
            <h1 className="text-2xl font-bold">Billing</h1>
            <p className="text-zinc-400 text-sm mt-1">{user.email}</p>
          </div>

          {success === "1" && (
            <div className="rounded-xl border border-sage-500/30 bg-sage-500/8 p-4 mb-6 flex items-center gap-3">
              <span className="text-sage-400 text-lg">✓</span>
              <div>
                <p className="font-semibold text-sage-400 text-sm">Subscription activated</p>
                <p className="text-xs text-zinc-400 mt-0.5">Your 14-day trial has started. Full Classroom access is now unlocked.</p>
              </div>
            </div>
          )}

          {canceled === "1" && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/8 p-4 mb-6">
              <p className="text-sm text-amber-400">Checkout cancelled — no charge was made.</p>
            </div>
          )}

          <BillingClient
            plan={user.subscriptionPlan ?? null}
            status={user.subscriptionStatus ?? null}
            trialEndsAt={user.trialEndsAt?.toISOString() ?? null}
            hasSubscription={!!user.stripeSubscriptionId}
          />

          <div className="mt-10 rounded-xl border border-white/8 bg-zinc-900/30 p-5">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Classroom Plan Includes</p>
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
                <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="text-sage-500 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-zinc-600 text-center mt-8">
            Need an Enterprise plan with SSO, unlimited seats, or a custom contract?{" "}
            <a href="mailto:support@cybersage.uk?subject=Enterprise%20Inquiry" className="text-zinc-400 hover:text-zinc-200 underline">
              Contact sales
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
