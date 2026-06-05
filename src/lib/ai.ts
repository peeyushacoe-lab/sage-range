const OLLAMA_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "gemma3";

export type EvaluationResult = {
  accuracyScore: number;
  clarityScore: number;
  completenessScore: number;
  recommendation: "Strong hire" | "Potential hire" | "Not recommended";
  feedback: string;
};

export async function evaluateIncidentSummary(
  summary: string
): Promise<EvaluationResult | null> {
  const systemPrompt = `You are a senior SOC analyst evaluating a junior analyst's incident report.
Score each dimension 1-10. Be concise but constructive in your feedback.
Respond with valid JSON only — no markdown fences, no explanation outside the JSON.`;

  const userPrompt = `Incident summary to evaluate:
---
${summary}
---

The scenario: A finance employee clicked a malicious Excel attachment. The attacker (198.51.100.42)
brute-forced the VPN, then used PowerShell with a base64-encoded payload to establish a reverse shell
on port 4444. Persistence was achieved via HKCU Run registry key. DNS beaconing to ms-update[.]net
was observed every 5 minutes.

Return JSON with exactly these fields:
{
  "accuracyScore": <1-10, did they identify the key facts correctly>,
  "clarityScore": <1-10, is the report clear and professional>,
  "completenessScore": <1-10, did they cover patient zero, IOCs, persistence, and timeline>,
  "recommendation": <"Strong hire" | "Potential hire" | "Not recommended">,
  "feedback": <2-3 sentences of constructive feedback>
}`;

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
        format: "json",
        stream: false,
        options: { temperature: 0.3 },
      }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { message?: { content?: string } };
    const raw = data?.message?.content;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as EvaluationResult;
    const valid =
      typeof parsed.accuracyScore === "number" &&
      typeof parsed.clarityScore === "number" &&
      typeof parsed.completenessScore === "number" &&
      typeof parsed.recommendation === "string" &&
      typeof parsed.feedback === "string";

    return valid ? parsed : null;
  } catch {
    return null;
  }
}
