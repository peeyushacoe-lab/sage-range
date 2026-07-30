"use client";

import type { WorldState, CompanyProfile, Executive } from "@/lib/simulation/types";

type EventRow = { id: string; type: string; actor: string; payload: unknown; narrative: string | null; createdAt: string };
type StageDefRow = { id: string; label: string; brief: string; threat: string; evidence: string[] } | null;
type EmpStateData = { stressLevel: number; morale: number; confidenceInSOC: number; securityAwareness: number; insiderRisk: number };
type OrgHealth = { panicIndex: number; trustInSOC: number; operationalStability: number; communicationIntegrity: number; insiderThreatRisk: number };

type Tab = "evidence" | "stakeholders" | "threats" | "alerts" | "decisions";

const EXEC_ROLE_COLORS: Record<string, string> = {
  CISO: "text-ok bg-ok-wash border-ok-edge",
  CFO:  "text-warn bg-warn-wash border-warn-edge",
  CEO:  "text-info bg-info-wash border-info-edge",
  LEGAL:"text-accent bg-accent-wash border-accent-edge",
  PR:   "text-pink-400 bg-pink-500/10 border-pink-500/30",
};

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "text-danger border-danger-edge bg-danger-wash",
  HIGH:     "text-sev-high border-sev-high-edge bg-sev-high-wash",
  MEDIUM:   "text-warn border-warn-edge bg-warn-wash",
  INFO:     "text-ink-2 border-edge-strong bg-surface-1",
};

const PERSONA_LABELS: Record<string, string> = {
  ransomware_gang: "Ransomware Gang",
  nation_state_apt: "Nation State APT",
  insider: "Insider",
  hacktivist: "Hacktivist",
  cybercriminal: "Cybercriminal",
};

