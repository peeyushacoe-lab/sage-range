import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getOrCreateAppUser } from '@/lib/current-user';
import { Navbar } from '@/components/navbar';
import { PageHeader, Card } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface GradingEntry {
  triageId: string;
  userId: string;
  username: string;
  ticketTitle: string;
  ticketCategory: string;
  action: string;
  confidence: number;
  isCorrect: boolean | null;
  score: number | null;
  feedback: string | null;
}

export default async function AdminGradingPage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const user = await getOrCreateAppUser();

  // Admin check
  if (!user || user.role !== 'ADMIN') {
    redirect('/sign-in');
  }

  const shift = await db.socShift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <Navbar />
        <div className="max-w-5xl mx-auto px-6 py-8">
          <p className="text-zinc-400">Shift not found</p>
        </div>
      </main>
    );
  }

  // Ungraded triages for this shift. Submitter identity comes via the attempt.
  const [triages, alreadyGraded] = await Promise.all([
    db.shiftTicketTriage.findMany({
      where: { ticket: { shiftId }, isCorrect: null },
      include: {
        ticket: { select: { title: true, category: true } },
        attempt: { select: { userId: true, user: { select: { email: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.shiftTicketTriage.count({
      where: { ticket: { shiftId }, isCorrect: { not: null } },
    }),
  ]);

  const gradingEntries: GradingEntry[] = triages.map((t) => ({
    triageId: t.id,
    userId: t.attempt.userId,
    username: t.attempt.user.email?.split('@')[0] || 'Unknown',
    ticketTitle: t.ticket.title,
    ticketCategory: t.ticket.category,
    action: t.userAction,
    confidence: t.confidence,
    isCorrect: t.isCorrect,
    score: t.pointsAward,
    feedback: t.resolution,
  }));

  const totalPending = gradingEntries.length;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <PageHeader
          className="mb-6"
          title="Admin Grading"
          subtitle={`Grade triage submissions for ${new Date(shift.createdAt).toLocaleDateString()}`}
          actions={
            <Link
              href="/labs/tickets"
              className="shrink-0 rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:border-white/30 transition"
            >
              Back →
            </Link>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Pending</p>
            <p className="text-2xl font-bold text-amber-400">{totalPending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Graded</p>
            <p className="text-2xl font-bold text-emerald-400">{alreadyGraded}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Total Triages</p>
            <p className="text-2xl font-bold text-zinc-300">{totalPending + alreadyGraded}</p>
          </Card>
        </div>

        {/* Grading Form */}
        {gradingEntries.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon name="checkCircle" size={32} className="text-emerald-400 mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">All triages graded!</p>
            <p className="text-zinc-400">There are no pending triages for this shift.</p>
          </Card>
        ) : (
          <form>
            <div className="space-y-4">
              {gradingEntries.map((entry, idx) => (
                <Card key={entry.triageId} className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between pb-4 border-b border-white/5">
                    <div>
                      <p className="text-sm font-mono text-zinc-500">
                        Entry {idx + 1} of {gradingEntries.length}
                      </p>
                      <h3 className="text-base font-semibold mt-1">{entry.ticketTitle}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-zinc-500">User</p>
                      <p className="text-sm font-mono text-zinc-300">{entry.username}</p>
                    </div>
                  </div>

                  {/* User Decision */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Category</p>
                      <p className="text-sm font-mono text-zinc-300">{entry.ticketCategory}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Action Taken</p>
                      <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded bg-blue-500/20 text-blue-400">
                        {entry.action}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Confidence</p>
                      <p className="text-sm font-mono text-zinc-300">{entry.confidence}%</p>
                    </div>
                  </div>

                  {/* Grading Fields */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                    {/* Is Correct? */}
                    <div>
                      <label className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">
                        Correct?
                      </label>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-${entry.triageId}`}
                            value="true"
                            defaultChecked={entry.isCorrect === true}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-emerald-400">Correct</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-${entry.triageId}`}
                            value="false"
                            defaultChecked={entry.isCorrect === false}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-red-400">Incorrect</span>
                        </label>
                      </div>
                    </div>

                    {/* Points */}
                    <div>
                      <label htmlFor={`points-${entry.triageId}`} className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">
                        Points (0-500)
                      </label>
                      <input
                        type="range"
                        id={`points-${entry.triageId}`}
                        name={`points-${entry.triageId}`}
                        min="0"
                        max="500"
                        defaultValue={entry.score || 250}
                        className="w-full"
                      />
                      <p className="text-xs text-zinc-600 mt-1">
                        Points: <span className="font-mono">{entry.score || 250}</span>
                      </p>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div>
                    <label htmlFor={`feedback-${entry.triageId}`} className="text-xs uppercase tracking-widest text-zinc-500 block mb-2">
                      Feedback (Optional)
                    </label>
                    <textarea
                      id={`feedback-${entry.triageId}`}
                      name={`feedback-${entry.triageId}`}
                      defaultValue={entry.feedback || ''}
                      placeholder="Provide constructive feedback..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white/30"
                      rows={2}
                    />
                  </div>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  document.querySelectorAll('input[type="radio"][value="true"]').forEach((el) => {
                    (el as HTMLInputElement).checked = true;
                  });
                }}
                className="px-4 py-2 rounded-lg border border-white/10 text-white font-semibold hover:border-white/30 transition text-sm"
              >
                Mark All Correct
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-600 transition text-sm ml-auto"
              >
                Save Grades
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
