import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { getPlanPricing } from "@/lib/plan-pricing";
import { hasProductAccess } from "@/lib/access-gate";
import { Navbar } from "@/components/navbar";
import { CompletePaymentClient } from "./_components/complete-payment-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Complete Payment · Sage Vault" };

export default async function CompletePaymentPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  // Re-checks fresh against the database rather than trusting the session's
  // cached hasAccess claim, since that's exactly what this page exists to fix.
  if (await hasProductAccess(user)) redirect("/dashboard");

  // ADMIN always has access above, so this can't actually fire — it's here
  // only so the role passed down stays a real signup role for TypeScript.
  if (user.role === "ADMIN") redirect("/dashboard");

  const pricing = await getPlanPricing();
  const planRow = pricing.find((p) => p.role === user.role) ?? pricing[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="mx-auto max-w-md px-6 py-16">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">One step left</p>
          <h1 className="text-2xl font-bold">Complete your {planRow.label} plan</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Your account is set up — finish payment to unlock the platform.
          </p>
        </div>
        <CompletePaymentClient role={user.role} basePrice={planRow.priceAmt} planLabel={planRow.label} />
      </div>
    </main>
  );
}