function Gauge({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const bad = inverse ? value > 65 : value < 30;
  const warn = inverse ? value > 40 : value < 55;
  const color = bad ? "bg-danger" : warn ? "bg-warn" : "bg-ok";
  const textColor = bad ? "text-danger" : warn ? "text-warn" : "text-ink-2";
  return (
    <div>
      <div className="flex justify-between text-[9px] text-ink-3 mb-0.5">
        <span>{label}</span>
        <span className={textColor}>{value}</span>
      </div>
      <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
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

type Props = {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  events: EventRow[];
  worldState: WorldState;
  organizationHealth?: OrgHealth;
  employeeStates?: Record<string, EmpStateData>;
  company: CompanyProfile;
  stageDefinition: StageDefRow;
  executives: Executive[];
  personaId?: string | null;
};

export function RightPanel({ tab, onTabChange, events, worldState, organizationHealth, employeeStates, company, stageDefinition, executives, personaId }: Props) {
  const decisionEvents = events.filter((e) => e.type === "STUDENT_ACTION");

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "evidence", label: "Evidence" },
    { id: "decisions", label: "Decisions" },
    { id: "threats", label: "Threats" },
    { id: "alerts", label: "Alerts" },
  ];

  // Derived data
  const redaiEvents = events.filter((e) => e.type === "REDAI_ACTION");
  const telemetryEvents = events.filter((e) => e.type === "TELEMETRY_ALERT" && (e.payload as Record<string,unknown>).visible === true);
  const controlEvents = events.filter((e) => e.type === "CONTROL_PREVENTION" || e.type === "CONTROL_CONTAINMENT");
  const adversaryObjective = redaiEvents.length > 0
    ? (redaiEvents.at(-1)!.payload as Record<string, unknown>).objective as string
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-edge flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={`flex-1 px-2 py-2 text-[10px] uppercase tracking-widest transition relative ${
              tab === t.id ? "text-ink-2" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-px bg-ink-3" />}
            {t.id === "threats" && redaiEvents.length > 0 && (
              <span className="ml-1 text-[8px] bg-danger-wash text-white rounded-full px-1">{redaiEvents.length}</span>
            )}
            {t.id === "alerts" && telemetryEvents.length > 0 && (
              <span className="ml-1 text-[8px] bg-warn-wash text-white rounded-full px-1">{telemetryEvents.length}</span>
            )}
            {t.id === "decisions" && decisionEvents.length > 0 && (
              <span className="ml-1 text-[8px] bg-ok-wash text-white rounded-full px-1">{decisionEvents.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-120px)]">

        {/* ── EVIDENCE ─────────────────────────────────────────────── */}
        {tab === "evidence" && (
          <>
            {/* Executive Pressure */}
            {(worldState.ceoConfidence !== undefined) && (
              <div className="mb-3 pb-3 border-b border-edge-subtle">
                <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">Executive Pressure</p>
                <div className="space-y-1.5">
                  <Gauge label="CEO Confidence" value={worldState.ceoConfidence} />
                  <Gauge label="Board Confidence" value={worldState.boardConfidence} />
                  <Gauge label="Customer Trust" value={worldState.customerTrust} />
                  <Gauge label="Legal Pressure" value={worldState.legalPressure} inverse />
                  <Gauge label="Media Pressure" value={worldState.mediaPressure} inverse />
                </div>
              </div>
            )}

            {/* Asset Compromise */}
            {(worldState.compromisedEmployees?.length > 0 || worldState.compromisedSystems?.length > 0) && (
              <div className="mb-3 pb-3 border-b border-edge-subtle">
                <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">Compromised Assets</p>
                {worldState.compromisedEmployees?.length > 0 && (
                  <div className="mb-2">
                    <p className="text-[10px] text-ink-3 mb-1">Employees</p>
                    {worldState.compromisedEmployees.map((e) => (
                      <span key={e} className="inline-block text-[10px] text-danger border border-danger-edge rounded px-1.5 py-0.5 mr-1 mb-1">{e}</span>
                    ))}
                  </div>
                )}
                {worldState.compromisedSystems?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-ink-3 mb-1">Systems</p>
                    {worldState.compromisedSystems.map((s) => (
                      <span key={s} className="inline-block text-[10px] text-sev-high border border-sev-high-edge rounded px-1.5 py-0.5 mr-1 mb-1">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Org Health */}
            {organizationHealth && (
              <div className="mb-3 pb-3 border-b border-edge-subtle">
                <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">Org Health</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                  <Gauge label="Panic" value={organizationHealth.panicIndex} inverse />
                  <Gauge label="Trust in SOC" value={organizationHealth.trustInSOC} />
                  <Gauge label="Stability" value={organizationHealth.operationalStability} />
                  <Gauge label="Comms" value={organizationHealth.communicationIntegrity} />
                </div>
                <div className="mt-1.5">
                  <Gauge label="Insider Risk" value={organizationHealth.insiderThreatRisk} inverse />
                </div>
              </div>
            )}

            {/* Company + employees */}
            <p className="text-xs text-ink-3 uppercase tracking-wider mb-1">Company</p>
            <p className="text-sm font-semibold">{company.name}</p>
            <p className="text-xs text-ink-3">{company.size} · {company.city}</p>
            <p className="text-xs text-ink-3 mt-2 mb-3 leading-relaxed">{company.securityPosture}</p>

            <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">Key Personnel</p>
            {company.employees.slice(0, 5).map((e) => {
              const es = employeeStates?.[e.name];
              return (
                <div key={e.name} className="mb-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-[10px] font-bold ${e.riskLevel === "HIGH" ? "text-danger" : e.riskLevel === "MEDIUM" ? "text-warn" : "text-ok"}`}>
                      {e.riskLevel}
                    </span>
                    <span className="text-xs text-ink-2 truncate">{e.name}</span>
                  </div>
                  {es && (
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      <Gauge label="Stress" value={es.stressLevel} inverse />
                      <Gauge label="Morale" value={es.morale} />
                    </div>
                  )}
                </div>
              );
            })}

            {stageDefinition && (
              <div className="mt-3">
                <p className="text-xs text-ink-3 uppercase tracking-wider mb-2">SIEM Alerts</p>
                <div className="space-y-1.5">
                  {stageDefinition.evidence.map((line) => (
                    <p key={line} className="text-xs text-ink-2 font-mono leading-relaxed border-l-2 border-edge-strong pl-2">{line}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── THREAT INTEL ─────────────────────────────────────────── */}
        {tab === "threats" && (
          <>
            {personaId && (
              <div className="rounded border border-danger-edge bg-danger-wash p-2 mb-3">
                <p className="text-[10px] text-ink-3 uppercase tracking-wider">Active Adversary</p>
                <p className="text-sm font-bold text-danger">{PERSONA_LABELS[personaId] ?? personaId}</p>
                {adversaryObjective && (
                  <p className="text-[10px] text-ink-3 mt-1">Current objective: <span className="text-ink-2">{adversaryObjective.replace(/_/g, " ")}</span></p>
                )}
              </div>
            )}

            {/* Control events */}
            {controlEvents.length > 0 && (
              <div className="mb-3 pb-3 border-b border-edge-subtle">
                <p className="text-[10px] text-ink-3 uppercase tracking-wider mb-1.5">Defense Responses</p>
                {controlEvents.map((e) => {
                  const p = e.payload as Record<string, unknown>;
                  const isPrevent = e.type === "CONTROL_PREVENTION";
                  return (
                    <div key={e.id} className={`text-[10px] rounded border px-2 py-1.5 mb-1 ${isPrevent ? "border-ok-edge bg-ok-wash text-ok" : "border-info-edge bg-info-wash text-info"}`}>
                      <span className="font-bold">{isPrevent ? "BLOCKED" : "CONTAINED"}</span>
                      <span className="text-ink-2 ml-1">{p.controlName as string ?? p.control as string}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {redaiEvents.length === 0 ? (
              <p className="text-xs text-ink-3 italic">No adversary activity yet. Threat intel will appear as the simulation progresses.</p>
            ) : (
              <div className="space-y-2">
                {redaiEvents.map((e) => {
                  const p = e.payload as Record<string, unknown>;
                  const blocked = p.prevented === true;
                  const succeeded = p.succeeded === true;
                  return (
                    <div key={e.id} className={`rounded border p-2 text-xs ${blocked ? "border-ok-edge bg-ok-wash" : succeeded ? "border-danger-edge bg-danger-wash" : "border-edge-subtle bg-white/2"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[10px] font-bold ${blocked ? "text-ok" : succeeded ? "text-danger" : "text-ink-3"}`}>
                          {blocked ? "BLOCKED" : succeeded ? "LANDED" : "ATTEMPTED"}
                        </span>
                        <span className="text-ink-3 font-mono">{String(p.action).replace(/_/g, " ")}</span>
                        {Boolean(p.target) && <span className="text-ink-3">→ {String(p.target)}</span>}
                      </div>
                      {e.narrative && <p className="text-ink-2 leading-snug">{e.narrative.replace("[THREAT INTEL] ", "")}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── ALERTS ──────────────────────────────────────────────── */}
        {tab === "alerts" && (
          <>
            {telemetryEvents.length === 0 ? (
              <p className="text-xs text-ink-3 italic">No alerts yet. Security tools will surface detections here as the adversary acts.</p>
            ) : (
              <div className="space-y-2">
                {[...telemetryEvents].reverse().map((e) => {
                  const p = e.payload as Record<string, unknown>;
                  const sev = String(p.severity ?? "INFO");
                  const sevStyle = SEV_COLORS[sev] ?? SEV_COLORS.INFO;
                  return (
                    <div key={e.id} className={`rounded border p-2 text-xs ${sevStyle}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-[10px]">{sev}</span>
                        <span className="text-ink-3">{String(p.source)}</span>
                        {Boolean(p.mitreTechniqueId) && (
                          <span className="ml-auto font-mono text-[10px] text-ink-3 border border-edge-strong rounded px-1">
                            {String(p.mitreTechniqueId)}
                          </span>
                        )}
                      </div>
                      <p className="text-ink-2 leading-snug">{e.narrative?.replace(/^\[.*?\]\s*\w+:\s*/, "") ?? String(p.system)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── DECISIONS ───────────────────────────────────────────── */}
        {tab === "decisions" && (
          <>
            {decisionEvents.length === 0 ? (
              <p className="text-xs text-ink-3 italic mt-4">No decisions taken yet. Each action you take will appear here with its score impact.</p>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-edge-subtle">
                  <p className="text-[10px] text-ink-3 uppercase tracking-wider">Running Score</p>
                  <p className="text-base font-bold text-ok tabular-nums">{worldState.score} pts</p>
                </div>
                <div className="space-y-1.5">
                  {decisionEvents.map((e, i) => {
                    const p = e.payload as Record<string, unknown>;
                    const label = p.label as string ?? e.type;
                    const sc = (p.scoreChange as number) ?? 0;
                    const isBlocker = p.stageBlocker === true;
                    return (
                      <div
                        key={e.id}
                        className={`rounded border px-2 py-1.5 text-xs ${
                          isBlocker
                            ? "border-ok-edge bg-ok-wash"
                            : "border-edge-subtle bg-white/2"
                        }`}
                      >
                        <div className="flex items-start gap-1.5">
                          <span className="text-[10px] text-ink-3 shrink-0 tabular-nums mt-px w-4 text-right">{i + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <p className={`leading-snug truncate ${isBlocker ? "text-ok" : "text-ink-2"}`}>{label}</p>
                            {isBlocker && <p className="text-[9px] text-ink-3 font-bold uppercase tracking-wider mt-0.5">Contained</p>}
                          </div>
                          <span className={`shrink-0 text-xs font-bold tabular-nums ${sc > 0 ? "text-ok" : sc < 0 ? "text-danger" : "text-ink-3"}`}>
                            {sc > 0 ? `+${sc}` : sc}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── STAKEHOLDERS ────────────────────────────────────────── */}
        {tab === "stakeholders" && (
          <>
            {executives.length === 0 ? (
              <p className="text-xs text-ink-3 italic mt-4">Stakeholders appear once the incident escalates.</p>
            ) : (
              <div className="space-y-3">
                {executives.map((exec) => {
                  const roleColor = EXEC_ROLE_COLORS[exec.role] ?? "text-ink-2 bg-surface-2 border-edge-strong";
                  const satColor = exec.satisfaction > 70 ? "text-ok" : exec.satisfaction >= 40 ? "text-warn" : "text-danger";
                  const lastDelta = getLastExecDelta(events, exec.role);
                  const trend = lastDelta === null ? null : lastDelta > 0 ? "+" : lastDelta < 0 ? "-" : null;
                  return (
                    <div key={exec.role} className="rounded-lg border border-edge bg-surface-2 p-2.5">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${roleColor}`}>{exec.role}</span>
                        <span className="text-xs font-medium text-ink truncate">{exec.name}</span>
                      </div>
                      <p className="text-[10px] text-ink-3 mb-1.5">{exec.title}</p>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${exec.satisfaction > 70 ? "bg-ok" : exec.satisfaction >= 40 ? "bg-warn" : "bg-danger"}`}
                            style={{ width: `${exec.satisfaction}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums shrink-0 ${satColor}`}>
                          {exec.satisfaction}
                          {trend === "+" && <span className="ml-0.5 text-ok">↑</span>}
                          {trend === "-" && <span className="ml-0.5 text-danger">↓</span>}
                        </span>
                      </div>
                      <p className="text-[10px] text-ink-3 italic leading-snug">{exec.priority}</p>
                      {exec.demand && (
                        <p className="text-[10px] text-ink-2 mt-1.5 leading-snug border-l border-edge-strong pl-2">&quot;{exec.demand}&quot;</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
