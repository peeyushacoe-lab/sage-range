'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rawAlert?: Record<string, unknown>;
  createdAt: number;
  slaMinutes: number;
}

interface TicketDetailProps {
  ticket: Ticket | null;
  isLoading?: boolean;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', icon: 'alert-circle' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'alert-triangle' },
  MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: 'info' },
  LOW: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'circle-check' },
};

export function TicketDetail({ ticket, isLoading = false }: TicketDetailProps) {
  const [showRawAlert, setShowRawAlert] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-8 bg-zinc-800 rounded w-3/4" />
            <div className="h-24 bg-zinc-800 rounded" />
            <div className="h-12 bg-zinc-800 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 text-center py-8">
            Select a ticket from the queue to view details
          </p>
        </CardContent>
      </Card>
    );
  }

  const severity = SEVERITY_COLORS[ticket.severity];
  const slaDeadline = new Date(ticket.createdAt + ticket.slaMinutes * 60000);
  const now = new Date();
  const isOverSLA = now > slaDeadline;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Detail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Severity Badge */}
        <div className={cn('p-3 rounded-lg border', severity.bg)}>
          <div className="flex items-center gap-2 mb-2">
            <Icon name={severity.icon as any} size={16} className={severity.text} />
            <span className={cn('text-xs font-bold uppercase tracking-widest', severity.text)}>
              {ticket.severity}
            </span>
            {isOverSLA && (
              <span className="text-xs font-bold uppercase tracking-widest text-red-400 ml-auto">
                OVER SLA
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Title</p>
          <h3 className="text-lg font-semibold text-white leading-snug">{ticket.title}</h3>
        </div>

        {/* Category */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">Category</p>
          <p className="text-sm font-mono text-zinc-300">{ticket.category}</p>
        </div>

        {/* SLA */}
        <div className={cn(
          'p-3 rounded-lg',
          isOverSLA ? 'bg-red-500/10 border border-red-500/30' : 'bg-zinc-800/50 border border-zinc-700/50'
        )}>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-1">SLA Deadline</p>
          <p className={cn(
            'text-sm font-mono font-semibold',
            isOverSLA ? 'text-red-400' : 'text-zinc-300'
          )}>
            {slaDeadline.toLocaleString()}
          </p>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Description</p>
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {/* Raw Alert Preview */}
        {ticket.rawAlert && (
          <div>
            <button
              onClick={() => setShowRawAlert(!showRawAlert)}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-400 transition mb-2"
            >
              <Icon name={showRawAlert ? 'chevronDown' : 'chevronRight'} size={14} />
              Raw Alert (JSON)
            </button>

            {showRawAlert && (
              <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 overflow-x-auto">
                <pre className="text-xs text-zinc-400 font-mono">
                  {JSON.stringify(ticket.rawAlert, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
