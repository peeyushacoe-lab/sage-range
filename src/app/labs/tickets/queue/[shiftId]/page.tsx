import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getOrCreateAppUser } from '@/lib/current-user';
import { Navbar } from '@/components/navbar';
import { Icon } from '@/components/ui/icon';
import { QueueClient } from './_client';

export const dynamic = 'force-dynamic';

export default async function QueuePage({
  params,
}: {
  params: Promise<{ shiftId: string }>;
}) {
  const { shiftId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect('/sign-in');

  // Verify shift exists
  const shift = await db.socShift.findUnique({
    where: { id: shiftId },
  });

  if (!shift) {
    return (
      <main className="min-h-screen bg-surface-0 text-white">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="text-ink-2">Shift not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-0 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Shift Queue</h1>
          <p className="text-ink-2">
            Triage incoming alerts: CLOSED, ESCALATED, RESOLVED, IGNORED, or MONITOR
          </p>
        </div>

        {/* Client Component handles all interactivity */}
        <QueueClient shiftId={shiftId} />
      </div>
    </main>
  );
}
