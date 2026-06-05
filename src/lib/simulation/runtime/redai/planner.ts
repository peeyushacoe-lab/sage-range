import type { AdversaryState, AdversaryPlan, AdversaryActionType } from "./types";
import type { AdversaryMemory } from "./memory";
import type { WorldState, EmployeeState } from "../../types";
import { getPrimaryAction, getFallbackAction, actionAdvancesObjective } from "./objectives";
import type { AssetGraph } from "./asset-graph";
import { getBestPhishTarget, getReachableFromCompromised } from "./asset-graph";
import { getPersona, getPersonaNarrativeTone } from "./personas";

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3";

async function chat(system: string, user: string): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: false,
        options: { temperature: 0.8 },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { message?: { content?: string } };
    return data?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

function selectTarget(
  employeeStates: EmployeeState[],
  action: AdversaryActionType,
  worldState: WorldState,
  assetGraph?: AssetGraph
): string {
  if (employeeStates.length === 0) return "target";

  if (action === "PHISH_EMPLOYEE") {
    // Use graph to find employee with high-value system access
    if (assetGraph) {
      const best = getBestPhishTarget(assetGraph, employeeStates, worldState.compromisedEmployees);
      if (best) {
        const valueNote = best.highValueSystems.length > 0
          ? ` (access to ${best.highValueSystems[0].name})`
          : "";
        return `${best.name}${valueNote}`;
      }
    }
    const ranked = [...employeeStates].sort(
      (a, b) => (b.stressLevel - b.securityAwareness) - (a.stressLevel - a.securityAwareness)
    );
    return ranked[0]?.name ?? "target employee";
  }

  if (action === "STEAL_CREDENTIALS") {
    const ranked = [...employeeStates].sort((a, b) => b.insiderRisk - a.insiderRisk);
    return ranked[0]?.name ?? "privileged account";
  }

  if (action === "MOVE_LATERALLY" && assetGraph) {
    const reachable = getReachableFromCompromised(
      assetGraph,
      worldState.compromisedEmployees,
      worldState.compromisedSystems
    );
    if (reachable.length > 0) {
      const top = [...reachable].sort((a, b) => {
        const order = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 } as const;
        return order[b.criticality] - order[a.criticality];
      })[0];
      return top.name;
    }
  }

  const infraTargets: Partial<Record<AdversaryActionType, string>> = {
    EXPLOIT_SERVER:    "internet-facing server",
    MOVE_LATERALLY:    "internal network segment",
    EXFILTRATE_DATA:   worldState.compromisedSystems[0] ?? "file server",
    DEPLOY_RANSOMWARE: "domain controller",
  };
  return infraTargets[action] ?? "target system";
}

function fallbackReason(
  action: AdversaryActionType,
  target: string,
  memory: AdversaryMemory
): string {
  const pivotNote =
    memory.failedActions.length > 0
      ? ` After ${memory.failedActions.length} blocked vector${memory.failedActions.length > 1 ? "s" : ""}, pivoting approach.`
      : "";

  const lines: Record<AdversaryActionType, string> = {
    PHISH_EMPLOYEE:    `Launching targeted spearphish against ${target} — stress profile indicates low vigilance.${pivotNote}`,
    STEAL_CREDENTIALS: `Dumping credentials from ${target} — prior foothold enables memory scraping.${pivotNote}`,
    EXPLOIT_SERVER:    `Exploiting known vulnerability on ${target} — reconnaissance confirms unpatched exposure.${pivotNote}`,
    MOVE_LATERALLY:    `Traversing ${target} using harvested credentials — expanding internal footprint.${pivotNote}`,
    EXFILTRATE_DATA:   `Staging data from ${target} for exfiltration — egress path verified.${pivotNote}`,
    DEPLOY_RANSOMWARE: `Detonating ransomware payload via ${target} — all objectives met, triggering impact.${pivotNote}`,
  };
  return lines[action];
}

// Persona-aware action selection — prefers actions from persona.preferredActions that match
// the current objective, falling back to global primary/fallback logic.
function selectAction(
  adversaryState: AdversaryState,
  memory: AdversaryMemory
): AdversaryActionType {
  const persona = adversaryState.personaId ? getPersona(adversaryState.personaId) : null;

  if (persona) {
    // Try preferred action that advances the current objective and hasn't been blocked
    const preferred = persona.preferredActions.find(
      (a) =>
        actionAdvancesObjective(a, adversaryState.currentObjective) &&
        !memory.failedActions.includes(a)
    );
    if (preferred) return preferred;

    // Try any preferred action that hasn't been blocked (pivot within persona style)
    const anyPreferred = persona.preferredActions.find(
      (a) => !memory.failedActions.includes(a)
    );
    if (anyPreferred) return anyPreferred;
  }

  const primary = getPrimaryAction(adversaryState.currentObjective);
  if (memory.failedActions.includes(primary)) {
    return getFallbackAction(adversaryState.currentObjective, memory);
  }
  return primary;
}

export async function planNextMove(
  worldState: WorldState,
  employeeStates: EmployeeState[],
  adversaryState: AdversaryState,
  memory: AdversaryMemory,
  assetGraph?: AssetGraph
): Promise<AdversaryPlan> {
  const action = selectAction(adversaryState, memory);
  const target = selectTarget(employeeStates, action, worldState, assetGraph);

  const blocked = worldState.blockedVectors.join(", ") || "nothing";
  const recentDefense = memory.defenderResponses.slice(-3).join("; ") || "none observed";
  const personaTone = getPersonaNarrativeTone(adversaryState.personaId);

  const system = `${personaTone}
Write exactly one sentence (max 20 words). Be specific: name the technique, name the target.
Use technical attacker language. No disclaimers or hedging.`;

  const prompt = `Objective: ${adversaryState.currentObjective}. Action: ${action} against ${target}.
Defender has blocked: ${blocked}. Recent defender moves: ${recentDefense}.
Stealth: ${worldState.stealthLevel}/100. Confidence: ${adversaryState.confidence}/100.
Write the adversary's tactical reasoning in one sentence.`;

  const aiReason = await chat(system, prompt);
  const reason = aiReason ?? fallbackReason(action, target, memory);

  return { action, target, reason };
}
