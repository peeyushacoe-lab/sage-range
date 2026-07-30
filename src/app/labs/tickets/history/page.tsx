import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getOrCreateAppUser } from '@/lib/current-user';
import { Navbar } from '@/components/navbar';
import { PageHeader, Card, EmptyState } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const STATUSES = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'GRADED', label: 'Graded' },
] as const;

type StatusFilter = 'ALL' | 'PENDING' | 'GRADED';

export default async function TicketHistory({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status: statusParam, page: pageParam } = await searchParams;
  const statusFilter: StatusFilter = STATUSES.find((s) => s.key === statusParam)?.key ?? 'ALL';
  const page = Math.max(1, parseInt(pageParam || '1'));
  const limit = 20;
  const offset = (page - 1) * limit;

  const user = await getOrCreateAppUser();
  if (!user) redirect('/sign-in');

  // ShiftTicketTriage has no userId — ownership flows through the attempt.
  // "Graded" means an admin has set isCorrect; it is null until then.
  const where = {
    attempt: { userId: user.id },
    ...(statusFilter === 'PENDING' && { isCorrect: null }),
    ...(statusFilter === 'GRADED' && { isCorrect: { not: null } }),
  };

  const [rows, totalCount] = await Promise.all([
    db.shiftTicketTriage.findMany({
      where,
      include: {
        ticket: {
          select: { id: true, title: true, category: true, shiftId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.shiftTicketTriage.count({ where }),
  ]);

  const triages = rows.map((row) => ({
    ...row,
    action: row.userAction,
    score: row.pointsAward,
    gradedAt: row.isCorrect !== null,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  const getStatusBadge = (action: string) => {
    const colors: Record<string, string> = {
      CLOSED: 'bg-ok-wash text-ok',
      ESCALATED: 'bg-sev-high-wash text-sev-high',
      RESOLVED: 'bg-info-wash text-info',
      IGNORED: 'bg-gray-500/20 text-gray-400',
      MONITOR: 'bg-warn-wash text-warn',
    };
    return colors[action] || 'bg-surface-3 text-ink-2';
  };

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Your Triage History"
          subtitle="Review past decisions and performance feedback"
          actions={
            <Link
              href="/labs/tickets"
              className="shrink-0 rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-white hover:border-edge-strong transition"
            >
              Back to Shifts →
            </Link>
          }
        />

        {/* Filter */}
        <nav className="flex gap-2 mb-6 flex-wrap">
          {STATUSES.map((s) => (
            <Link
              key={s.key}
              href={`/labs/tickets/history${s.key !== 'ALL' ? `?status=${s.key}` : ''}`}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium transition',
                (statusParam === s.key || (!statusParam && s.key === 'ALL'))
                  ? 'bg-accent-fill text-white'
                  : 'border border-edge text-ink-2 hover:text-white hover:border-edge-strong'
              )}
            >
              {s.label}
            </Link>
          ))}
        </nav>

        {triages.length === 0 ? (
          <EmptyState
            icon="layers"
            title="No triages yet"
            description="Start a shift to begin triaging alerts and see your history here."
            action={{ label: 'Start Shift', href: '/labs/tickets' }}
          />
        ) : (
          <>
            {/* History Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-edge">
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-ink-3 font-semibold">
                        Ticket
                      </th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-ink-3 font-semibold">
                        Category
                      </th>
                      <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-ink-3 font-semibold">
                        Your Action
                      </th>
                      <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-ink-3 font-semibold">
                        Confidence
                      </th>
                      <th className="px-5 py-3 text-center text-xs uppercase tracking-widest text-ink-3 font-semibold">
                        Result
                      </th>
                      <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-ink-3 font-semibold">
                        Points
                      </th>
                      <th className="px-5 py-3 text-center text-xs uppercase tracking-widest text-ink-3 font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {triages.map((triage) => (
                      <tr
                        key={triage.id}
                        className="border-t border-edge-subtle hover:bg-surface-1 transition"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/labs/tickets/leaderboard/${triage.ticket.shiftId}`}
                            className="font-medium text-ok hover:text-ok truncate max-w-xs"
                          >
                            {triage.ticket.title}
                          </Link>
                        </td>
                        <td className="px-5 py-4 text-ink-2 text-sm">
                          {triage.ticket.category}
                        </td>
                        <td className="px-5 py-4">
                          <span className={cn(
                            'text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded',
                            getStatusBadge(triage.action)
                          )}>
                            {triage.action}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="text-sm font-mono text-ink-2">
                            {triage.confidence}%
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {triage.isCorrect !== null && (
                            <span className={triage.isCorrect ? 'text-ok font-bold text-lg' : 'text-danger font-bold text-lg'}>
                              {triage.isCorrect ? '✓' : '✗'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-ok font-mono">
                          {triage.score || '-'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={cn(
                            'text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded',
                            triage.gradedAt
                              ? 'bg-ok-wash text-ok'
                              : 'bg-warn-wash text-warn'
                          )}>
                            {triage.gradedAt ? 'Graded' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-ink-3">
                  Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount}
                </p>

                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`/labs/tickets/history?status=${statusParam || ''}&page=${page - 1}`}
                      className="px-3 py-2 rounded-lg border border-edge text-white hover:border-edge-strong transition text-sm"
                    >
                      Previous
                    </Link>
                  )}

                  {[...Array(totalPages)].map((_, i) => {
                    const p = i + 1;
                    const params = new URLSearchParams();
                    if (statusFilter !== 'ALL') params.set('status', statusFilter);
                    params.set('page', String(p));

                    return (
                      <Link
                        key={p}
                        href={`/labs/tickets/history?${params.toString()}`}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm transition',
                          p === page
                            ? 'bg-accent-fill text-white'
                            : 'border border-edge text-white hover:border-edge-strong'
                        )}
                      >
                        {p}
                      </Link>
                    );
                  })}

                  {page < totalPages && (
                    <Link
                      href={`/labs/tickets/history?status=${statusParam || ''}&page=${page + 1}`}
                      className="px-3 py-2 rounded-lg border border-edge text-white hover:border-edge-strong transition text-sm"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
