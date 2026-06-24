import { db } from "@/lib/db";
import { NewVoucherForm } from "../_components/new-voucher-form";
import { VoucherToggle } from "../_components/voucher-toggle";
import { VoucherDeleteBtn } from "../_components/voucher-delete-btn";

export const dynamic = "force-dynamic";

function discountLabel(pct: number, amt: number) {
  const parts: string[] = [];
  if (pct > 0) parts.push(`${pct}% off`);
  if (amt > 0) parts.push(`$${(amt / 100).toFixed(2)} off`);
  return parts.join(" + ") || "—";
}

export default async function VouchersPage() {
  const vouchers = await db.voucher.findMany({ orderBy: { createdAt: "desc" } });

  const total = vouchers.length;
  const active = vouchers.filter((v) => v.active).length;
  const totalUses = vouchers.reduce((s, v) => s + v.usedCount, 0);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Vouchers</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {total} total · {active} active · {totalUses} uses redeemed
          </p>
        </div>
        <NewVoucherForm />
      </div>

      {vouchers.length === 0 ? (
        <div className="rounded-xl border border-white/8 flex flex-col items-center justify-center py-20 text-center">
          <p className="text-zinc-500 text-sm mb-1">No vouchers yet.</p>
          <p className="text-zinc-700 text-xs">Create one to offer discounts at sign-up.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left">
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Code</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Discount</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Uses</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Expires</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium">Status</th>
                <th className="px-4 py-3 text-xs text-zinc-500 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v, i) => {
                const expired = v.expiresAt && v.expiresAt < new Date();
                const exhausted = v.maxUses !== null && v.usedCount >= v.maxUses;

                return (
                  <tr
                    key={v.id}
                    className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/1"}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-semibold text-white tracking-wider">
                        {v.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-medium">
                      {discountLabel(v.discountPct, v.discountAmt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 tabular-nums">
                      {v.usedCount}
                      {v.maxUses !== null && (
                        <span className="text-zinc-600">/{v.maxUses}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {v.expiresAt ? (
                        <span className={expired ? "text-red-400" : ""}>
                          {v.expiresAt.toISOString().slice(0, 10)}
                        </span>
                      ) : (
                        <span className="text-zinc-700">Never</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {expired || exhausted ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-medium">
                          {expired ? "Expired" : "Exhausted"}
                        </span>
                      ) : (
                        <VoucherToggle id={v.id} active={v.active} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <VoucherDeleteBtn id={v.id} code={v.code} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
