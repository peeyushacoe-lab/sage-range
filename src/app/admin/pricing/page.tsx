import { getPlanPricing } from "@/lib/plan-pricing";
import { PricingEditor } from "../_components/pricing-editor";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await getPlanPricing();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Plan Pricing</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Set the monthly price for each account type. Changes apply immediately to new sign-ups.
        </p>
      </div>

      <PricingEditor initialPlans={plans} />

      <div className="mt-8 rounded-xl border border-white/8 p-5">
        <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">How it works</p>
        <ul className="space-y-2 text-xs text-zinc-500">
          <li>• Set a price to <span className="text-zinc-300">$0</span> to make that plan free — no payment collected.</li>
          <li>• Voucher codes are applied on top of these base prices.</li>
          <li>• If a voucher brings the final price to $0, the user skips payment entirely.</li>
          <li>• Existing subscribers are not affected — only new sign-ups see updated prices.</li>
        </ul>
      </div>
    </div>
  );
}
