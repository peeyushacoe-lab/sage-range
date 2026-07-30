import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getOrCreateAppUser } from '@/lib/current-user';
import { getTicketLeaderboard } from '@/lib/tickets';
import { Navbar } from '@/components/navbar';
import { PageHeader, Card } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  accuracy: number;
  speed: number;
  slaViolations: number;
  isCurrentUser?: boolean;
}

async function getShiftLeaderboard(shiftId: string): Promise<LeaderboardEntry[]> {
  // TicketQueueLeaderboard is the materialised source of truth — ranks and
  // penalty counters are maintained by src/lib/tickets.ts, not recomputed here.
  const entries = await getTicketLeaderboard(shiftId, 100);

  return entries.map((entry) => ({
    userId: entry.userId,
    username: entry.displayName,
    score: entry.score,
    accuracy: Math.round(entry.accuracy),
    speed: Math.round(entry.speed * 10) / 10,
    slaViolations: entry.slaViolations,
  }));
}

export default async function ShiftLeaderboard({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect('/sign-in');

  const shift = await db.socShift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    return (
      <main className="min-h-screen bg-surface-0 text-white">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-ink-2">Shift not found</p>
        </div>
      </main>
    );
  }

  const leaderboard = await getShiftLeaderboard(shiftId);
  const userEntry = leaderboard.find((e) => e.userId === user.id);
  const userRank = leaderboard.findIndex((e) => e.userId === user.id) + 1;

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-6"
          title={`Shift Leaderboard`}
          subtitle={`Top performers on ${new Date(shift.createdAt).toLocaleDateString(
            'en-US',
            { weekday: 'short', month: 'short', day: 'numeric' }
          )}`}
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
              <div className="text-right">
                <p className="text-2xl font-bold text-ok">{userEntry.score}</p>
                <p className="text-xs text-ink-3 mt-1">{userEntry.accuracy}% accuracy</p>
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
                    Accuracy
                  </th>
                  <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-ink-3 font-semibold">
                    Speed (tickets/min)
                  </th>
                  <th className="px-5 py-3 text-right text-xs uppercase tracking-widest text-ink-3 font-semibold">
                    SLA Violations
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
                        {entry.score}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        <span className={cn(
                          'font-semibold',
                          entry.accuracy >= 80 ? 'text-ok' : entry.accuracy >= 60 ? 'text-warn' : 'text-danger'
                        )}>
                          {entry.accuracy}%
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-ink-2">
                        {entry.speed.toFixed(1)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={cn(
                          'font-mono font-semibold',
                          entry.slaViolations === 0 ? 'text-ok' : 'text-danger'
                        )}>
                          {entry.slaViolations}
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
        <div className="mt-8 flex gap-3">
          <Link
            href="/labs/tickets"
            className="px-4 py-2 rounded-lg border border-edge text-white font-semibold hover:border-edge-strong transition"
          >
            Back to Shifts
          </Link>
          <Link
            href="/labs/tickets/leaderboard/weekly"
            className="px-4 py-2 rounded-lg bg-accent-fill text-white font-semibold hover:bg-ok-wash transition"
          >
            Weekly Leaderboard →
          </Link>
        </div>
      </div>
    </main>
  );
}
