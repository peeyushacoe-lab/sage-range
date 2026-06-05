import type { CompanyProfile, EmployeeProfile, EmployeeState } from "../../types";

export type AssetType = "ENDPOINT" | "SERVER" | "DATABASE" | "CLOUD_SERVICE" | "DATA_STORE" | "NETWORK_DEVICE";
export type CriticalityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AccessLevel = "USER" | "POWER_USER" | "ADMIN" | "DOMAIN_ADMIN";

export interface DataAsset {
  id: string;
  name: string;
  classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
  recordCount: number;
  criticality: CriticalityLevel;
}

export interface AssetNode {
  id: string;
  name: string;
  type: AssetType;
  department: string;
  criticality: CriticalityLevel;
  connectedTo: string[];       // IDs of directly reachable systems
  ownerEmployee?: string;      // set for ENDPOINT nodes
  dataAssets: DataAsset[];
}

export interface Credential {
  employeeName: string;
  department: string;
  accessLevel: AccessLevel;
  grantedSystemIds: string[];
}

export interface AssetGraph {
  nodes: AssetNode[];
  credentials: Credential[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toEndpointId(name: string): string {
  return `ep-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function toSystemId(idx: number): string {
  return `sys-${idx}`;
}

function inferAssetType(name: string): AssetType {
  const n = name.toLowerCase();
  if (/domain.controller|active.directory|\bad\b|ldap/.test(n)) return "SERVER";
  if (/exchange|mail.server|smtp|imap/.test(n)) return "SERVER";
  if (/database|sql|mysql|postgres|oracle|mongo/.test(n)) return "DATABASE";
  if (/sharepoint|confluence|onedrive|google.drive|dropbox/.test(n)) return "CLOUD_SERVICE";
  if (/s3|blob.storage|gcs|backup/.test(n)) return "DATA_STORE";
  if (/vpn|firewall|gateway|router|switch|proxy/.test(n)) return "NETWORK_DEVICE";
  return "SERVER";
}

function inferCriticality(name: string, type: AssetType): CriticalityLevel {
  const n = name.toLowerCase();
  if (/domain.controller|active.directory/.test(n)) return "CRITICAL";
  if (/payroll|finance.database|core.banking|erp/.test(n)) return "CRITICAL";
  if (type === "DATABASE") return "HIGH";
  if (/exchange|email.server/.test(n)) return "HIGH";
  if (type === "NETWORK_DEVICE") return "HIGH";
  if (type === "CLOUD_SERVICE") return "MEDIUM";
  return "MEDIUM";
}

function buildDataAssetsForSystem(sysName: string, sysId: string): DataAsset[] {
  const n = sysName.toLowerCase();
  if (/payroll|hr.system|personnel/.test(n)) {
    return [{ id: `${sysId}-pii`, name: "Employee PII", classification: "RESTRICTED", recordCount: 800, criticality: "CRITICAL" }];
  }
  if (/finance|banking|accounting|erp/.test(n)) {
    return [{ id: `${sysId}-fin`, name: "Financial Records", classification: "CONFIDENTIAL", recordCount: 12000, criticality: "HIGH" }];
  }
  if (/customer|crm|salesforce/.test(n)) {
    return [{ id: `${sysId}-crm`, name: "Customer Records", classification: "CONFIDENTIAL", recordCount: 50000, criticality: "HIGH" }];
  }
  if (/sharepoint|confluence|onedrive/.test(n)) {
    return [{ id: `${sysId}-doc`, name: "Internal Documents", classification: "INTERNAL", recordCount: 5000, criticality: "MEDIUM" }];
  }
  if (/source|git|dev|code/.test(n)) {
    return [{ id: `${sysId}-src`, name: "Source Code", classification: "CONFIDENTIAL", recordCount: 0, criticality: "HIGH" }];
  }
  return [];
}

function isSystemReachableFromDept(dept: string, sysName: string, sysType: AssetType): boolean {
  if (sysType === "NETWORK_DEVICE") return false;
  const n = sysName.toLowerCase();
  const d = dept.toLowerCase();
  // Universal access
  if (/email|exchange|mail/i.test(n)) return true;
  if (/sharepoint|confluence|onedrive/i.test(n)) return true;
  if (/vpn/i.test(n)) return true;
  // IT / Security reach everything
  if (/^it$|information.tech|security/.test(d)) return true;
  // Finance reaches finance systems
  if (d.includes("finance") && /finance|payroll|erp|accounting/i.test(n)) return true;
  // HR reaches HR systems
  if (d.includes("hr") && /hr|payroll|employee/i.test(n)) return true;
  return false;
}

function inferAccessLevel(emp: EmployeeProfile): AccessLevel {
  const d = emp.department.toLowerCase();
  const t = emp.title.toLowerCase();
  if (/^it$|information.tech/.test(d) && /admin|director|manager/i.test(t)) return "DOMAIN_ADMIN";
  if (/^it$|information.tech/.test(d)) return "ADMIN";
  if (/security/.test(d) && /analyst|engineer|architect/i.test(t)) return "ADMIN";
  if (/manager|director|chief|head|lead/i.test(t)) return "POWER_USER";
  return "USER";
}

// ── Builder ───────────────────────────────────────────────────────────────────

export function buildAssetGraph(company: CompanyProfile): AssetGraph {
  const nodes: AssetNode[] = [];
  const credentials: Credential[] = [];

  // 1. Endpoint for each employee
  for (const emp of company.employees) {
    const crit: CriticalityLevel =
      emp.riskLevel === "HIGH" ? "HIGH" : emp.riskLevel === "MEDIUM" ? "MEDIUM" : "LOW";
    nodes.push({
      id: toEndpointId(emp.name),
      name: `${emp.name}'s Workstation`,
      type: "ENDPOINT",
      department: emp.department,
      criticality: crit,
      connectedTo: [],
      ownerEmployee: emp.name,
      dataAssets: [],
    });
  }

  // 2. Shared infrastructure from company.systems
  const sharedNodes: AssetNode[] = company.systems.map((name, idx) => {
    const id = toSystemId(idx);
    const type = inferAssetType(name);
    const criticality = inferCriticality(name, type);
    return {
      id,
      name,
      type,
      department: "ALL",
      criticality,
      connectedTo: [],
      dataAssets: buildDataAssetsForSystem(name, id),
    };
  });
  nodes.push(...sharedNodes);

  // 3. Connect endpoints → reachable shared systems
  for (const node of nodes.filter((n) => n.type === "ENDPOINT")) {
    node.connectedTo = sharedNodes
      .filter((s) => isSystemReachableFromDept(node.department, s.name, s.type))
      .map((s) => s.id);
  }

  // 4. Connect servers/cloud → downstream databases and data stores
  for (const node of sharedNodes) {
    if (node.type === "SERVER" || node.type === "CLOUD_SERVICE") {
      const downstream = sharedNodes
        .filter((s) => s.id !== node.id && (s.type === "DATABASE" || s.type === "DATA_STORE"))
        .map((s) => s.id);
      node.connectedTo = [...new Set([...node.connectedTo, ...downstream])];
    }
  }

  // 5. Credential for each employee
  for (const emp of company.employees) {
    const endpointId = toEndpointId(emp.name);
    const level = inferAccessLevel(emp);
    const grantedSystemIds = [
      endpointId,
      ...sharedNodes
        .filter((s) => {
          if (level === "DOMAIN_ADMIN") return true;
          if (level === "ADMIN") return true;
          return isSystemReachableFromDept(emp.department, s.name, s.type);
        })
        .map((s) => s.id),
    ];
    credentials.push({
      employeeName: emp.name,
      department: emp.department,
      accessLevel: level,
      grantedSystemIds,
    });
  }

  return { nodes, credentials };
}

