import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-sage-500/20 text-sage-500",
  CONTAINED: "bg-sage-500/20 text-sage-500",
  BREACHED: "bg-red-500/20 text-red-400",
  ABANDONED: "bg-zinc-500/20 text-zinc-400",
};

export default async function SimulationsPage() {
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const sessions = await db.simulationSession.findMany({
    where: { userId: user.id },
    include: { template: true },
    orderBy: { startedAt: "desc" },
    take: 50,
  });

  const activeSessions = sessions.filter((s) => s.status === "ACTIVE");
  const pastSessions = sessions.filter((s) => s.status !== "ACTIVE");

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Simulations</h1>
        </div>
        <Link
          href="/simulation/new"
          className="rounded-lg bg-sage-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition"
        >
          New Simulation →
        </Link>
      </div>

      {sessions.length === 0 && (
        <div className="rounded-xl border border-white/10 p-12 text-center">
          <p className="text-zinc-500 text-sm">No simulations yet.</p>
          <Link href="/simulation/new" className="mt-3 inline-block text-sage-500 text-sm hover:underline">
            Start your first simulation →
          </Link>
        </div>
      )}

      {activeSessions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Active</h2>
          <div className="space-y-3">
            {activeSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {pastSessions.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">History</h2>
          <div className="divide-y divide-white/5 rounded-lg border border-white/10">
            {pastSessions.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}
      </div>
    </main>
  );
}

type Session = {
  id: string;
  status: string;
  currentStage: string;
  score: number;
  startedAt: Date;
  endedAt: Date | null;
  template: { name: string; difficulty: string; industry: string };
};

function SessionCard({ session: s }: { session: Session }) {
  return (
    <Link
      href={`/simulation/${s.id}`}
      className="flex items-center justify-between rounded-xl border border-sage-500/30 bg-sage-500/5 p-5 hover:bg-sage-500/10 transition"
    >
      <div>
        <p className="font-semibold">{s.template.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{s.template.industry} · Started {s.startedAt.toISOString().slice(0, 10)}</p>
        <p className="text-xs text-zinc-400 mt-1">Stage: <span className="text-sage-400">{s.currentStage.replace(/_/g, " ")}</span></p>
      </div>
      <div className="text-right">
        <span className="text-xs px-2 py-0.5 rounded-full bg-sage-500/20 text-sage-500 font-semibold">ACTIVE</span>
        <p className="text-lg font-bold mt-1">{s.score} <span className="text-xs text-zinc-500 font-normal">pts</span></p>
        <p className="text-xs text-sage-500 mt-1">Resume →</p>
      </div>
    </Link>
  );
}

function SessionRow({ session: s }: { session: Session }) {
  const duration = s.endedAt
    ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000)
    : null;
  const href = s.status === "CONTAINED" || s.status === "BREACHED"
    ? `/simulation/${s.id}/debrief`
    : `/simulation/${s.id}`;
  return (
    <Link
      href={href}
      className="flex items-center justify-between p-4 hover:bg-white/3 transition"
    >
      <div>
        <p className="text-sm font-medium">{s.template.name}</p>
        <p className="text-xs text-zinc-500">{s.startedAt.toISOString().slice(0, 10)} {duration !== null ? `· ${duration}m` : ""}</p>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold">{s.score} pts</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[s.status] ?? STATUS_STYLE.ABANDONED}`}>
          {s.status}
        </span>
      </div>
    </Link>
  );
}
