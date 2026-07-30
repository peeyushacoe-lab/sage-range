"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, Badge } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

interface HuntSession {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "ABANDONED";
  artifacts: Array<{
    matched: boolean;
  }>;
  score: number;
  accuracy: number;
  elapsedSeconds: number;
  dataset: {
    expectedArtifacts: string[];
  };
}

const STATUS_TONE: Record<string, "emerald" | "blue" | "amber" | "red"> = {
  ACTIVE: "emerald",
  COMPLETED: "blue",
  ABANDONED: "red",
};

export function HuntProgress({ session: initialSession }: { session: HuntSession }) {
  const [session, setSession] = useState(initialSession);
  const [elapsedTime, setElapsedTime] = useState(initialSession.elapsedSeconds);

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Refresh session data periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/hunts/${initialSession.id}`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setSession(data);
        }
      } catch {
        // Silently fail
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [initialSession.id]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const matchedCount = session.artifacts.filter((a) => a.matched).length;
  const expectedCount = session.dataset.expectedArtifacts.length;
  const speedScore = Math.max(0, 100 - Math.floor(elapsedTime / 6));

  return (
    <div className="space-y-4 p-4">
      {/* Session Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Session</h3>
            <Badge tone={STATUS_TONE[session.status]}>
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Timer */}
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Elapsed time</p>
            <p className="font-mono text-xl font-bold text-emerald-400">
              {formatTime(elapsedTime)}
            </p>
          </div>

          {/* Current Score */}
          <div className="border-t border-white/8 pt-3 space-y-1">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Current score</p>
            <p className="text-2xl font-bold text-white">{session.score}</p>
          </div>

          {/* Accuracy */}
          <div className="border-t border-white/8 pt-3 space-y-2">
            <div className="flex justify-between items-center">
              <p className="text-xs uppercase tracking-widest text-zinc-500">Accuracy</p>
              <p className="text-sm font-bold text-white">{Math.round(session.accuracy)}%</p>
            </div>
            <div className="w-full bg-zinc-900/50 rounded h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${session.accuracy}%` }}
              />
            </div>
          </div>

          {/* Speed Bonus */}
          <div className="border-t border-white/8 pt-3 space-y-1">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Speed bonus</p>
            <p className="text-sm text-amber-400">+{speedScore} points</p>
          </div>
        </CardContent>
      </Card>

      {/* Artifacts Progress */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2">
            <Icon name="target" size={16} />
            Progress
          </h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{matchedCount}</span>
            <span className="text-sm text-zinc-400">of {expectedCount} artifacts found</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-zinc-900/50 rounded h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
              style={{
                width: expectedCount > 0 ? `${(matchedCount / expectedCount) * 100}%` : "0%",
              }}
            />
          </div>

          {/* Breakdown */}
          <div className="space-y-2 border-t border-white/8 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Found</span>
              <span className="text-emerald-400 font-semibold">{matchedCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Remaining</span>
              <span className="text-amber-400 font-semibold">{expectedCount - matchedCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Link */}
      <a
        href={`/labs/hunts/${session.id}/leaderboard`}
        className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:border-white/20 transition text-sm font-semibold text-center flex items-center justify-center gap-2"
      >
        <Icon name="trophy" size={16} />
        View Leaderboard
      </a>
    </div>
  );
}
