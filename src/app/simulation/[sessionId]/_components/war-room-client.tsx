"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { WorldState, CompanyProfile, PublicAction, Executive } from "@/lib/simulation/types";
import { RightPanel } from "./right-panel";
import { EvidencePanel } from "./evidence-panel";
import { getEvidence } from "@/lib/simulation/runtime/evidence";

type EventRow = { id: string; type: string; actor: string; payload: unknown; narrative: string | null; createdAt: string };
type StageDefRow = { id: string; label: string; brief: string; threat: string; evidence: string[] } | null;
type SessionRow = { id: string; status: string; currentStage: string; score: number; startedAt: string; template: { slug: string; name: string; difficulty: string }; companyData: CompanyProfile; personaId?: string | null };
type EmpStateData = { stressLevel: number; morale: number; confidenceInSOC: number; securityAwareness: number; insiderRisk: number };
type OrgHealth = { panicIndex: number; trustInSOC: number; operationalStability: number; communicationIntegrity: number; insiderThreatRisk: number };

const ROLE_COLORS: Record<string, string> = {
  IR_LEAD:   "bg-sage-500/10 text-sage-400 border border-sage-500/30",
  FORENSICS: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  LEGAL:     "bg-purple-500/10 text-purple-400 border border-purple-500/30",
  COMMS:     "bg-amber-500/10 text-amber-400 border border-amber-500/30",
};

const ROLE_LABELS: Record<string, string> = {
  IR_LEAD: "IR Lead",
  FORENSICS: "Forensics",
  LEGAL: "Legal",
  COMMS: "Comms",
};

const ROLE_KW: Record<string, string[]> = {
  FORENSICS: ["forensic", "evidence", "preserve", "collect", "image", "analyze"],
  LEGAL:     ["notify", "disclose", "legal", "report", "document", "communicate"],
  COMMS:     ["notify", "communicate", "statement", "press", "employee"],
};

function actionMatchesRole(a: PublicAction, role: string) {
  if (role === "IR_LEAD") return true;
  const t = `${a.id} ${a.label}`.toLowerCase();
  return (ROLE_KW[role] ?? []).some((kw) => t.includes(kw));
}

type Props = {
  sessionId: string;
  initialData: { session: SessionRow; events: EventRow[]; worldState: WorldState; availableActions: PublicAction[]; stageDefinition: StageDefRow; employeeStates?: Record<string, EmpStateData>; organizationHealth?: OrgHealth; executives?: Executive[] };
  teamRole?: string;
  teamMembers?: Array<{ name: string; role: string }>;
  personaId?: string | null;
};

const THREAT_COLORS: Record<string, string> = {
  LOW: "text-sage-500 border-sage-500/40",
  MEDIUM: "text-amber-400 border-amber-500/40",
  HIGH: "text-orange-400 border-orange-500/40",
  CRITICAL: "text-red-400 border-red-500/40 animate-pulse",
};

const ACTOR_STYLES: Record<string, { label: string; color: string }> = {
  SYSTEM:        { label: "SYS",  color: "text-zinc-400 bg-zinc-800" },
  ATTACKER:      { label: "ATK",  color: "text-red-400 bg-red-900/30" },
  ADVERSARY:     { label: "ADV",  color: "text-red-400 bg-red-900/30" },
  ANALYST:       { label: "YOU",  color: "text-sage-500 bg-sage-500/10" },
  EXEC:          { label: "EXEC", color: "text-amber-400 bg-amber-900/30" },
  LEGAL:         { label: "LAW",  color: "text-purple-400 bg-purple-900/30" },
  HR:            { label: "HR",   color: "text-blue-400 bg-blue-900/30" },
  DEFENSE:       { label: "DEF",  color: "text-sage-400 bg-sage-900/30" },
  EMAIL_GATEWAY: { label: "EML",  color: "text-blue-400 bg-blue-900/20" },
  EDR:           { label: "EDR",  color: "text-cyan-400 bg-cyan-900/20" },
  SIEM:          { label: "SIEM", color: "text-purple-400 bg-purple-900/20" },
  FIREWALL:      { label: "FW",   color: "text-orange-400 bg-orange-900/20" },
  DLP:           { label: "DLP",  color: "text-pink-400 bg-pink-900/20" },
  IDENTITY_PROVIDER: { label: "IAM", color: "text-indigo-400 bg-indigo-900/20" },
};

