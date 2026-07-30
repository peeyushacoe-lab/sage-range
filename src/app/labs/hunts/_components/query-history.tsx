"use client";

import { Card, CardHeader, CardContent } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

interface HistoryItem {
  query: string;
  time: Date;
}

export function QueryHistory({
  history,
  onSelectQuery,
}: {
  history: HistoryItem[];
  onSelectQuery: (query: string) => void;
}) {
  const formatTime = (date: Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  };

  return (
    <Card className="border-0 h-full rounded-none flex flex-col">
      <CardHeader>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Icon name="bell" size={16} />
          History
        </h3>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-1">
        {history.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelectQuery(item.query)}
            className="w-full text-left px-2 py-2 rounded text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition truncate group"
            title={item.query}
          >
            <div className="truncate font-mono text-zinc-300 group-hover:text-emerald-400">
              {item.query}
            </div>
            <div className="text-zinc-600 text-xs">
              {formatTime(item.time)}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
