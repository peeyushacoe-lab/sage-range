import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getOrCreateAppUser } from "@/lib/current-user";
import { Navbar } from "@/components/navbar";
import { db } from "@/lib/db";
import { buildWorldState } from "@/lib/simulation/engine";
import { getRoleConfig, filterEventsForRole, listRoles } from "@/lib/simulation/runtime/roles/permissions";
import type { SimulationRole } from "@/lib/simulation/runtime/roles/permissions";
import type { WorldState, CompanyProfile } from "@/lib/simulation/types";

export const dynamic = "force-dynamic";

const VALID_ROLES = new Set<SimulationRole>([
  "INCIDENT_COMMANDER", "SOC_ANALYST", "THREAT_HUNTER",
  "IT_OPERATIONS", "LEGAL", "PR", "EXECUTIVE",
]);

const ROLE_COLORS: Record<SimulationRole, string> = {
  INCIDENT_COMMANDER: "text-sage-400 border-sage-500/40 bg-sage-500/5",
  SOC_ANALYST:        "text-blue-400 border-blue-500/40 bg-blue-500/5",
  THREAT_HUNTER:      "text-purple-400 border-purple-500/40 bg-purple-500/5",
  IT_OPERATIONS:      "text-cyan-400 border-cyan-500/40 bg-cyan-500/5",
  LEGAL:              "text-amber-400 border-amber-500/40 bg-amber-500/5",
  PR:                 "text-pink-400 border-pink-500/40 bg-pink-500/5",
  EXECUTIVE:          "text-orange-400 border-orange-500/40 bg-orange-500/5",
};

const SEV_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400 border-red-500/40",
  HIGH:     "text-orange-400 border-orange-500/40",
  MEDIUM:   "text-amber-400 border-amber-500/30",
  INFO:     "text-zinc-400 border-zinc-700",
};

