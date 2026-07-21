import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { buildAssetGraph } from "@/lib/simulation/runtime/redai/asset-graph";
import { buildDebrief } from "@/lib/simulation/runtime/debrief";
import { buildWorldState, computeFinalScore } from "@/lib/simulation/engine";
import { Navbar } from "@/components/navbar";
import { AttackGraph } from "./_components/attack-graph";
import type { GraphNode, GraphEdge, AttackEvent, StageMarker } from "./_components/attack-graph";
import type { CompanyProfile } from "@/lib/simulation/types";

export const dynamic = "force-dynamic";

// Column x positions by asset type
const COL_X: Record<string, number> = {
  NETWORK_DEVICE: 80,
  SERVER:         280,
  DATABASE:       500,
  CLOUD_SERVICE:  700,
  DATA_STORE:     720,
};
const CRIT_R: Record<string, number> = {
  CRITICAL: 28, HIGH: 24, MEDIUM: 20, LOW: 16,
};
const SHORT: Record<string, string> = {
  NETWORK_DEVICE: "NET", SERVER: "SRV", DATABASE: "DB",
  CLOUD_SERVICE: "SaaS", DATA_STORE: "DS", ENDPOINT: "EP",
};

function layoutNodes(sharedNodes: { id: string; name: string; type: string; criticality: string }[]): GraphNode[] {
  const groups = new Map<string, typeof sharedNodes>();
  for (const n of sharedNodes) {
    if (!groups.has(n.type)) groups.set(n.type, []);
    groups.get(n.type)!.push(n);
  }

  const result: GraphNode[] = [];
  for (const [type, group] of groups) {
    const x = COL_X[type] ?? 440;
    const count = group.length;
    const spacing = Math.min(70, 320 / Math.max(1, count));
    const startY = 200 - ((count - 1) * spacing) / 2;
    group.forEach((n, i) => {
      result.push({
        id:          n.id,
        label:       n.name,
        shortLabel:  SHORT[n.type] ?? "?",
        kind:        "system",
        assetType:   n.type,
        criticality: n.criticality,
        x,
        y: startY + i * spacing,
        r: CRIT_R[n.criticality] ?? 20,
      });
    });
  }
  return result;
}

export default async function GraphPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const user = await getOrCreateAppUser();
  if (!user) redirect("/sign-in");

  const session = await db.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      template: { select: { name: true, slug: true } },
      events:   { orderBy: { createdAt: "asc" } },
    },
  });

  if (!session || session.userId !== user.id) notFound();
  if (session.status === "ACTIVE") redirect(`/simulation/${sessionId}`);

  const company = session.companyData as CompanyProfile;
  const graph = buildAssetGraph(company);

  // Only show shared system nodes (not one endpoint per employee — too many)
  const sharedNodes = graph.nodes.filter(n => n.type !== "ENDPOINT");
  const graphNodes: GraphNode[] = layoutNodes(sharedNodes);

  // Build edges from connectedTo (shared systems only)
  const graphEdges: GraphEdge[] = [];
  const nodeIds = new Set(sharedNodes.map(n => n.id));
  for (const node of sharedNodes) {
    for (const targetId of node.connectedTo) {
      if (nodeIds.has(targetId)) {
        graphEdges.push({ fromId: node.id, toId: targetId });
      }
    }
  }

  // Map system name → node ID for CONSEQUENCE events
  const nameToId = new Map<string, string>(sharedNodes.map(n => [n.name, n.id]));

  const startMs = session.startedAt.getTime();
  const endMs   = session.endedAt?.getTime() ?? (session.events.at(-1)?.createdAt.getTime() ?? startMs);
  const totalMs = Math.max(0, endMs - startMs);

  // Attack events from CONSEQUENCE sim events
  const attackEvents: AttackEvent[] = session.events
    .filter(e => e.type === "CONSEQUENCE")
    .map(e => {
      const p = e.payload as { system?: string; status?: string; reason?: string };
      const sysName = p.system ?? "";
      const nodeId  = nameToId.get(sysName) ?? null;
      return {
        nodeId,
        label:      `${sysName || "Unknown"}: ${p.reason ?? p.status ?? ""}`,
        status:     (p.status === "OFFLINE" ? "OFFLINE" : "DEGRADED") as AttackEvent["status"],
        relativeMs: e.createdAt.getTime() - startMs,
      };
    });

  // Stage markers from debrief
  const outcome = (session.status === "CONTAINED" ? "CONTAINED" : "BREACHED") as "CONTAINED" | "BREACHED";
  const worldState = buildWorldState(session.events);
  const graphElapsed = session.endedAt
    ? Math.floor((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)
    : undefined;
  const finalScore = computeFinalScore(session.template.slug, worldState, graphElapsed);
  const timedEvents = session.events.map(e => ({
    id: e.id, type: e.type, actor: e.actor,
    payload: e.payload, narrative: e.narrative,
    createdAt: e.createdAt.toISOString(),
  }));
  const debrief = buildDebrief(session.template.slug, timedEvents, outcome, finalScore);
  const stages: StageMarker[] = debrief.timeline.map(t => ({
    label:      t.label,
    relativeMs: new Date(t.enteredAt).getTime() - startMs,
    wasBlocked: t.wasBlocked,
  }));

  function fmtDuration(ms: number) {
    const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={`/simulation/${sessionId}/debrief`}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-2 inline-block">
              ← Back to debrief
            </Link>
            <h1 className="text-2xl font-bold">Attack Graph</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{session.template.name} · {company.name}</p>
          </div>
          <div className="text-right text-sm space-y-1">
            <p className={`font-bold ${outcome === "CONTAINED" ? "text-emerald-400" : "text-red-400"}`}>
              {outcome}
            </p>
            <p className="text-xs text-zinc-500">
              {fmtDuration(totalMs)} · {sharedNodes.length} systems · score {finalScore}
            </p>
            <Link href={`/simulation/${sessionId}/replay`}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition inline-block">
              ▶ Timeline Replay
            </Link>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" /> Online
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" /> Degraded
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 inline-block" /> Offline
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="h-px w-6 border-t border-dashed border-zinc-600 inline-block" /> Normal edge
          </div>
          <div className="flex items-center gap-2">
            <span className="h-px w-6 border-t-2 border-red-500 inline-block" /> Attack path
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="border border-red-500/50 rounded px-1.5 py-0.5 text-[10px] text-red-400">CRITICAL</span>
            <span className="border border-orange-500/50 rounded px-1.5 py-0.5 text-[10px] text-orange-400">HIGH</span>
            <span className="border border-amber-500/50 rounded px-1.5 py-0.5 text-[10px] text-amber-400">MEDIUM</span>
            <span className="border border-zinc-600/50 rounded px-1.5 py-0.5 text-[10px] text-zinc-500">LOW</span>
          </div>
        </div>

        <AttackGraph
          nodes={graphNodes}
          edges={graphEdges}
          events={attackEvents}
          stages={stages}
          totalMs={totalMs}
          outcome={outcome}
          score={finalScore}
        />
      </main>
    </div>
  );
}
