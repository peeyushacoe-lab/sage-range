"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, Badge, Button } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

interface Dataset {
  id: string;
  name: string;
  description: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  category: "Sysmon" | "Apache" | "Network" | "Windows" | "Linux" | "Cloud";
  logCount: number;
  expectedArtifacts: number;
}

const DIFFICULTY_TONE: Record<string, "emerald" | "amber" | "red"> = {
  EASY: "emerald",
  MEDIUM: "amber",
  HARD: "red",
};

const CATEGORY_ICONS: Record<string, string> = {
  Sysmon: "investigate",
  Apache: "doc",
  Network: "networkMap",
  Windows: "settings",
  Linux: "labs",
  Cloud: "cloud",
};

export function HuntCard({ hunt }: { hunt: Dataset }) {
  const [isPending, startTransition] = useTransition();

  const handleStartHunt = () => {
    startTransition(async () => {
      const res = await fetch("/api/hunts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ datasetId: hunt.id }),
      });

      if (res.ok) {
        const { sessionId } = await res.json();
        window.location.href = `/labs/hunts/${sessionId}`;
      }
    });
  };

  return (
    <Card className="flex flex-col overflow-hidden hover:border-edge-strong transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{hunt.name}</h3>
          </div>
          <Badge tone={DIFFICULTY_TONE[hunt.difficulty]}>{hunt.difficulty}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Icon name={CATEGORY_ICONS[hunt.category] as any} size={16} className="text-ink-3" />
          <span className="text-xs text-ink-2">{hunt.category}</span>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 pb-4">
        <p className="text-sm text-ink-2 line-clamp-2">{hunt.description}</p>

        <div className="space-y-2 text-xs text-ink-2">
          <div className="flex justify-between">
            <span>Log entries:</span>
            <span className="text-white font-semibold">{hunt.logCount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Expected artifacts:</span>
            <span className="text-white font-semibold">{hunt.expectedArtifacts}</span>
          </div>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleStartHunt}
          disabled={isPending}
          className="mt-auto"
        >
          {isPending ? "Starting..." : "Start Hunt"}
        </Button>
      </CardContent>
    </Card>
  );
}
