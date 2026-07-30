'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShiftProgress } from '../../_components/shift-progress';
import { TicketQueueList } from '../../_components/ticket-queue-list';
import { TicketDetail } from '../../_components/ticket-detail';
import { TriageForm } from '../../_components/triage-form';
import { Icon } from '@/components/ui/icon';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

interface QueueTicket {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  createdAt: number;
  slaMinutes: number;
}

interface QueueResponse {
  queue: QueueTicket[];
  shiftId: string;
  startTime: number;
  deadline: number;
  totalTickets: number;
  completedTickets: number;
  currentAccuracy: number;
  slaViolations: number;
  currentScore: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

interface Ticket extends QueueTicket {
  description: string;
  rawAlert?: Record<string, unknown>;
  isOverSLA?: boolean;
}

export function QueueClient({ shiftId }: { shiftId: string }) {
  const [data, setData] = useState<QueueResponse | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Fetch queue on mount
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch(`/api/tickets/queue/${shiftId}`);
        if (!res.ok) throw new Error('Failed to load queue');
        const json = await res.json();
        setData(json);
        if (json.queue.length > 0) {
          setSelectedTicket(null);
        }
      } catch (error) {
        setToast({ type: 'error', message: 'Failed to load queue' });
      } finally {
        setIsLoadingQueue(false);
      }
    };

    fetchQueue();
  }, [shiftId]);

  // Fetch full ticket details when selected
  const handleSelectTicket = async (ticketId: string) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetch(`/api/tickets/${ticketId}`);
      if (!res.ok) throw new Error('Failed to load ticket');
      const ticket = await res.json();
      setSelectedTicket(ticket);
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to load ticket details' });
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Refresh progress after triage
  const handleTriageSuccess = async () => {
    try {
      const res = await fetch(`/api/tickets/queue/${shiftId}/progress`);
      if (!res.ok) throw new Error('Failed to load progress');
      const progress = await res.json();

      setData((prev) => (prev ? { ...prev, ...progress } : null));
      setSelectedTicket(null);
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to refresh progress' });
    }
  };

  if (isLoadingQueue) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-zinc-800 rounded w-1/4" />
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 h-96 bg-zinc-800 rounded" />
          <div className="h-96 bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <p className="text-zinc-400">Failed to load shift data</p>;
  }

  const positionedQueue = data.queue.map((t, idx) => ({
    ...t,
    position: idx + 1,
    isOverSLA: new Date() > new Date(t.createdAt + t.slaMinutes * 60000),
  }));

  return (
    <>
      {/* Main Grid: Queue + Detail + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List (70% on desktop) */}
        <div className="lg:col-span-2">
          <TicketQueueList
            tickets={positionedQueue}
            selectedId={selectedTicket?.id}
            onSelect={handleSelectTicket}
            isLoading={isLoadingQueue}
          />
        </div>

        {/* Right: Sidebar (30% on desktop) */}
        <div className="space-y-6">
          {/* Progress */}
          <ShiftProgress
            startTime={data.startTime}
            totalTickets={data.totalTickets}
            completedTickets={data.completedTickets}
            currentAccuracy={data.currentAccuracy}
            slaViolations={data.slaViolations}
            currentScore={data.currentScore}
            shiftDeadline={data.deadline}
            status={data.status}
          />
        </div>
      </div>

      {/* Bottom: Detail + Triage Form (stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Detail (70% on desktop) */}
        <div className="lg:col-span-2">
          <TicketDetail ticket={selectedTicket} isLoading={isLoadingDetail} />
        </div>

        {/* Triage Form (30% on desktop) */}
        <div>
          {selectedTicket && (
            <TriageForm
              ticketId={selectedTicket.id}
              shiftId={shiftId}
              onSuccess={handleTriageSuccess}
              onSubmit={handleTriageSuccess}
            />
          )}
        </div>
      </div>

      {/* Shift Completed Banner */}
      {data.status === 'COMPLETED' && (
        <div className="mt-8 p-6 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <div className="flex items-center gap-3 mb-2">
            <Icon name="checkCircle" size={20} className="text-emerald-400" />
            <h3 className="text-lg font-semibold">Shift Complete!</h3>
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            Final Score: <span className="font-bold text-emerald-400">{data.currentScore}</span> •
            Accuracy: <span className="font-bold text-emerald-400">{Math.round(data.currentAccuracy)}%</span>
          </p>
          <div className="flex gap-2">
            <Link
              href={`/labs/tickets/leaderboard/${shiftId}`}
              className="px-4 py-2 rounded-lg bg-sage-500 text-black font-semibold hover:bg-sage-600 transition text-sm"
            >
              View Leaderboard
            </Link>
            <Link
              href="/labs/tickets"
              className="px-4 py-2 rounded-lg border border-white/10 text-white font-semibold hover:border-white/30 transition text-sm"
            >
              Back to Shifts
            </Link>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg text-sm font-medium max-w-sm ${
          toast.type === 'success'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {toast.message}
        </div>
      )}
    </>
  );
}