const EXEC_ROLE_COLORS: Record<string, string> = {
  CISO:  "text-sage-400 bg-sage-500/10 border-sage-500/30",
  CFO:   "text-amber-400 bg-amber-500/10 border-amber-500/30",
  CEO:   "text-blue-400 bg-blue-500/10 border-blue-500/30",
  LEGAL: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  PR:    "text-pink-400 bg-pink-500/10 border-pink-500/30",
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function elapsed(startIso: string) {
  const sec = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000);
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function SatisfactionBar({ value }: { value: number }) {
  const color = value > 70 ? "bg-sage-500" : value >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden flex-1">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function getLastExecDelta(events: EventRow[], role: string): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const ev = events[i];
    if (ev.type === "EXEC_REACTION") {
      const p = ev.payload as Record<string, unknown>;
      if (p.role === role) return p.delta as number;
    }
  }
  return null;
}

export function WarRoomClient({ sessionId, initialData, teamRole, teamMembers, personaId }: Props) {
  const [data, setData] = useState(initialData);
  const [pending, setPending] = useState<string | null>(null);
  const [timer, setTimer] = useState(() => elapsed(initialData.session.startedAt));
  const [rightTab, setRightTab] = useState<"evidence" | "stakeholders" | "threats" | "alerts">("evidence");
  const feedRef = useRef<HTMLDivElement>(null);

  // Track which evidence artifacts have been read (resets on stage change)
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [trackedStage, setTrackedStage] = useState(initialData.session.currentStage);
  const [scoreFlash, setScoreFlash] = useState<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/simulation/${sessionId}`);
      if (!res.ok) return;
      const json = await res.json();
      setData(json);
    } catch { /* silent */ }
  }, [sessionId]);

  useEffect(() => {
    const t = setInterval(() => setTimer(elapsed(data.session.startedAt)), 1000);
    return () => clearInterval(t);
  }, [data.session.startedAt]);

  useEffect(() => {
    if (data.worldState.status !== "ACTIVE") return;
    const t = setInterval(refresh, 20_000);
    return () => clearInterval(t);
  }, [refresh, data.worldState.status]);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [data.events.length]);

  // Reset read state when the stage advances
  useEffect(() => {
    if (data.session.currentStage !== trackedStage) {
      setReadIds(new Set());
      setTrackedStage(data.session.currentStage);
    }
  }, [data.session.currentStage, trackedStage]);

  async function takeAction(actionId: string) {
    setPending(actionId);
    try {
      const res = await fetch(`/api/simulation/${sessionId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId }),
      });
      const json = await res.json() as { scoreChange?: number };
      if (typeof json.scoreChange === "number" && json.scoreChange !== 0) {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setScoreFlash(json.scoreChange);
        flashTimer.current = setTimeout(() => setScoreFlash(null), 2200);
      }
      await refresh();
    } finally {
      setPending(null);
    }
  }

  const { session, events, worldState, availableActions, stageDefinition } = data;
  const company = session.companyData;
  const isOver = worldState.status !== "ACTIVE";
  const threatColor = THREAT_COLORS[stageDefinition?.threat ?? "LOW"] ?? "text-zinc-400";
  const executives = data.executives ?? [];
  const roleActions = teamRole ? availableActions.filter((a) => actionMatchesRole(a, teamRole)) : availableActions;
  const advisoryActions = teamRole === "LEGAL" ? availableActions.filter((a) => !actionMatchesRole(a, teamRole)) : [];

  // Evidence for current stage
  const stageArtifacts = getEvidence(session.template.slug, session.currentStage, company.name);
  // Check intersection with current stage's artifact IDs — prevents one-frame unlock flash on stage transition
  const actionsUnlocked = stageArtifacts.length === 0 || stageArtifacts.some((a) => readIds.has(a.id));

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-zinc-400">← Exit</Link>
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{company.name} · {company.city}</p>
            <p className="font-semibold text-sm">{session.template.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {stageDefinition && (
            <span className={`text-xs border px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${threatColor}`}>
              {stageDefinition.threat}
            </span>
          )}
          <div className="text-right">
            <p className="text-xs text-zinc-500">Stage</p>
            <p className="text-sm font-semibold">{stageDefinition?.label ?? session.currentStage}</p>
          </div>
          <div className="text-right relative">
            <p className="text-xs text-zinc-500">Score</p>
            <p className="text-lg font-bold text-sage-500">{worldState.score}</p>
            {scoreFlash !== null && (
              <span
                className={`absolute -top-4 right-0 text-xs font-bold animate-bounce ${
                  scoreFlash > 0 ? "text-sage-400" : "text-red-400"
                }`}
              >
                {scoreFlash > 0 ? `+${scoreFlash}` : scoreFlash} pts
              </span>
            )}
          </div>
          <div className="text-right font-mono text-sm text-zinc-400">{timer}</div>
          {isOver && (
            <span className={`text-xs px-2 py-1 rounded font-bold ${worldState.status === "CONTAINED" ? "bg-sage-500/20 text-sage-500" : "bg-red-500/20 text-red-400"}`}>
              {worldState.status === "CONTAINED" ? "CONTAINED" : "BREACHED"}
            </span>
          )}
        </div>
      </header>

      {/* Team header strip */}
      {teamRole && teamMembers && (
        <div className="border-b border-white/10 px-6 py-2 flex items-center gap-3 flex-wrap bg-zinc-900/30">
          <span className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">Your Role:</span>
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${ROLE_COLORS[teamRole] ?? "text-zinc-400 border border-zinc-700"}`}>
            {ROLE_LABELS[teamRole] ?? teamRole}
          </span>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-600 uppercase tracking-wider font-semibold">Team:</span>
          <div className="flex flex-wrap gap-1.5">
            {teamMembers.map((m) => (
              <span
                key={`${m.name}-${m.role}`}
                className={`text-xs px-2 py-0.5 rounded ${ROLE_COLORS[m.role] ?? "text-zinc-400 border border-zinc-700"}`}
              >
                {m.name} · {ROLE_LABELS[m.role] ?? m.role}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Three-panel layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] divide-y lg:divide-y-0 lg:divide-x divide-white/10 overflow-hidden">

        {/* LEFT — Live Feed */}
        <div className="flex flex-col">
          <p className="px-4 py-2 text-xs uppercase tracking-widest text-zinc-600 border-b border-white/10">Live Feed</p>
          <div ref={feedRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[calc(100vh-120px)]">
            {events.map((ev) => {
              const style = ACTOR_STYLES[ev.actor] ?? ACTOR_STYLES.SYSTEM;
              const scoreChange = ev.type === "STUDENT_ACTION"
                ? (ev.payload as Record<string, unknown>)?.scoreChange as number | undefined
                : undefined;
              return (
                <div key={ev.id} className="flex gap-2 items-start text-xs">
                  <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${style.color}`}>
                    {style.label}
                  </span>
                  <div>
                    <span className="text-zinc-600 mr-1 font-mono">{formatTime(ev.createdAt)}</span>
                    <span className={ev.actor === "ATTACKER" ? "text-red-300" : ev.actor === "ANALYST" ? "text-sage-400" : "text-zinc-400"}>
                      {ev.narrative ?? ev.type}
                    </span>
                    {typeof scoreChange === "number" && scoreChange !== 0 && (
                      <span className={`ml-1.5 font-bold tabular-nums ${scoreChange > 0 ? "text-sage-500" : "text-red-400"}`}>
                        {scoreChange > 0 ? `+${scoreChange}` : scoreChange}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER — Situation + Actions */}
        <div className="flex flex-col overflow-y-auto">
          <p className="px-6 py-2 text-xs uppercase tracking-widest text-zinc-600 border-b border-white/10">Situation Brief</p>
          <div className="p-6 flex-1">
            {stageDefinition && (
              <div className="mb-6">
                <h2 className={`text-lg font-bold mb-2 ${threatColor.split(" ")[0]}`}>{stageDefinition.label}</h2>
                <p className="text-zinc-300 text-sm leading-relaxed">{stageDefinition.brief}</p>
              </div>
            )}

            {isOver ? (
              <div className={`rounded-xl border p-6 text-center ${worldState.status === "CONTAINED" ? "border-sage-500/40 bg-sage-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <p className={`text-2xl font-bold mb-1 ${worldState.status === "CONTAINED" ? "text-sage-500" : "text-red-400"}`}>
                  {worldState.status === "CONTAINED" ? "Incident Contained" : "Network Breached"}
                </p>
                <p className="text-zinc-400 text-sm mb-4">
                  {worldState.status === "CONTAINED"
                    ? "You stopped the attack. Your decisions made the difference."
                    : "The attacker reached their objective. Review what you missed."}
                </p>
                <p className="text-3xl font-bold">{worldState.score} <span className="text-sm text-zinc-500 font-normal">points</span></p>
                <p className="text-xs text-zinc-600 mt-1">{worldState.decisionCount} decisions made</p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <Link href={`/simulation/${sessionId}/debrief`} className="rounded bg-sage-500 px-4 py-2 text-sm font-semibold text-black hover:bg-sage-700 hover:text-white transition">
                    Full Debrief →
                  </Link>
                  <Link href="/dashboard" className="rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/20">
                    Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                {/* Investigation phase — appears when stage has evidence */}
                {stageArtifacts.length > 0 && (
                  <EvidencePanel
                    artifacts={stageArtifacts}
                    readIds={readIds}
                    onRead={(id) => setReadIds((prev) => new Set([...prev, id]))}
                  />
                )}

                {/* Action panel — locked until at least one artifact read */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs uppercase tracking-wider text-zinc-600">
                      {actionsUnlocked ? "Response Actions" : "Response Actions"}
                    </p>
                    {!actionsUnlocked && (
                      <span className="text-[9px] font-bold text-zinc-700 border border-zinc-800 px-1.5 py-0.5 rounded tracking-widest">
                        LOCKED
                      </span>
                    )}
                    {actionsUnlocked && stageArtifacts.length > 0 && (
                      <span className="text-[9px] font-bold text-sage-600 border border-sage-500/20 px-1.5 py-0.5 rounded tracking-widest">
                        UNLOCKED
                      </span>
                    )}
                  </div>
                  <div className={`grid gap-2 transition-all ${!actionsUnlocked ? "opacity-30 pointer-events-none select-none" : ""}`}>
                    {roleActions.length === 0 && advisoryActions.length === 0 && (
                      <p className="text-zinc-600 text-sm italic">
                        {teamRole ? "No actions available for your role. Coordinate with your IR Lead." : "Monitoring situation… Refresh incoming."}
                      </p>
                    )}
                    {roleActions.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => takeAction(a.id)}
                        disabled={!!pending || !actionsUnlocked}
                        className="text-left rounded-lg border border-white/10 p-3 hover:border-sage-500/50 hover:bg-sage-500/5 transition disabled:opacity-50 group"
                      >
                        <p className="text-sm font-medium group-hover:text-sage-400 transition">
                          {pending === a.id ? "Executing…" : a.label}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>
                      </button>
                    ))}
                    {advisoryActions.map((a) => (
                      <div key={a.id} className="rounded-lg border border-white/5 p-3 opacity-40">
                        <p className="text-sm font-medium text-zinc-400">{a.label}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">Advisory only — action belongs to another role</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Tabbed panel (extracted to RightPanel) */}
        <div className="flex flex-col">
          <RightPanel
            tab={rightTab}
            onTabChange={setRightTab}
            events={events}
            worldState={worldState}
            organizationHealth={data.organizationHealth}
            employeeStates={data.employeeStates}
            company={company}
            stageDefinition={stageDefinition}
            executives={executives}
            personaId={personaId}
          />
        </div>
      </div>
    </div>
  );
}