// ── Queries ───────────────────────────────────────────────────────────────────

// Systems the adversary can reach from currently compromised employee accounts
export function getReachableFromCompromised(
  graph: AssetGraph,
  compromisedEmployees: string[],
  alreadyCompromisedNames: string[]
): AssetNode[] {
  const reachableIds = new Set<string>();
  const alreadySet = new Set(alreadyCompromisedNames);

  for (const empName of compromisedEmployees) {
    const cred = graph.credentials.find((c) => c.employeeName === empName);
    if (!cred) continue;
    for (const sysId of cred.grantedSystemIds) {
      const node = graph.nodes.find((n) => n.id === sysId);
      if (!node || node.type === "ENDPOINT") continue;
      reachableIds.add(sysId);
      // One hop further through connected systems
      for (const connId of node.connectedTo) {
        reachableIds.add(connId);
      }
    }
  }

  return graph.nodes.filter(
    (n) => reachableIds.has(n.id) && !alreadySet.has(n.name) && n.type !== "ENDPOINT"
  );
}

// Returns the total data asset exposure from all compromised systems
export function calculateDataExposure(
  graph: AssetGraph,
  compromisedSystemNames: string[]
): { totalRecords: number; highestClassification: DataAsset["classification"] } {
  const compromisedSet = new Set(compromisedSystemNames);
  const exposedAssets = graph.nodes
    .filter((n) => compromisedSet.has(n.name))
    .flatMap((n) => n.dataAssets);

  const total = exposedAssets.reduce((sum, a) => sum + a.recordCount, 0);
  const classOrder = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"] as const;
  const highest = exposedAssets.reduce<DataAsset["classification"]>(
    (max, a) => classOrder.indexOf(a.classification) > classOrder.indexOf(max) ? a.classification : max,
    "PUBLIC"
  );

  return { totalRecords: total, highestClassification: highest };
}

// Most vulnerable uncompromised employee + the systems their creds grant
export function getBestPhishTarget(
  graph: AssetGraph,
  employeeStates: EmployeeState[],
  alreadyCompromised: string[]
): { name: string; accessLevel: AccessLevel; highValueSystems: AssetNode[] } | null {
  const compromisedSet = new Set(alreadyCompromised);
  const candidates = employeeStates.filter((e) => !compromisedSet.has(e.name));
  if (candidates.length === 0) return null;

  const ranked = [...candidates].sort(
    (a, b) => (b.stressLevel - b.securityAwareness) - (a.stressLevel - a.securityAwareness)
  );
  const target = ranked[0];
  const cred = graph.credentials.find((c) => c.employeeName === target.name);
  const highValueSystems = cred
    ? graph.nodes.filter(
        (n) => cred.grantedSystemIds.includes(n.id) &&
               n.type !== "ENDPOINT" &&
               (n.criticality === "HIGH" || n.criticality === "CRITICAL")
      )
    : [];

  return { name: target.name, accessLevel: cred?.accessLevel ?? "USER", highValueSystems };
}
