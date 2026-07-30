'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface QueueTicket {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  createdAt: number;
  slaMinutes: number;
  position: number;
  isOverSLA?: boolean;
}

interface TicketQueueListProps {
  tickets: QueueTicket[];
  selectedId?: string;
  onSelect?: (ticketId: string) => void;
  isLoading?: boolean;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  MEDIUM: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  LOW: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

export function TicketQueueList({
  tickets,
  selectedId,
  onSelect,
  isLoading = false,
}: TicketQueueListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-zinc-800 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (tickets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ticket Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500 text-center py-8">
            No tickets in queue
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Queue ({tickets.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-y-auto max-h-96">
          {tickets.map((ticket) => {
            const colors = SEVERITY_COLORS[ticket.severity];
            const isSelected = selectedId === ticket.id;
            const slaDeadline = new Date(ticket.createdAt + ticket.slaMinutes * 60000);
            const isOverSLA = ticket.isOverSLA ?? new Date() > slaDeadline;

            return (
              <button
                key={ticket.id}
                onClick={() => onSelect?.(ticket.id)}
                className={cn(
                  'w-full px-5 py-3.5 border-t border-white/5 text-left hover:bg-zinc-900/50 transition-colors',
                  isSelected && 'bg-sage-500/10 border-l-2 border-l-sage-500'
                )}
              >
                <div className="flex items-center gap-3">
                  {/* Position Circle */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-mono text-xs font-bold',
                    isSelected ? 'bg-sage-500 text-black' : 'bg-zinc-800 text-zinc-400'
                  )}>
                    {ticket.position}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        'text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded',
                        colors.bg,
                        colors.text
                      )}>
                        {ticket.severity}
                      </span>
                      {isOverSLA && (
                        <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-red-500/20 text-red-400">
                          OVER SLA
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-white truncate">
                      {ticket.title}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {ticket.category}
                    </p>
                  </div>

                  {/* Chevron */}
                  <Icon
                    name="chevronRight"
                    size={16}
                    className="text-zinc-600 flex-shrink-0"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
