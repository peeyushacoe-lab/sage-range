'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface ShiftProgressProps {
  startTime: number;
  totalTickets: number;
  completedTickets: number;
  currentAccuracy: number;
  slaViolations: number;
  currentScore: number;
  shiftDeadline: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
}

export function ShiftProgress({
  startTime,
  totalTickets,
  completedTickets,
  currentAccuracy,
  slaViolations,
  currentScore,
  shiftDeadline,
  status,
}: ShiftProgressProps) {
  const [elapsed, setElapsed] = useState('00:00');
  const [deadline, setDeadline] = useState('00:00');

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTime;
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = Math.floor((elapsedMs % 60000) / 1000);
      setElapsed(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

      const remainingMs = Math.max(0, shiftDeadline - now);
      const remainingMinutes = Math.floor(remainingMs / 60000);
      const remainingSeconds = Math.floor((remainingMs % 60000) / 1000);
      setDeadline(`${String(remainingMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, shiftDeadline]);

  const progressPercent = totalTickets > 0 ? (completedTickets / totalTickets) * 100 : 0;
  const isLowDeadline = parseInt(deadline.split(':')[0]) < 1;
  const isDeadlineExpired = parseInt(deadline) === 0;

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Shift Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div>
          <span className={cn(
            'text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded',
            status === 'COMPLETED'
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-blue-500/20 text-blue-400'
          )}>
            {status === 'COMPLETED' ? 'Shift Complete' : 'In Progress'}
          </span>
        </div>

        {/* Timer */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5">Elapsed Time</p>
          <p className="text-2xl font-mono font-bold text-zinc-100">{elapsed}</p>
        </div>

        {/* Deadline */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5">Shift Deadline</p>
          <p className={cn(
            'text-2xl font-mono font-bold',
            isDeadlineExpired ? 'text-red-500' : isLowDeadline ? 'text-amber-400' : 'text-zinc-100'
          )}>
            {deadline}
          </p>
          {isLowDeadline && <p className="text-xs text-amber-400 mt-1">Less than 1 hour remaining</p>}
          {isDeadlineExpired && <p className="text-xs text-red-400 mt-1">Shift deadline passed</p>}
        </div>

        {/* Queue Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Queue Progress</p>
            <p className="text-sm font-mono text-zinc-400">{completedTickets} / {totalTickets}</p>
          </div>
          <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-sage-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Current Accuracy */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5">Accuracy</p>
          <p className="text-2xl font-mono font-bold text-zinc-100">{Math.round(currentAccuracy)}%</p>
        </div>

        {/* Current Score */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1.5">Current Score</p>
          <p className="text-2xl font-mono font-bold text-sage-400">{currentScore}</p>
        </div>

        {/* SLA Violations */}
        <div className={cn(
          'p-3 rounded-lg',
          slaViolations > 0
            ? 'bg-red-500/10 border border-red-500/30'
            : 'bg-zinc-800/50 border border-zinc-700/50'
        )}>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">SLA Violations</p>
          <p className={cn(
            'text-xl font-mono font-bold',
            slaViolations > 0 ? 'text-red-400' : 'text-emerald-400'
          )}>
            {slaViolations}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
