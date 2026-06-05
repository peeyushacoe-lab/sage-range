const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3";

async function ollamaChat(systemPrompt: string, userPrompt: string, temperature: number): Promise<string | null> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        options: { temperature },
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { message?: { content?: string } };
      return data?.message?.content?.trim() ?? null;
    }
  } catch { /* intentional */ }
  return null;
}

export async function generateIRReport(params: {
  companyName: string;
  industry: string;
  scenarioName: string;
  durationMin: number | null;
  outcome: string;
  score: number;
  techScore: number;
  opScore: number;
  techniques: string;
}): Promise<string> {
  const { companyName, industry, scenarioName, durationMin, outcome, score, techScore, opScore, techniques } = params;
  const prompt = `Write a concise post-incident report: Company: ${companyName}, Industry: ${industry}, Scenario: ${scenarioName}, Duration: ${durationMin ?? "unknown"}min, Outcome: ${outcome}, Score: ${score}/100, Technical: ${techScore}/100, Operational: ${opScore}/100. MITRE: ${techniques || "none"}. Sections: 1) Executive Summary (2 sentences), 2) Timeline (3-4 bullets), 3) Root Cause (1 sentence), 4) Containment Actions (2-3 bullets), 5) Recommendations (3 bullets). Under 300 words.`;
  const result = await ollamaChat("You are a professional incident response report writer. Write clear, concise, and factual reports.", prompt, 0.4);
  if (result && result.length > 50) return result;

  const contained = outcome === "CONTAINED";
  return `## Executive Summary

${contained ? `The simulated ${scenarioName} incident at ${companyName} was successfully contained through timely analyst intervention.` : `The simulated ${scenarioName} incident at ${companyName} resulted in a breach due to delayed or insufficient response actions.`} The analyst achieved an overall score of ${score}/100 with technical performance of ${techScore}/100 and operational performance of ${opScore}/100.

## Timeline

- Incident began as a ${scenarioName.toLowerCase()} scenario in the ${industry} sector
- Analyst engaged with the incident across multiple escalating threat stages
- ${contained ? "Containment actions were executed successfully, halting attacker progression" : "Attacker progressed through all stages without effective containment"}
- Simulation concluded after ${durationMin ?? "unknown"} minutes with outcome: ${outcome}

## Root Cause

The root cause was a ${scenarioName.toLowerCase()} attack vector that exploited gaps in the organisation's detection and response capabilities.

## Containment Actions

- Analyst deployed available containment and investigative actions during the simulation
- ${contained ? "A stage-blocking action successfully halted attacker lateral progression" : "No stage-blocking actions were executed in time to prevent breach"}
- Evidence preservation and stakeholder notifications were managed during the response

## Recommendations

- Invest in faster initial triage capabilities to reduce detection-to-action time
- Develop playbooks specific to ${industry} threat scenarios to accelerate decision-making
- Conduct regular tabletop exercises targeting the MITRE techniques observed in this simulation${techniques ? `: ${techniques}` : ""}`;
}

export async function generateGapAnalysis(params: {
  techScore: number;
  opScore: number;
  score: number;
  status: string;
  scenarioName: string;
  industry: string;
  techniques: string;
}): Promise<string> {
  const { techScore, opScore, score, status, scenarioName, industry, techniques } = params;
  const prompt = `Based on this simulation performance, identify skill gaps and recommend training. Scores: Technical=${techScore}/100, Operational=${opScore}/100, Overall=${score}/100. Outcome: ${status}. Scenario: ${scenarioName} (${industry}). MITRE techniques: ${techniques || "none"}.\n\nRespond with exactly this format:\nWEAKEST AREA: [one area]\nGAP SUMMARY: [one sentence]\nRECOMMENDED LABS: [2-3 specific lab types]\nRECOMMENDED PATHS: [1 path type]\nNEXT SIMULATION: [specific scenario type]`;
  const result = await ollamaChat("You are a professional cybersecurity training advisor. Respond only in the exact format requested.", prompt, 0.3);
  if (result && result.includes("WEAKEST AREA:")) return result;

  if (techScore < opScore) {
    return `WEAKEST AREA: Technical Skills\nGAP SUMMARY: Technical detection and forensic skills need strengthening to match your operational response capability.\nRECOMMENDED LABS: CTF challenges, network forensics labs, malware analysis exercises\nRECOMMENDED PATHS: Technical Analysis Path\nNEXT SIMULATION: Try a CTF-focused or forensics-heavy scenario`;
  }
  if (opScore < techScore) {
    return `WEAKEST AREA: Operational Response\nGAP SUMMARY: Operational decision-making and incident coordination need improvement relative to your technical skills.\nRECOMMENDED LABS: SOC investigation labs, incident response tabletop exercises, stakeholder communication labs\nRECOMMENDED PATHS: Incident Response Path\nNEXT SIMULATION: Try a multi-stakeholder crisis management scenario`;
  }
  return `WEAKEST AREA: Advanced Threat Scenarios\nGAP SUMMARY: Strong overall performance — focus on higher-complexity threats to reach the next level.\nRECOMMENDED LABS: Advanced red-team labs, threat hunting exercises, purple-team scenarios\nRECOMMENDED PATHS: Advanced Threat Operations Path\nNEXT SIMULATION: Try a Hard-difficulty or INSANE-difficulty simulation`;
}

export function parseGapAnalysis(raw: string) {
  const get = (key: string) => {
    const match = raw.match(new RegExp(`${key}:\\s*(.+)`));
    return match?.[1]?.trim() ?? "";
  };
  return {
    weakestArea: get("WEAKEST AREA"),
    gapSummary: get("GAP SUMMARY"),
    recommendedLabs: get("RECOMMENDED LABS"),
    recommendedPaths: get("RECOMMENDED PATHS"),
    nextSimulation: get("NEXT SIMULATION"),
  };
}
