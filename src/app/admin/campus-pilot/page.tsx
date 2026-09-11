import { revalidatePath } from "next/cache";
import { listPilotSubmissions, updatePilotStatus } from "@/lib/campus-pilot";
import type { CampusPilotStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campus Pilot — Applications · Admin" };

const STATUSES: CampusPilotStatus[] = ["NEW", "CONTACTED", "IN_DISCUSSION", "APPROVED", "DECLINED"];

const STATUS_STYLE: Record<CampusPilotStatus, string> = {
  NEW: "text-blue-400 border-blue-500/40 bg-blue-500/10",
  CONTACTED: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  IN_DISCUSSION: "text-purple-400 border-purple-500/40 bg-purple-500/10",
  APPROVED: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
  DECLINED: "text-zinc-500 border-white/15 bg-white/5",
};

export default async function AdminCampusPilotPage() {
  const submissions = await listPilotSubmissions();
  const newCount = submissions.filter((s) => s.status === "NEW").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-6xl px-8 py-10">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.28em] text-emerald-500">Campus Pilot Program</p>
        <h1 className="text-3xl font-black tracking-tight">Applications</h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          {submissions.length} total · <span className="text-blue-400">{newCount} new</span>
        </p>

        {submissions.length === 0 ? (
          <p className="mt-10 text-sm text-zinc-600">No applications yet.</p>
        ) : (
          <div className="mt-8 space-y-3">
            {submissions.map((s) => (
              <div key={s.id} className="rounded-xl border border-white/10 bg-zinc-900/40 p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-zinc-100">{s.universityName}</p>
                    <p className="text-sm text-zinc-400">
                      {s.contactName} · {s.contactRole}
                      {s.department ? ` · ${s.department}` : ""}
                    </p>
                    <a href={`mailto:${s.contactEmail}`} className="text-xs text-emerald-400 hover:underline">
                      {s.contactEmail}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[s.status]}`}>
                      {s.status.replace("_", " ")}
                    </span>
                    <p className="font-mono text-[11px] text-zinc-600">{s.createdAt.toISOString().slice(0, 10)}</p>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-zinc-500">
                  {s.studentEstimate && <span>Students: {s.studentEstimate}</span>}
                  {s.country && <span>Country: {s.country}</span>}
                  {s.heardFrom && <span>Heard via: {s.heardFrom}</span>}
                </div>

                {s.message && (
                  <p className="mb-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 text-sm leading-relaxed text-zinc-400">
                    {s.message}
                  </p>
                )}

                <form
                  action={async (formData: FormData) => {
                    "use server";
                    const status = formData.get("status") as CampusPilotStatus;
                    await updatePilotStatus(s.id, status);
                    revalidatePath("/admin/campus-pilot");
                  }}
                  className="flex items-center gap-2"
                >
                  <select
                    name="status"
                    defaultValue={s.status}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-200"
                  >
                    {STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10">
                    Update
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