function PressureGauge({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  const bad = inverse ? value > 60 : value < 35;
  const warn = inverse ? value > 35 : value < 55;
  const color = bad ? "bg-red-500" : warn ? "bg-amber-500" : "bg-sage-500";
  const text = bad ? "text-red-400" : warn ? "text-amber-400" : "text-zinc-300";
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className={`font-bold ${text}`}>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

export default async function RoleViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const { sessionId } = await params;
  const { role: roleParam } = await searchParams;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const role = roleParam?.toUpperCase() as SimulationRole | undefined;

  // No role selected — show role picker
  if (!role || !VALID_ROLES.has(role)) {
    const roles = listRoles();
    return (
      <main className="min-h-screen bg-zinc-950">
        <Navbar backHref={`/simulation/${sessionId}`} backLabel="War Room" />
        <div className="px-6 py-10 max-w-3xl mx-auto">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-widest text-sage-500 font-semibold mb-2">Role View</p>
            <h1 className="text-2xl font-bold text-white mb-2">Select Your Role</h1>
            <p className="text-zinc-400 text-sm">Each role sees a different slice of the incident. Choose one to enter your view.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.map((r) => (
              <Link
                key={r.id}
                href={`/simulation/${sessionId}/view?role=${r.id}`}
                className={`rounded-xl border p-4 hover:bg-white/5 transition ${ROLE_COLORS[r.id as SimulationRole] ?? "border-white/10"}`}
              >
                <p className="font-semibold text-sm mb-1">{r.label}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{r.description}</p>
                {!r.canTakeActions && <p className="text-[10px] text-zinc-600 mt-2">Read-only</p>}
              </Link>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: { events: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) notFound();

  const worldState = buildWorldState(session.events);
  const config = getRoleConfig(role);
  const company = session.companyData as CompanyProfile;

  const rawEvents = session.events.map((e) => ({
    type: e.type, actor: e.actor, payload: e.payload, narrative: e.narrative,
  }));
  const filteredRaw = filterEventsForRole(rawEvents, role);
  const filteredEvents = session.events.filter((_, i) =>
    filteredRaw.some((r, ri) => ri === i) // length-based index match
  );

  // Role-specific world state fields
  const fields = config.worldStateFields;
  const ws: Partial<WorldState> = {};
  for (const f of fields) (ws as Record<string, unknown>)[f] = worldState[f];

  const roleColor = ROLE_COLORS[role] ?? "border-white/10";

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href={`/simulation/${sessionId}/view`} className="text-xs text-zinc-600 hover:text-zinc-400">← Switch Role</Link>
          <Link href={`/simulation/${sessionId}`} className="text-xs text-zinc-600 hover:text-zinc-400">War Room</Link>
          <span className={`text-xs font-bold px-2 py-0.5 rounded border ${roleColor}`}>{config.label}</span>
          {!config.canTakeActions && <span className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">Read-only</span>}
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm font-semibold">{company.name}</p>
          <span className={`text-xs px-2 py-0.5 rounded font-bold ${session.status === "ACTIVE" ? "bg-sage-500/20 text-sage-400" : session.status === "BREACHED" ? "bg-red-500/20 text-red-400" : "bg-zinc-700 text-zinc-300"}`}>
            {session.status}
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main panel */}
        <div>
          {/* Executive view */}
          {role === "EXECUTIVE" && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-4">Business Impact Dashboard</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {ws.ceoConfidence !== undefined && <PressureGauge label="CEO Confidence" value={ws.ceoConfidence as number} />}
                {ws.boardConfidence !== undefined && <PressureGauge label="Board Confidence" value={ws.boardConfidence as number} />}
                {ws.customerTrust !== undefined && <PressureGauge label="Customer Trust" value={ws.customerTrust as number} />}
                {ws.mediaPressure !== undefined && <PressureGauge label="Media Pressure" value={ws.mediaPressure as number} inverse />}
                {ws.legalPressure !== undefined && <PressureGauge label="Legal Pressure" value={ws.legalPressure as number} inverse />}
                {ws.score !== undefined && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-zinc-500">Response Score</span>
                    <span className="text-2xl font-bold text-sage-400">{ws.score as number}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {ws.dataExfiltrated && <span className="text-xs border border-red-500/40 bg-red-500/10 text-red-400 rounded px-2 py-1">Data Exfiltrated</span>}
                {ws.ransomwareDeployed && <span className="text-xs border border-red-500/60 bg-red-500/15 text-red-300 rounded px-2 py-1 font-bold animate-pulse">Ransomware Deployed</span>}
              </div>
            </div>
          )}

          {/* SOC / Threat Hunter alerts */}
          {(role === "SOC_ANALYST" || role === "THREAT_HUNTER") && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">
                {role === "THREAT_HUNTER" ? "All Telemetry (including raw hidden signals)" : "Visible Alerts"}
              </p>
              {filteredEvents.filter((e) => e.type === "TELEMETRY_ALERT").length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No alerts yet.</p>
              ) : (
                <div className="space-y-2">
                  {filteredEvents.filter((e) => e.type === "TELEMETRY_ALERT").reverse().map((e) => {
                    const p = e.payload as Record<string, unknown>;
                    const sev = String(p.severity ?? "INFO");
                    return (
                      <div key={e.id} className={`rounded border p-3 text-sm ${SEV_COLORS[sev] ?? SEV_COLORS.INFO}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold">{sev}</span>
                          <span className="text-zinc-500 text-xs">{String(p.source)}</span>
                          {Boolean(p.mitreTechniqueId) && <span className="ml-auto font-mono text-[10px] text-zinc-500 border border-zinc-700 rounded px-1">{String(p.mitreTechniqueId)}</span>}
                          {role === "THREAT_HUNTER" && !p.visible && <span className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1">hidden</span>}
                        </div>
                        <p className="text-zinc-300">{e.narrative?.replace(/^\[.*?\]\s*\w+:\s*/, "") ?? String(p.system)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Legal view */}
          {role === "LEGAL" && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">Regulatory Exposure</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {ws.legalPressure !== undefined && <PressureGauge label="Legal Pressure" value={ws.legalPressure as number} inverse />}
                {ws.dataExfiltrated !== undefined && (
                  <div className={`rounded border p-3 text-sm ${ws.dataExfiltrated ? "border-red-500/40 bg-red-500/5 text-red-400" : "border-zinc-700 text-zinc-500"}`}>
                    <p className="text-[10px] uppercase tracking-wider mb-1">Data Status</p>
                    <p className="font-bold">{ws.dataExfiltrated ? "EXFILTRATED" : "Secure"}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* IT Operations view */}
          {role === "IT_OPERATIONS" && ws.systemStatuses && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">System Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(ws.systemStatuses as Record<string, string>).map(([sys, status]) => (
                  <div key={sys} className={`rounded border p-2 text-xs ${status === "OFFLINE" ? "border-red-500/40 bg-red-500/5" : status === "DEGRADED" ? "border-amber-500/30 bg-amber-500/5" : "border-zinc-700"}`}>
                    <p className="text-zinc-400 truncate">{sys}</p>
                    <p className={`font-bold text-[10px] mt-0.5 ${status === "OFFLINE" ? "text-red-400" : status === "DEGRADED" ? "text-amber-400" : "text-sage-500"}`}>{status}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Event feed */}
          <div>
            <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">Your Event Feed ({filteredEvents.length} events)</p>
            <div className="space-y-2">
              {filteredEvents.filter((e) => e.narrative).slice(-30).reverse().map((e) => (
                <div key={e.id} className="text-xs border border-white/5 rounded p-2 bg-white/2">
                  <span className="text-zinc-600 font-mono mr-2">{new Date(e.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  <span className="text-zinc-500 mr-2">[{e.type.replace(/_/g, " ")}]</span>
                  <span className="text-zinc-300">{e.narrative}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-600 mb-3">Your Role</p>
            <p className={`font-bold text-sm mb-1 ${ROLE_COLORS[role].split(" ")[0]}`}>{config.label}</p>
            <p className="text-xs text-zinc-500 leading-relaxed">{config.description ?? ""}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-600 mb-2">Switch Role</p>
            <div className="space-y-1">
              {listRoles().map((r) => (
                <Link
                  key={r.id}
                  href={`/simulation/${sessionId}/view?role=${r.id}`}
                  className={`block text-xs px-2 py-1.5 rounded transition ${r.id === role ? `font-bold ${ROLE_COLORS[r.id as SimulationRole].split(" ")[0]}` : "text-zinc-500 hover:text-zinc-300"}`}
                >
                  {r.label} {!r.canTakeActions && <span className="text-zinc-700">(read-only)</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
