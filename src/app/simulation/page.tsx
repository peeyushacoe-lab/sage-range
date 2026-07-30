import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { Navbar } from "@/components/navbar";
import { EmptyState, PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-ok-wash text-ok",
  CONTAINED: "bg-ok-wash text-ok",
  BREACHED: "bg-danger-wash text-danger",
  ABANDONED: "bg-surface-3 text-ink-2",
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
      <PageHeader
        className="mb-8"
        title="Simulations"
        actions={
          <Link
            href="/simulation/new"
            className="rounded-lg bg-accent-fill px-4 py-2 text-sm font-semibold text-white hover:bg-ok-wash hover:text-white transition"
          >
            New Simulation →
          </Link>
        }
      />

      {sessions.length === 0 && (
        <EmptyState
          icon="soc"
          title="No simulations yet"
          description="Launch a live incident to put your decisions to the test — scored A–F and visible to recruiters."
          action={{ label: "Start Your First Simulation", href: "/simulation/new" }}
        />
      )}

      {activeSessions.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-3">Active</h2>
          <div className="space-y-3">
            {activeSessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        </section>
      )}

      {pastSessions.length > 0 && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-ink-3 mb-3">History</h2>
          <div className="divide-y divide-edge-subtle rounded-lg border border-edge">
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
      className="flex items-center justify-between rounded-xl border border-ok-edge bg-ok-wash p-5 hover:bg-ok-wash transition"
    >
      <div>
        <p className="font-semibold">{s.template.name}</p>
        <p className="text-xs text-ink-3 mt-0.5">{s.template.industry} · Started {s.startedAt.toISOString().slice(0, 10)}</p>
        <p className="text-xs text-ink-2 mt-1">Stage: <span className="text-ok">{s.currentStage.replace(/_/g, " ")}</span></p>
      </div>
      <div className="text-right">
        <span className="text-xs px-2 py-0.5 rounded-full bg-ok-wash text-ok font-semibold">ACTIVE</span>
        <p className="text-lg font-bold mt-1">{s.score} <span className="text-xs text-ink-3 font-normal">pts</span></p>
        <p className="text-xs text-ok mt-1">Resume →</p>
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
      className="flex items-center justify-between p-4 hover:bg-surface-2 transition"
    >
      <div>
        <p className="text-sm font-medium">{s.template.name}</p>
        <p className="text-xs text-ink-3">{s.startedAt.toISOString().slice(0, 10)} {duration !== null ? `· ${duration}m` : ""}</p>
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
