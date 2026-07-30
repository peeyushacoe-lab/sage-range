import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getOrCreateAppUser } from '@/lib/current-user';
import { Navbar } from '@/components/navbar';
import { PageHeader, EmptyState, Card, StatCard } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUSES = [
  { key: 'ACTIVE', label: 'Active' },
  { key: 'COMPLETED', label: 'Completed' },
] as const;

type StatusFilter = 'ACTIVE' | 'COMPLETED' | 'ALL';

export default async function TicketsIndex({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const statusFilter: StatusFilter = STATUSES.find((s) => s.key === statusParam)?.key ?? 'ALL';

  const user = await getOrCreateAppUser();
  if (!user) redirect('/sign-in');

  // Shifts that actually carry a ticket queue. SocShift has no status column —
  // a shift is ACTIVE or COMPLETED relative to *this* user's attempt.
  const shifts = await db.socShift.findMany({
    where: { published: true, tickets: { some: {} } },
    include: {
      _count: { select: { tickets: true } },
      attempts: {
        where: { userId: user.id },
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { completedAt: true, accuracyPct: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const shiftsWithStats = shifts.map((shift, idx) => {
    const attempt = shift.attempts[0];
    return {
      ...shift,
      shiftNumber: shifts.length - idx,
      status: attempt?.completedAt ? ('COMPLETED' as const) : ('ACTIVE' as const),
      avgAccuracy: attempt?.accuracyPct ?? 0,
    };
  });

  const visibleShifts =
    statusFilter === 'ALL'
      ? shiftsWithStats
      : shiftsWithStats.filter((s) => s.status === statusFilter);

  const totalShifts = shiftsWithStats.length;
  const completedShifts = shiftsWithStats.filter((s) => s.status === 'COMPLETED').length;
  const activeShifts = shiftsWithStats.filter((s) => s.status === 'ACTIVE').length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-info-wash text-info';
      case 'COMPLETED':
        return 'bg-ok-wash text-ok';
      case 'UPCOMING':
        return 'bg-surface-3 text-ink-2';
      default:
        return 'bg-surface-3 text-ink-2';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Ticket Queue Simulator"
          subtitle="Triage incoming security alerts in a high-pressure SOC environment. Score points based on decision accuracy, speed, and SLA compliance."
          actions={
            <Link
              href="/labs/tickets/history"
              className="shrink-0 rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-white hover:border-edge-strong transition"
            >
              My History →
            </Link>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Shifts" value={totalShifts} sub="available" />
          <StatCard label="Active" value={activeShifts} sub="ready to start" />
          <StatCard label="Completed" value={completedShifts} sub="finished" />
          <StatCard
            label="Leaderboards"
            value={
              <Link href="/labs/tickets/leaderboard/weekly" className="text-ok hover:text-ok">
                View →
              </Link>
            }
            sub="weekly rankings"
          />
        </div>

        {/* Filter */}
        <nav className="flex gap-2 mb-6">
          <Link
            href="/labs/tickets"
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              !statusParam
                ? 'bg-accent-fill text-white'
                : 'border border-edge text-ink-2 hover:text-white hover:border-edge-strong'
            )}
          >
            All
          </Link>
          {STATUSES.map((s) => (
            <Link
              key={s.key}
              href={`/labs/tickets?status=${s.key}`}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                statusParam === s.key
                  ? 'bg-accent-fill text-white'
                  : 'border border-edge text-ink-2 hover:text-white hover:border-edge-strong'
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        {/* Shifts Grid */}
        {visibleShifts.length === 0 ? (
          <EmptyState
            icon="layers"
            title="No shifts available"
            description="Check back soon for new SOC training shifts."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleShifts.map((shift, idx) => (
              <Card
                key={shift.id}
                className="p-5 flex flex-col gap-4 animate-fade-up"
                style={{ animationDelay: `${idx * 40}ms` }}
                interactive
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">
                      {formatDate(shift.createdAt)}
                    </p>
                    <span className={cn(
                      'text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded inline-block',
                      getStatusColor(shift.status)
                    )}>
                      {shift.status}
                    </span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg bg-surface-2/50">
                    <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Tickets</p>
                    <p className="text-lg font-bold text-ink">
                      {shift._count.tickets}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-2/50">
                    <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Accuracy</p>
                    <p className="text-lg font-bold text-ok">
                      {shift.avgAccuracy}%
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-sm text-ink-2">
                    Shift {shift.shiftNumber} • {shift._count.tickets} tickets to triage
                  </p>
                </div>

                {/* Action */}
                {shift.status === 'ACTIVE' ? (
                  <Link
                    href={`/labs/tickets/queue/${shift.id}`}
                    className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-accent-fill text-white py-2.5 font-semibold hover:bg-ok-wash transition text-sm"
                  >
                    Start Shift
                    <Icon name="arrowRight" size={14} />
                  </Link>
                ) : (
                  <Link
                    href={`/labs/tickets/leaderboard/${shift.id}`}
                    className="mt-auto flex items-center justify-center gap-2 rounded-lg border border-edge text-white py-2.5 font-semibold hover:border-edge-strong transition text-sm"
                  >
                    View Results
                    <Icon name="arrowRight" size={14} />
                  </Link>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
