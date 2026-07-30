import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getOrCreateAppUser } from '@/lib/current-user';
import { getWeeklyTicketLeaderboard } from '@/lib/tickets';
import { Navbar } from '@/components/navbar';
import { PageHeader, Card } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface WeeklyLeaderboardEntry {
  userId: string;
  username: string;
  shiftsCompleted: number;
  totalScore: number;
  overallAccuracy: number;
  isCurrentUser?: boolean;
}

async function getWeeklyLeaderboard(): Promise<WeeklyLeaderboardEntry[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // WEEKLY-scope rows are written by aggregateWeeklyTicketLeaderboardJob().
  const entries = await getWeeklyTicketLeaderboard();

  // Shift participation still comes from the per-shift rows in the same window.
  const shiftCounts = await db.ticketQueueLeaderboard.groupBy({
    by: ['userId'],
    where: {
      scope: 'ALL_TIME',
      completedAt: { gte: sevenDaysAgo },
    },
    _count: { shiftId: true },
  });
  const shiftsByUser = new Map(shiftCounts.map((r) => [r.userId, r._count.shiftId]));

  return entries.map((entry) => ({
    userId: entry.userId,
    username: entry.displayName,
    shiftsCompleted: shiftsByUser.get(entry.userId) ?? 0,
    totalScore: entry.score,
    overallAccuracy: Math.round(entry.accuracy),
  }));
}

export default async function WeeklyLeaderboard() {
  const user = await getOrCreateAppUser();
  if (!user) redirect('/sign-in');

  const leaderboard = await getWeeklyLeaderboard();
  const userEntry = leaderboard.find((e) => e.userId === user.id);
  const userRank = leaderboard.findIndex((e) => e.userId === user.id) + 1;

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Weekly Leaderboard"
          subtitle="Top performers across all shifts in the past 7 days"
          actions={
            <Link
              href="/labs/tickets"
              className="shrink-0 rounded-lg border border-edge px-4 py-2 text-sm text-ink-2 hover:text-white hover:border-edge-strong transition"
            >
              Back to Shifts →
            </Link>
          }
        />

        {/* User's Position */}
        {userEntry && (
          <Card className="mb-6 p-4 bg-ok-wash border-ok-edge">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-ink-3 mb-1">Your Position</p>
                <p className="text-lg font-bold text-white">
                  Rank <span className="text-ok">#{userRank}</span>
                </p>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="text-xs uppercase tracking-widest text-ink-3">Score</p>
                  <p className="text-2xl font-bold text-ok">{userEntry.totalScore}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-ink-3">Shifts</p>
                  <p className="text-lg font-bold text-ink-2">{userEntry.shiftsCompleted}</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-edge">
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-ink-3 font-semibold">
                    Rank
                  </th>
                  <th className="px-5 py-3 text-left text-xs uppercase tracking-widest text-ink-3 font-semibold">
                    Player
                  </th>
                  <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-ink-3 font-semibold">
                    Score
                  </th>
                  <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-ink-3 font-semibold">
                    Shifts Completed
                  </th>
                  <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-ink-3 font-semibold">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isUser = entry.userId === user.id;

                  return (
                    <tr
                      key={entry.userId}
                      className={cn(
                        'border-t border-edge-subtle hover:bg-surface-1 transition',
                        isUser && 'bg-ok-wash'
                      )}
                    >
                      <td className="px-5 py-4">
                        <span className={cn(
                          'font-bold font-mono',
                          rank === 1 ? 'text-warn' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-warn' : 'text-ink-2'
                        )}>
                          #{rank}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-medium">
                          {entry.username}
                          {isUser && <span className="text-xs text-ink-3 ml-2">(you)</span>}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-ok font-mono">
                        {entry.totalScore}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-ink-2">
                        {entry.shiftsCompleted}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        <span className={cn(
                          'font-semibold',
                          entry.overallAccuracy >= 80
                            ? 'text-ok'
                            : entry.overallAccuracy >= 60
                              ? 'text-warn'
                              : 'text-danger'
                        )}>
                          {entry.overallAccuracy}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Actions */}
        <div className="mt-8">
          <Link
            href="/labs/tickets"
            className="px-4 py-2 rounded-lg border border-edge text-white font-semibold hover:border-edge-strong transition"
          >
            Back to Shifts
          </Link>
        </div>
      </div>
    </main>
  );
}
