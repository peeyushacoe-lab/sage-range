// Interactive Network Map — shared types + pure resolver logic.
//
// Simulations author a fixed topology (`networkNodes`) plus a list of status
// -change events keyed to task order (`networkEvents`). As a student
// completes tasks in order, the map re-renders showing which hosts have
// gone from clean → suspicious → compromised → contained, mirroring how a
// real investigation's picture of the network sharpens over time.
//
// Both fields are stored as plain JSON on IncidentSimulation (see schema.prisma)
// since they're small, simulation-authored, and never queried independently.

export type NetworkNodeKind =
  | "workstation"
  | "server"
  | "domain-controller"
  | "firewall"
  | "vpn"
  | "email-gateway"
  | "internet";

export type NetworkNodeStatus = "clean" | "suspicious" | "compromised" | "contained";

export type NetworkNode = {
  id: string;
  label: string;
  kind: NetworkNodeKind;
  // Position as percentages (0-100) within the map canvas.
  x: number;
  y: number;
};

export type NetworkEvent = {
  // The task `order` value that, once completed, triggers this status change.
  triggerOrder: number;
  nodeId: string;
  status: NetworkNodeStatus;
  note?: string;
};

export type ResolvedNode = NetworkNode & { status: NetworkNodeStatus; note?: string };

const STATUS_RANK: Record<NetworkNodeStatus, number> = {
  clean: 0,
  suspicious: 1,
  compromised: 2,
  contained: 3,
};

/**
 * Given the authored topology/events and the highest task `order` the
 * student has completed, resolve each node's current status. For each node,
 * applies every event whose triggerOrder has been reached, keeping the
 * status from the highest-triggerOrder event seen (later events override
 * earlier ones — e.g. "contained" replaces "compromised").
 */
export function resolveNetworkState(
  nodes: NetworkNode[],
  events: NetworkEvent[],
  maxCompletedOrder: number
): ResolvedNode[] {
  const byNode = new Map<string, { order: number; status: NetworkNodeStatus; note?: string }>();

  for (const ev of events) {
    if (ev.triggerOrder > maxCompletedOrder) continue;
    const current = byNode.get(ev.nodeId);
    if (!current || ev.triggerOrder >= current.order) {
      byNode.set(ev.nodeId, { order: ev.triggerOrder, status: ev.status, note: ev.note });
    }
  }

  return nodes.map((n) => {
    const resolved = byNode.get(n.id);
    return { ...n, status: resolved?.status ?? "clean", note: resolved?.note };
  });
}

export function statusRank(status: NetworkNodeStatus): number {
  return STATUS_RANK[status];
}
